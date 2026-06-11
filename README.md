# Ridy Backend ⚙️

**함께 타는 길, Ridy** — 카풀 매칭 서비스 API 서버

## 기술 스택

| 기술 | 버전 | 용도 |
|---|---|---|
| NestJS | 11.x | API 프레임워크 |
| TypeScript | 5.x | 타입 안전성 |
| GraphQL | 16.x | API 쿼리 언어 (schema-first) |
| Apollo Server | 5.x | GraphQL 서버 |
| Prisma | 7.x | ORM |
| PostgreSQL | 16.x | 메인 DB |
| Redis | 7.x | 캐시, 세션, Pub/Sub |

## 아키텍처

GraphQL Gateway 패턴 기반 MSA 구조. 단일 진입점 GraphQL Gateway가 도메인 서비스 모듈로 요청을 라우팅한다.

```
Client → GraphQL Gateway → Domain Service Modules
                              ├── auth         (인증/인가)
                              ├── company       (기업/초대코드)
                              ├── matching      (카풀 매칭)
                              ├── chat          (실시간 채팅)
                              ├── payment       (정산/결제)
                              ├── notification  (알림)
                              └── analytics     (통계)
```

### 공통 인프라

- **DomainEventBus** — 서비스 간 이벤트 통신 (InMemory 구현체, 운영 환경에서 Redis Pub/Sub으로 교체 예정)
- **GraphQLContext** — 요청 컨텍스트에 인증 사용자 정보 주입
- **AuthGuard** — `@auth` 디렉티브 기반 인증 보호

## 시작하기

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일 편집 (DB 연결 정보 등)

# DB 마이그레이션
npx prisma migrate dev

# 개발 서버 실행
npm run start:dev

# 테스트
npm run test

# 린트
npm run lint
```

## 프로젝트 구조

```
backend/
├── src/
│   ├── main.ts                          # 애플리케이션 엔트리포인트
│   ├── app/                             # 루트 AppModule
│   ├── gateway/
│   │   └── graphql/                     # GraphQL Gateway 모듈
│   ├── services/                        # 도메인 서비스 (MSA 모듈)
│   │   ├── auth/                        # 인증 (JWT, OAuth Kakao/Google)
│   │   ├── company/                     # 기업 관리, 초대코드
│   │   ├── matching/                    # 카풀 매칭
│   │   ├── chat/                        # 실시간 채팅
│   │   ├── payment/                     # 정산/결제
│   │   ├── notification/                # 알림
│   │   ├── analytics/                   # 통계
│   │   └── health/                      # 헬스 체크
│   ├── common/                          # 공통 인프라
│   │   ├── context/                     # GraphQL 컨텍스트
│   │   └── events/                      # 도메인 이벤트 버스
│   ├── graphql/
│   │   ├── schema.graphql               # 통합 GraphQL 스키마 (SSoT)
│   │   └── generated/                   # Code Generator 산출물
│   ├── prisma/                          # Prisma 서비스
│   └── architecture/                    # 아키텍처 테스트
├── prisma/
│   ├── schema.prisma                    # DB 스키마
│   └── migrations/                      # 마이그레이션
└── test/                                # E2E 테스트
```

## 인증

- **소셜 로그인**: 카카오, 구글 (OAuth access token 검증)
- **초대 코드 가입**: 기업 관리자가 발급한 초대 코드로 사원 가입
- **JWT**: HS256 access/refresh 토큰 발급
- **개발용 mock token**: `mock:<email>:<name>:<providerId>` 형식으로 OAuth 없이 테스트 가능

## API 문서

- 전체 스펙: [docs/api/API.md](https://github.com/project-ridy/docs/blob/main/api/API.md)
- 인증: [docs/api/AUTH.md](https://github.com/project-ridy/docs/blob/main/api/AUTH.md)
- 매칭: [docs/api/MATCHING.md](https://github.com/project-ridy/docs/blob/main/api/MATCHING.md)
- 채팅: [docs/api/CHAT.md](https://github.com/project-ridy/docs/blob/main/api/CHAT.md)
- 정산: [docs/api/PAYMENT.md](https://github.com/project-ridy/docs/blob/main/api/PAYMENT.md)

## 에이전트 작업 가이드

- 작업 지시서: [agents/tasks/BACKEND_DEVELOPER_TASKS.md](https://github.com/project-ridy/agents/blob/main/tasks/BACKEND_DEVELOPER_TASKS.md)
- DB 스키마: [docs/architecture/DATABASE.md](https://github.com/project-ridy/docs/blob/main/architecture/DATABASE.md)
- 아키텍처: [docs/architecture/ARCHITECTURE.md](https://github.com/project-ridy/docs/blob/main/architecture/ARCHITECTURE.md)

## 브랜치 규칙

- `feat/<task-id>-<설명>` — 기능 개발
- `fix/<task-id>-<설명>` — 버그 수정
- `refactor/<task-id>-<설명>` — 리팩토링
- main 직접 커밋 금지 — PR 필수

---

*Project by 손정원*
