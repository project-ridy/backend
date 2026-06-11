# Rules — Ridy Backend

이 파일은 백엔드 레포의 코딩 규칙과 프레임워크 컨벤션을 정의합니다.

---

## TypeScript

### 타입 시스템
- **`any` 사용 금지** — 모든 값은 명시적 타입
- **DTO로 요청/응답 타입 정의** — 컨트롤러 파라미터에 인라인 타입 금지
- **`enum` 대신 `as const` 객체** — Prisma enum은 예외
- **`null` 대신 `undefined`** — TypeScript 관례 준수
- **유니온 타입 적극 활용** — 상태, 역할 등 제한된 값 집합

```typescript
// ✅ Good
export const RIDE_STATUS = {
  OPEN: 'OPEN',
  MATCHED: 'MATCHED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type RideStatus = (typeof RIDE_STATUS)[keyof typeof RIDE_STATUS];

// ✅ Good — Prisma enum은 예외
enum Role {
  DRIVER = 'DRIVER',
  RIDER = 'RIDER',
}

// ❌ Bad
const data: any = await prisma.ride.findMany();
function login(body: any) { ... }
```

### 제네릭 패턴
- **API 응답 래퍼** — 제네릭으로 타입 안전한 응답

```typescript
// ✅ Good
interface ApiResponse<T> {
  success: true;
  data: T;
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

---

## NestJS

### 모듈 구조

각 기능 모듈은 다음 구조를 따른다:

```
src/modules/<module-name>/
├── <module-name>.module.ts
├── <module-name>.controller.ts
├── <module-name>.service.ts
├── <module-name>.controller.spec.ts
├── <module-name>.service.spec.ts
├── dto/
│   ├── create-<module-name>.dto.ts
│   ├── update-<module-name>.dto.ts
│   └── <module-name>-response.dto.ts
├── guards/          # 모듈 전용 가드 (필요 시)
├── strategies/      # Passport 전략 (필요 시)
└── helpers/         # 모듈 내 유틸리티 (필요 시)
```

### 모듈 정의

```typescript
@Module({
  imports: [
    // 외부 모듈 — PrismaModule 등
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService], // 다른 모듈에서 사용 시
})
export class AuthModule {}
```

- **순환 의존 금지** — 모듈 간 순환 참조 시 구조 재설계
- **exports는 최소화** — 외부에 노출할 서비스만 export

### 컨트롤러

- **thin controller** — 비즈니스 로직은 서비스에 위임
- **DTO로 입력 검증** — `class-validator` 데코레이터
- **명시적 응답 타입** — `@ApiResponse()` 데코레이터
- **HTTP 상태 코드 명시** — `@HttpCode()` 사용

```typescript
@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '소셜 로그인' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: '유효하지 않은 토큰' })
  async login(@Body() loginDto: LoginRequestDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }
}
```

**금지사항:**
- 컨트롤러에 비즈니스 로직 작성
- DTO 없이 원시 타입 파라미터
- `@Res()` 직접 사용 (NestJS 추상화 우회)

### 서비스

- **비즈니스 로직은 서비스에만** — 컨트롤러에 로직 금지
- **Prisma는 주입받아 사용** — `new PrismaClient()` 직접 생성 금지
- **트랜잭션은 `prisma.$transaction`** — 여러 테이블 변경 시
- **에러는 커스텀 예외** — `NotFoundException`, `ForbiddenException` 등

```typescript
@Injectable()
export class MatchingService {
  constructor(private prisma: PrismaService) {}

