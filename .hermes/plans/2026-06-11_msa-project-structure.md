# 백엔드 MSA 프로젝트 구조 전환 계획

## 목표

현재 단일 NestJS 모듈 구조를 GraphQL Gateway 중심 MSA 전환이 가능한 **모듈형 모놀리스** 구조로 바꾼다.

## 범위

1. `src/app` — 루트 애플리케이션 조립 계층
2. `src/gateway/graphql` — 외부 GraphQL Gateway 계층
3. `src/common` — 요청 컨텍스트, correlation id, 이벤트 버스, health 공통 타입
4. `src/services/<bounded-context>` — Auth, Company, Matching, Chat, Payment, Analytics, Notification bounded context
5. 기존 `invite-code` 기능은 Company bounded context로 이동
6. GraphQL SDL은 Gateway 스펙 기준으로 확장

## 비범위

- 실제 DB를 서비스별 physical database로 분리하지 않는다.
- Kafka/RabbitMQ 등 외부 broker를 도입하지 않는다.
- 모든 도메인 비즈니스 기능을 완성하지 않는다.
- 기존 Prisma 스키마의 대규모 마이그레이션은 하지 않는다.

## 설계 결정

- MVP는 단일 NestJS 앱 안의 모듈형 모놀리스로 유지한다.
- GraphQL은 외부 API 계약으로만 사용한다.
- 내부 bounded context 간 후속 처리는 `DomainEventBus` 인터페이스로 추상화한다.
- 테스트 환경에서는 in-memory event bus를 사용한다.
- 각 서비스 모듈은 자신의 public module만 `AppModule`에 export한다.

## TDD 계획

### Red

`src/architecture/msa-structure.spec.ts` 추가:

- 필수 디렉토리가 존재해야 한다.
- AppModule이 GraphQLGatewayModule과 bounded context module들을 import해야 한다.
- InviteCodeModule은 `services/company` 아래에 위치해야 한다.
- DomainEventBus 토큰과 InMemoryDomainEventBus가 존재해야 한다.

### Green

- 디렉토리와 module scaffold 생성
- AppModule import 갱신
- 기존 health/invite-code 모듈을 새 구조로 이동
- GraphQL context를 Gateway 계층으로 이동하고 호환 export 제공
- schema.graphql을 gateway 공통 SDL 기준으로 확장

### Verify

- `npm run codegen`
- `npm run test`
- `npm run build`

## 완료 조건

- 테스트 전체 통과
- build 통과
- GraphQL schema-first codegen 통과
- PR 생성 및 main 머지
