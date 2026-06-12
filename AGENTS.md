# AGENTS.md — Ridy Backend

이 파일은 이 레포에서 작업하는 에이전트가 반드시 따라야 할 규칙을 정의합니다.

## 에이전트 역할

이 레포의 에이전트는 **Backend Developer**입니다. Orchestrator가 docs에 설계한 내용을 기반으로 구현합니다.

## 필수 규칙

### 공통 작업 규칙
- 모든 레포 공통 규칙은 [`project-ridy/docs/WORKFLOW.md`](https://github.com/project-ridy/docs/blob/main/WORKFLOW.md)를 최우선으로 따른다.
- 이 파일은 backend 레포 전용 세부 규칙만 보완한다.

### 작업 흐름
1. 모든 작업은 **GitHub Organization Project**의 이슈에서 시작 — https://github.com/orgs/project-ridy/projects/1
2. 작업 시작 전 **이슈에 자신을 어사인** (`gh issue edit <번호> --add-assignee @me`)
3. 이슈를 `In Progress`로 변경 후 작업 시작
4. **기획서 확인** — `project-ridy/docs/planning/implementation/`의 해당 구현 계획서를 읽고 코드 구조, 예외 처리, 테스트 시나리오를 파악
5. 브랜치 생성: `<type>/<이슈번호>-<설명>` (feat, fix, test, refactor)
6. PR 생성 후 머지, 이슈를 `Done`으로 변경
7. **머지 완료 후 작업 브랜치 삭제** — 로컬/원격 모두 정리 (`git branch -d <branch> && git push origin --delete <branch>`)
8. main 브랜치에 직접 커밋 금지
9. 기능 작업 후 대응 테스트 이슈를 반드시 이어서 진행

### TDD (절대 불변)
모든 기능/버그 수정은 **Red → Green → Refactor** 사이클을 따른다:
1. 🔴 **Red** — 실패하는 테스트를 먼저 작성
2. 🟢 **Green** — 테스트를 통과하는 최소 구현 작성
3. 🔵 **Refactor** — 테스트가 여전히 통과하는 상태로 코드 정리
4. ✅ **Verify** — `npm run test` 전체 통과 확인 후 커밋

**금지**: 구현 먼저 하고 테스트 나중에 작성 / Red 없이 Green 진입 / 사이클 완료 전 커밋

### 구현/테스트 케이스 추적 (절대 불변)
- 작업 시작 전 구현 계획서의 **구현/테스트 케이스 등록표**를 확인한다.
- 계획서에 등록된 모든 케이스 ID를 구현 대상과 테스트 대상으로 처리한다.
- 새 GraphQL field, operation, Resolver, Service 메서드, Prisma 변경, guard/helper는 반드시 케이스 ID와 대응 테스트를 가져야 한다.
- 케이스별 테스트는 테스트 파일과 `describe/it` 이름이 계획서에 적힌 내용과 연결되어야 한다.
- 대응 테스트가 없는 기능 코드는 완료 처리할 수 없다.
- 구현 중 새 기능 코드 항목이 생기면 계획서 또는 PR 확인표에 케이스를 추가하고, 테스트 파일/테스트명을 함께 적는다.
- PR에는 케이스 ID별 구현 파일, 테스트 파일, 테스트 이름, 확인 결과를 표로 작성한다.

### docs 기반 구현
- 작업 시작 전 **반드시** 관련 docs 문서를 읽는다:
  - API 구현: `docs/api/` 스펙을 정확히 따름 (엔드포인트, DTO, 에러 코드)
  - DB 작업: `docs/architecture/DATABASE.md` 스키마를 기준으로 함
  - 아키텍처: `docs/architecture/ARCHITECTURE.md` 구조 준수
- docs에 정의되지 않은 API/스키마는 임의로 추가하지 않음 — Orchestrator에 BLOCKED 보고

### 기술 스택 준수
- **최신 안정 버전 우선** — 작업 시작 전 `npm outdated`로 확인하고, 특별한 호환성 이슈가 없으면 latest 사용
- **NestJS 11.x + GraphQL** — REST 컨트롤러가 아닌 GraphQL Resolver 중심 구조
- **GraphQL schema-first** — 기능 구현 전 `src/graphql/schema.graphql`에 SDL 스키마를 먼저 작성
- **GraphQL Code Generator 필수** — 스키마 작성 후 `npm run codegen`으로 generated 타입을 만든 뒤 Resolver/Service 구현
- **Prisma 7.x** — `prisma.config.ts` + adapter 방식 사용, schema 파일에 datasource URL 작성 금지
- **TypeScript 6.x** — `any` 금지, generated 타입 우선, `enum` 대신 `as const`
- **class-validator** — GraphQL input 검증이 필요한 경우 명시적 Input 타입과 함께 사용
- **Jest + Supertest** — 유닛/GraphQL E2E 테스트

### NestJS / GraphQL 컨벤션
- 모듈 구조: `module-name/module-name.{module,resolver,service}.ts` + 필요 시 `dto/`, `guards/`
- Resolver: GraphQL entrypoint만 담당, 비즈니스 로직은 서비스에 위임
- Schema-first: Resolver/Input/Object 타입을 만들기 전에 `src/graphql/schema.graphql`을 먼저 수정
- Generated 타입: `src/graphql/generated/schema-types.ts`를 import하여 Resolver 반환/인자 타입에 사용
- 서비스: Prisma는 주입받아 사용, `new PrismaClient()` 직접 생성 금지
- 트랜잭션: `prisma.$transaction` 사용

### Prisma 컨벤션
- 스키마는 `docs/architecture/DATABASE.md`와 일치 — 임의 변경 금지
- 마이그레이션: `npx prisma migrate dev --name <설명>`
- 컬럼명: snake_case (`@map`) — DB는 snake_case, TS는 camelCase
- 테이블명: 복수형 (`@@map`) — `users`, `rides`, `matchings`
- 관계 필드: `@relation` 명시

### 테스트 컨벤션
- 서비스 테스트: 비즈니스 로직에 집중, Prisma는 모킹
- GraphQL E2E: Supertest로 `POST /graphql` 요청 검증
- E2E: 테스트 DB가 필요한 경우 `beforeEach`에서 데이터 초기화
- `describe/it` 구조, 설명은 한국어

### 코딩 컨벤션
- 모듈 디렉토리: kebab-case
- 클래스: PascalCase
- 메서드/변수: camelCase
- 상수: UPPER_SNAKE_CASE
- DTO/GraphQL 타입: PascalCase + 의미 있는 접미사 (`LoginInput`, `AuthPayload`)
- 파일명: kebab-case (`auth.resolver.ts`, `auth.service.ts`)
- 테스트: 대상.spec.ts (`auth.service.spec.ts`, `auth.e2e-spec.ts`)

### 커밋 메시지
```
<type>(<scope>): <subject 한글>

Closes #<이슈번호>
```
- **subject는 반드시 한국어**로 작성, **type은 영어** (예: `feat(auth): 로그인 리졸버 구현`, `docs(setup): 초기 셋업 가이드 추가`)
- type: feat | fix | test | refactor | docs | chore | migrate

### PR 제목
- **PR 제목도 동일한 형식** — type은 영어, subject는 한국어 (예: `feat(auth): 로그인 리졸버 구현`)
- 커밋 메시지와 동일한 형식 사용

### 사용 스킬
`tdd`, `typescript-expert`, `database-optimizer`, `api-design-reviewer`, `code-review-expert`

### PR 체크리스트
- [ ] Project 이슈가 할당되어 있는가?
- [ ] TDD 사이클을 따랐는가?
- [ ] 기획서의 구현/테스트 케이스 등록표에 있는 모든 케이스를 구현했는가?
- [ ] 모든 기능 코드 케이스가 대응 테스트 파일과 테스트 이름을 가지는가?
- [ ] PR 본문에 케이스 ID별 구현/테스트 확인표를 작성했는가?
- [ ] `npm run lint` 에러 없는가?
- [ ] `npm run test` 전체 통과하는가?
- [ ] TypeScript 타입 에러 없는가?
- [ ] API 스펙(docs/api/)과 `src/graphql/schema.graphql`을 준수했는가?
- [ ] GraphQL 작업 시 스키마를 먼저 수정하고 `npm run codegen`을 실행했는가?
- [ ] Resolver/클라이언트 코드가 generated 타입을 사용하는가?
- [ ] DB 스키마 변경 시 Prisma 7 방식의 config/migration을 포함했는가?
- [ ] 기능 작업인 경우 후속 테스트 이슈를 In Progress로 변경했는가?
