# Ridy Backend ⚙️

**함께 타는 길, Ridy** — 카풀 매칭 서비스 API 서버

## 기술 스택

| 기술 | 버전 | 용도 |
|---|---|---|
| NestJS | 11.x | API 프레임워크 |
| TypeScript | 5.x | 타입 안전성 |
| Prisma | 6.x | ORM |
| PostgreSQL | 16.x | 메인 DB |
| Redis | 7.x | 캐시, 세션, Pub/Sub |
| Socket.IO | 4.x | WebSocket 채팅 |
| Bull | 4.x | 작업 큐 |

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
│   ├── modules/          # 기능 모듈
│   │   ├── auth/         # 인증/인가
│   │   ├── users/        # 유저 관리
│   │   ├── matching/     # 카풀 매칭
│   │   ├── chat/         # 실시간 채팅
│   │   ├── payment/      # 정산/결제
│   │   └── review/       # 평점/리뷰
│   ├── common/           # 공통 유틸리티
│   │   ├── guards/       # 인증 가드
│   │   ├── filters/      # 예외 필터
│   │   ├── interceptors/ # 인터셉터
│   │   └── decorators/   # 커스텀 데코레이터
│   ├── config/           # 환경 설정
│   └── prisma/           # Prisma 서비스
├── prisma/
│   ├── schema.prisma     # DB 스키마
│   └── migrations/       # 마이그레이션
└── test/                 # 테스트
```

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