  async searchRides(params: SearchRidesDto): Promise<PaginatedResponse<Ride>> {
    const where = {
      status: RIDE_STATUS.OPEN,
      departureTime: { gte: params.departureTime },
      availableSeats: { gte: params.seats },
    };

    const [rides, total] = await Promise.all([
      this.prisma.ride.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: { driver: true },
      }),
      this.prisma.ride.count({ where }),
    ]);

    return { success: true, data: rides, pagination: { ...params, total } };
  }

  async requestRide(riderId: string, rideId: string): Promise<RideRequest> {
    return this.prisma.$transaction(async (tx) => {
      const ride = await tx.ride.findUnique({ where: { id: rideId } });
      if (!ride) throw new NotFoundException('카풀을 찾을 수 없습니다');
      if (ride.availableSeats <= 0) throw new BadRequestException('만석입니다');

      const request = await tx.rideRequest.create({
        data: { riderId, rideId, status: 'PENDING' },
      });

      await tx.ride.update({
        where: { id: rideId },
        data: { availableSeats: { decrement: 1 } },
      });

      return request;
    });
  }
}
```

### DTO

- **class-validator + class-transformer** 로 검증
- **명시적 필드** — `PartialType` 대신 업데이트 DTO도 필드 명시
- **Swagger 데코레이터** — `@ApiProperty()` 로 API 문서화
- **변환 데코레이터** — `@Type()` 으로 타입 변환

```typescript
export class LoginRequestDto {
  @ApiProperty({ enum: ['kakao', 'google', 'apple'], description: '소셜 로그인 제공자' })
  @IsEnum(['kakao', 'google', 'apple'])
  provider: 'kakao' | 'google' | 'apple';

  @ApiProperty({ description: '소셜 액세스 토큰' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  user: UserResponseDto;
}
```

### 가드 & 미들웨어

```typescript
// 인증 가드
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: any, user: TUser): TUser {
    if (err || !user) throw new UnauthorizedException('인증이 필요합니다');
    return user;
  }
}

// 역할 가드
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<Role[]>('roles', context.getHandler());
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

### 예외 필터

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.message
      : '서버 오류가 발생했습니다';

    response.status(status).json({
      success: false,
      error: { code: status, message },
    });
  }
}
```

---

## Prisma

### 스키마 규칙

```prisma
model User {
  // 기본 키 — uuid 사용
  id        String   @id @default(uuid())

  // 필드 — camelCase
  email     String   @unique
  name      String
  phone     String?
  avatarUrl String?  @map("avatar_url")

  // 타임스탬프 — @map으로 snake_case
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // 관계
  rides      Ride[]
  requests   RideRequest[]

  // 테이블 매핑 — 복수형
  @@map("users")
}
```

### 네이밍 규칙
| 대상 | 규칙 | 예시 |
|---|---|---|
| 모델명 | PascalCase 단수형 | `User`, `Ride`, `RideRequest` |
| 필드명 | camelCase | `departureTime`, `availableSeats` |
| DB 컬럼명 | snake_case (`@map`) | `departure_time`, `available_seats` |
| 테이블명 | 복수형 (`@@map`) | `users`, `rides`, `ride_requests` |
| enum명 | PascalCase | `RideStatus`, `Role` |
| enum값 | UPPER_SNAKE | `IN_PROGRESS`, `OPEN` |

### 마이그레이션
```bash
# 개발 마이그레이션
npx prisma migrate dev --name add_ride_table

# 프로덕션 마이그레이션
npx prisma migrate deploy

# 스키마 리셋 (개발만)
npx prisma migrate reset
```

- **마이그레이션 이름은 소문자 + 언더스코어** — `add_ride_table`
- **프로덕션에서 `migrate reset` 금지**
- **시드 데이터**: `prisma/seed.ts`에 관리

### PrismaService

```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### 쿼리 패턴

```typescript
// ✅ Good — include로 관계 로드, select로 필드 제한
const ride = await this.prisma.ride.findUnique({
  where: { id: rideId },
  include: {
    driver: { select: { id: true, name: true, avatarUrl: true, rating: true } },
    requests: { where: { status: 'ACCEPTED' } },
  },
});

// ✅ Good — 트랜잭션
await this.prisma.$transaction([
  this.prisma.rideRequest.create({ data: { ... } }),
  this.prisma.ride.update({ where: { id: rideId }, data: { availableSeats: { decrement: 1 } } }),
]);

// ❌ Bad — N+1
for (const ride of rides) {
  ride.driver = await this.prisma.user.findUnique({ where: { id: ride.driverId } });
}
```

---

## WebSocket (Socket.IO)

### 게이트웨이 구조

