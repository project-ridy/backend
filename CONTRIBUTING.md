# Ridy Backend — 기여 가이드

## 🤖 에이전트 의무 지침

> Developer 에이전트는 이 문서의 규칙을 **반드시** 따릅니다.

### 작업 흐름 (필수)

```
1. 이슈 생성 → 2. 브랜치 생성 → 3. TDD 사이클 → 4. PR 생성 → 5. 리뷰 후 머지
```

- **main 브랜치에 직접 커밋 금지** — 모든 변경은 PR로
- **이슈 없이 작업 금지** — 모든 작업은 이슈에서 시작
- **기능 작업 후 반드시 테스트 이슈 생성** — 기능 PR 머지 후 테스트 이슈를 만들어 후속 테스트 작업 보장

### TDD (필수)

모든 기능/버그 수정은 **Red → Green → Refactor** 사이클을 따른다:

1. **🔴 Red** — 실패하는 테스트를 먼저 작성한다
2. **🟢 Green** — 테스트를 통과하는 최소 구현을 작성한다
3. **🔵 Refactor** — 테스트가 여전히 통과하는 상태로 코드를 정리한다
4. **✅ Verify** — `npm run test` 전체 통과 확인 후 커밋

**절대 금지:**
- 구현 먼저 하고 테스트 나중에 작성하기
- Red 없이 Green 단계로 진입하기
- Red → Green → Refactor 완료 전 커밋하기

---

## 🛠 기술 스택

| 기술 | 버전 | 용도 |
|---|---|---|
| NestJS | 11.x | API 프레임워크 |
| TypeScript | 5.x | 타입 안전성 |
| Prisma | 6.x | ORM |
| PostgreSQL | 16.x | 메인 DB |
| Redis | 7.x | 캐시, 세션, Pub/Sub |
| Socket.IO | 4.x | WebSocket 채팅 |
| Bull | 4.x | 작업 큐 |
| Jest | 최신 | 유닛/통합 테스트 |
| Supertest | 최신 | HTTP 통합 테스트 |

---

## 📂 프로젝트 구조

```
backend/
├── src/
│   ├── modules/              # 기능 모듈
│   │   ├── auth/             # 인증/인가
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.spec.ts
│   │   │   ├── auth.service.spec.ts
│   │   │   ├── guards/       # 인증 가드
│   │   │   ├── strategies/   # Passport 전략
│   │   │   └── dto/          # 요청/응답 DTO
│   │   ├── users/            # 유저 관리
│   │   ├── matching/         # 카풀 매칭
│   │   ├── chat/             # 실시간 채팅
│   │   ├── payment/          # 정산/결제
│   │   └── review/           # 평점/리뷰
│   ├── common/               # 공통 모듈
│   │   ├── guards/           # 전역 가드
│   │   ├── filters/          # 예외 필터
│   │   ├── interceptors/     # 인터셉터
│   │   ├── decorators/       # 커스텀 데코레이터
│   │   └── pipes/            # 유효성 검증 파이프
│   ├── config/               # 환경 설정
│   │   ├── config.module.ts
│   │   └── configuration.ts
│   └── prisma/               # Prisma 서비스
│       ├── prisma.module.ts
│       └── prisma.service.ts
├── prisma/
│   ├── schema.prisma         # DB 스키마
│   ├── migrations/           # 마이그레이션
│   └── seed.ts               # 시드 데이터
└── test/                     # E2E 테스트
    ├── app.e2e-spec.ts
    └── jest-e2e.json
```

---

## 📝 코딩 컨벤션

### 네이밍

| 대상 | 규칙 | 예시 |
|---|---|---|
| 모듈 | kebab-case 디렉토리 | `auth/`, `matching/` |
| 클래스 | PascalCase | `AuthService`, `MatchingService` |
| 메서드 | camelCase | `findMatching()`, `createRide()` |
| 변수/상수 | camelCase / UPPER_SNAKE | `userId`, `MAX_SEATS` |
| DTO | PascalCase + 접미사 | `LoginRequestDto`, `AuthResponseDto` |
| Enum | PascalCase | `MatchingStatus` |
| 파일명 | kebab-case | `auth.service.ts`, `login-request.dto.ts` |
| 테스트 파일 | 대상.spec.ts | `auth.service.spec.ts` |

### TypeScript

- **`any` 사용 금지** — 모든 값은 명시적 타입
- **DTO로 요청/응답 타입 정의** — 컨트롤러 파라미터에 인라인 타입 금지
- **`enum` 대신 `as const` 객체** 사용 (Prisma enum은 예외)
- **null 보다 undefined** — TypeScript 관례 준수

```typescript
// ✅ Good
export const RIDE_STATUS = {
  OPEN: 'OPEN',
  MATCHED: 'MATCHED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

// ❌ Bad
const data: any = await prisma.ride.findMany();
```

### NestJS 컨벤션

#### 모듈 구조

각 모듈은 다음 파일로 구성:

```
module-name/
├── module-name.module.ts        # 모듈 정의
├── module-name.controller.ts    # 컨트롤러
├── module-name.service.ts       # 비즈니스 로직
├── module-name.controller.spec.ts  # 컨트롤러 테스트
├── module-name.service.spec.ts     # 서비스 테스트
├── dto/                         # DTO
│   ├── create-module-name.dto.ts
│   └── update-module-name.dto.ts
├── guards/                      # 모듈 전용 가드
└── strategies/                  # Passport 전략 (필요 시)
```

