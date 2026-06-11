# AGENTS.md — Ridy Backend

이 파일은 이 레포에서 작업하는 에이전트가 반드시 따라야 할 규칙을 정의합니다.

## 에이전트 역할

이 레포의 에이전트는 **Developer**입니다. Orchestrator가 docs에 설계한 내용을 기반으로 구현합니다.

## 필수 규칙

### 작업 흐름
1. 모든 작업은 **GitHub Organization Project**의 이슈에서 시작 — https://github.com/orgs/project-ridy/projects/1
2. 작업 시작 전 **이슈에 자신을 어사인** (`gh issue edit <번호> --add-assignee @me`)
3. 이슈를 `In Progress`로 변경 후 작업 시작
4. **기획서 확인** — `agents/plans/`의 해당 기획서를 읽고 코드 구조, 예외 처리, 테스트 시나리오를 파악
5. 브랜치 생성: `<type>/<이슈번호>-<설명>` (feat, fix, test, refactor)
6. PR 생성 후 머지, 이슈를 `Done`으로 변경
7. main 브랜치에 직접 커밋 금지
8. 기능 작업 후 대응 테스트 이슈를 반드시 이어서 진행

### TDD (절대 불변)
모든 기능/버그 수정은 **Red → Green → Refactor** 사이클을 따른다:
1. 🔴 **Red** — 실패하는 테스트를 먼저 작성
2. 🟢 **Green** — 테스트를 통과하는 최소 구현 작성
3. 🔵 **Refactor** — 테스트가 여전히 통과하는 상태로 코드 정리
4. ✅ **Verify** — `npm run test` 전체 통과 확인 후 커밋

**금지**: 구현 먼저 하고 테스트 나중에 작성 / Red 없이 Green 진입 / 사이클 완료 전 커밋

### docs 기반 구현
- 작업 시작 전 **반드시** 관련 docs 문서를 읽는다:
  - API 구현: `docs/api/` 스펙을 정확히 따름 (엔드포인트, DTO, 에러 코드)
  - DB 작업: `docs/architecture/DATABASE.md` 스키마를 기준으로 함
  - 아키텍처: `docs/architecture/ARCHITECTURE.md` 구조 준수
- docs에 정의되지 않은 API/스키마는 임의로 추가하지 않음 — Orchestrator에 BLOCKED 보고

### 기술 스택 준수
- **NestJS 11.x** — 모듈/컨트롤러/서비스 구조, thin controller 원칙
- **Prisma 6.x** — 싱글톤 PrismaService, `@map`/`@@map` 네이밍 규칙
- **TypeScript 5.x** — `any` 금지, DTO로 요청/응답 타입 정의, `enum` 대신 `as const`
- **class-validator** — DTO 입력 검증, `@ApiProperty()`로 문서화
- **Jest + Supertest** — 유닛/통합/E2E 테스트

### NestJS 컨벤션
- 모듈 구조: `module-name/module-name.{module,controller,service}.ts` + `dto/` + `guards/`
- 컨트롤러: 비즈니스 로직 금지, 서비스에 위임
- 서비스: Prisma는 주입받아 사용, `new PrismaClient()` 직접 생성 금지
- DTO: `class-validator` + `class-transformer`, `partial` 대신 명시적 필드
- 트랜잭션: `prisma.$transaction` 사용

### Prisma 컨벤션
- 스키마는 `docs/architecture/DATABASE.md`와 일치 — 임의 변경 금지
- 마이그레이션: `npx prisma migrate dev --name <설명>`
- 컬럼명: snake_case (`@map`) — DB는 snake_case, TS는 camelCase
- 테이블명: 복수형 (`@@map`) — `users`, `rides`, `matchings`
- 관계 필드: `@relation` 명시

### 테스트 컨벤션
- 서비스 테스트: 비즈니스 로직에 집중, Prisma는 모킹
- 컨트롤러 테스트: HTTP 레이어 검증
- E2E: Supertest + 테스트 DB, `beforeEach`에서 데이터 초기화
- `describe/it` 구조, 설명은 한국어

### 코딩 컨벤션
- 모듈 디렉토리: kebab-case
- 클래스: PascalCase
- 메서드/변수: camelCase
- 상수: UPPER_SNAKE_CASE
- DTO: PascalCase + 접미사 (`LoginRequestDto`, `AuthResponseDto`)
- 파일명: kebab-case (`auth.service.ts`, `login-request.dto.ts`)
- 테스트: 대상.spec.ts (`auth.service.spec.ts`)

### 커밋 메시지
```
<type>(<scope>): <subject>

Closes #<이슈번호>
```
type: feat | fix | test | refactor | docs | chore | migrate

### 사용 스킬
`tdd`, `typescript-expert`, `database-optimizer`, `api-design-reviewer`, `code-review-expert`

### PR 체크리스트
- [ ] Project 이슈가 할당되어 있는가?
- [ ] TDD 사이클을 따랐는가?
- [ ] `npm run lint` 에러 없는가?
- [ ] `npm run test` 전체 통과하는가?
- [ ] TypeScript 타입 에러 없는가?
- [ ] API 스펙(docs/api/)을 준수했는가?
- [ ] DB 스키마 변경 시 마이그레이션을 포함했는가?
- [ ] 기능 작업인 경우 후속 테스트 이슈를 In Progress로 변경했는가?