```typescript
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ChatGateway');

  async handleConnection(client: Socket) {
    const user = await this.validateUser(client);
    if (!user) { client.disconnect(); return; }
    client.data.user = user;
    this.logger.log(`사용자 연결: ${user.name}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`사용자 연결 해제: ${client.data.user?.name}`);
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { matchingId: string }) {
    await client.join(`matching:${data.matchingId}`);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchingId: string; content: string },
  ) {
    const message = await this.chatService.createMessage({
      senderId: client.data.user.id,
      matchingId: data.matchingId,
      content: data.content,
    });

    this.server.to(`matching:${data.matchingId}`).emit('new_message', message);
  }
}
```

---

## 테스트

### Jest 유닛 테스트

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get(AuthService);
    prisma = module.get(PrismaService);
  });

  it('유효한 카카오 토큰으로 로그인에 성공한다', async () => {
    prisma.user.findUnique = vi.fn().mockResolvedValue(mockUser);
    const result = await service.login({ provider: 'kakao', accessToken: 'valid' });
    expect(result.accessToken).toBeDefined();
    expect(result.user.email).toBe(mockUser.email);
  });

  it('존재하지 않는 사용자는 회원가입 처리한다', async () => {
    prisma.user.findUnique = vi.fn().mockResolvedValue(null);
    prisma.user.create = vi.fn().mockResolvedValue(mockUser);
    const result = await service.login({ provider: 'kakao', accessToken: 'valid' });
    expect(prisma.user.create).toHaveBeenCalled();
  });
});
```

### Supertest E2E 테스트

```typescript
describe('Auth API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('POST /auth/login — 200', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ provider: 'kakao', accessToken: 'valid' })
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.accessToken).toBeDefined();
      });
  });

  it('POST /auth/login — 401 (유효하지 않은 토큰)', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ provider: 'kakao', accessToken: 'invalid' })
      .expect(401);
  });
});
```

### 테스트 규칙
- **describe/it 한국어** — `it('유효한 토큰으로 로그인에 성공한다', ...)`
- **한 it당 하나의 검증** — 여러 assert는 허용하나 하나의 동작만
- **Prisma는 모킹** — 유닛 테스트에서 실제 DB 접근 금지
- **E2E는 테스트 DB** — 격리된 환경, `beforeEach`에서 초기화
- **테스트 파일 위치**: 유닛은 모듈 내 `.spec.ts`, E2E는 `test/` 디렉토리

---

## 파일 네이밍

| 대상 | 규칙 | 예시 |
|---|---|---|
| 모듈 디렉토리 | kebab-case | `auth/`, `matching/`, `ride-request/` |
| 모듈 파일 | `<이름>.module.ts` | `auth.module.ts` |
| 컨트롤러 | `<이름>.controller.ts` | `auth.controller.ts` |
| 서비스 | `<이름>.service.ts` | `auth.service.ts` |
| 가드 | `<이름>.guard.ts` | `jwt-auth.guard.ts` |
| 인터셉터 | `<이름>.interceptor.ts` | `logging.interceptor.ts` |
| 필터 | `<이름>.filter.ts` | `global-exception.filter.ts` |
| 데코레이터 | `<이름>.decorator.ts` | `current-user.decorator.ts` |
| 파이프 | `<이름>.pipe.ts` | `validation.pipe.ts` |
| DTO | `<액션>-<모듈>.dto.ts` | `login-request.dto.ts` |
| 전략 | `<이름>.strategy.ts` | `jwt.strategy.ts` |
| 테스트 | `<대상>.spec.ts` | `auth.service.spec.ts` |
| E2E 테스트 | `<모듈>.e2e-spec.ts` | `auth.e2e-spec.ts` |
| 설정 | `<이름>.ts` | `configuration.ts` |

---

## 커밋 컨벤션

```
<type>(<scope>): <subject>

<body>

Closes #<이슈번호>
```

| type | 설명 | 예시 |
|---|---|---|
| feat | 새로운 기능 | `feat(auth): 카카오 소셜 로그인 API` |
| fix | 버그 수정 | `fix(matching): 만석 체크 누락 수정` |
| test | 테스트 | `test(auth): 로그인 API 유닛 테스트` |
| refactor | 리팩토링 | `refactor(chat): 게이트웨이 로직 분리` |
| docs | 문서 | `docs(auth): Swagger 설명 추가` |
| chore | 빌드/설정 | `chore: ESLint 규칙 업데이트` |
| migrate | DB 마이그레이션 | `migrate: ride_requests 테이블 추가` |

### scope 목록
`auth`, `users`, `matching`, `chat`, `payment`, `review`, `common`, `prisma`, `config`