#### 컨트롤러

- **thin controller** — 비즈니스 로직은 서비스에 위임
- **DTO로 입력 검증** — `class-validator` 데코레이터 사용
- **명시적 응답 타입** — `@ApiResponse()` 데코레이터

```typescript
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ type: AuthResponseDto })
  async login(@Body() loginDto: LoginRequestDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }
}
```

#### 서비스

- **비즈니스 로직은 서비스에만** — 컨트롤러에 로직 금지
- **Prisma는 주입받아 사용** — `new PrismaClient()` 직접 생성 금지
- **트랜잭션이 필요한 경우 `prisma.$transaction`** 사용

```typescript
@Injectable()
export class MatchingService {
  constructor(private prisma: PrismaService) {}

  async searchRides(params: SearchParams): Promise<Ride[]> {
    return this.prisma.ride.findMany({
      where: {
        status: RIDE_STATUS.OPEN,
        departureTime: { gte: params.time },
        availableSeats: { gte: params.seats },
      },
    });
  }
}
```

#### DTO

- **class-validator + class-transformer** 로 검증
- **`partial` 타입 대신 명시적 필드** — 업데이트 DTO도 필드 명시
- **Swagger 데코레이터로 API 문서화** — `@ApiProperty()`

```typescript
export class LoginRequestDto {
  @ApiProperty({ enum: ['kakao', 'google', 'apple'] })
  @IsEnum(['kakao', 'google', 'apple'])
  provider: 'kakao' | 'google' | 'apple';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
```

### Prisma 컨벤션

- **스키마는 `docs/architecture/DATABASE.md`와 일치** — 임의 변경 금지
- **마이그레이션은 항상 `npx prisma migrate dev --name <설명>`** 으로 생성
- **시드 데이터는 `prisma/seed.ts`에 관리**
- **Prisma Service는 싱글톤** — `PrismaModule`에서 전역 제공

```prisma
// schema.prisma 규칙
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

- **컬럼명은 snake_case** (`@map`) — DB는 snake_case, TS는 camelCase
- **테이블명은 복수형** (`@@map`) — `users`, `rides`, `matchings`
- **관계 필드는 명시적** — `@relation` 명시

---

## 🧪 테스트 컨벤션

### 테스트 구조

```
src/modules/<module>/
├── <module>.service.spec.ts      # 서비스 유닛 테스트
├── <module>.controller.spec.ts   # 컨트롤러 유닛 테스트
test/
├── <module>.e2e-spec.ts          # E2E 테스트
```

### 테스트 작성 규칙

- **describe/it 구조** — `describe('단위', () => { it('동작', ...) })`
- **한 it당 하나의 검증** — 여러 assert는 허용하나 하나의 동작만 검증
- **테스트 설명은 한국어** — `it('유효한 토큰으로 로그인에 성공한다', ...)`
- **Prisma는 모킹** — `jest.mock` 또는 테스트 DB 사용
- **서비스 테스트는 비즈니스 로직에 집중** — HTTP 레이어는 컨트롤러 테스트에서

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get(AuthService);
    prisma = module.get(PrismaService);
  });

  it('유효한 카카오 토큰으로 로그인에 성공한다', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    const result = await service.login({ provider: 'kakao', accessToken: 'valid' });
    expect(result.accessToken).toBeDefined();
  });
});
```

### E2E 테스트

- **Supertest로 HTTP 테스트** — 실제 HTTP 요청/응답 검증
- **테스트 DB 사용** — 격리된 환경에서 실행
- **beforeEach에서 데이터 초기화** — 테스트 간 독립성 보장

---

## 🌿 브랜치 & 커밋 컨벤션

### 브랜치 네이밍

| 타입 | 형식 | 예시 |
|---|---|---|
| 기능 | `feat/<이슈번호>-<설명>` | `feat/3-auth-api` |
| 버그 | `fix/<이슈번호>-<설명>` | `fix/5-matching-crash` |
| 테스트 | `test/<이슈번호>-<설명>` | `test/4-auth-test` |
| 리팩토링 | `refactor/<이슈번호>-<설명>` | `refactor/6-api-structure` |

### 커밋 메시지 (Conventional Commits)

```
<type>(<scope>): <subject>

<body>
```

| type | 설명 |
|---|---|
| feat | 새로운 기능 |
| fix | 버그 수정 |
| test | 테스트 추가/수정 |
| refactor | 리팩토링 |
| docs | 문서 변경 |
| chore | 빌드/설정 변경 |
| migrate | DB 마이그레이션 |

**예시:**
```
feat(auth): 카카오 소셜 로그인 API 구현

- 카카오 OAuth 토큰 검증
- JWT 발급/갱신 로직
- 휴대폰 인증 API

Closes #3
```

---

## 📋 체크리스트 (PR 생성 전)

- [ ] 이슈가 생성되어 있는가?
- [ ] TDD 사이클을 따랐는가? (Red → Green → Refactor)
- [ ] `npm run lint` 에러가 없는가?
- [ ] `npm run test` 전체 통과하는가?
- [ ] TypeScript 타입 에러가 없는가?
- [ ] API 스펙(docs/api/)을 준수했는가?
- [ ] DB 스키마 변경 시 마이그레이션을 포함했는가?
- [ ] 기능 작업인 경우 테스트 이슈를 생성했는가?
