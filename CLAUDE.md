# 밥타임 — 서울아산병원 업무개선 AI 공모전

새 세션은 먼저 `docs/HANDOFF.md`를 읽는다(현재 상태, 명령, 남은 확인 항목).

- 산출물: `proposal/`(상세 제안서 md→pdf), `app/`(Vite+React+shadcn Base UI 웹앱), 공통 색 토큰 `design/tokens.css`.
- UI 작업 전 프로젝트 스킬 `.claude/skills/shadcn`을 반드시 로드한다(Radix 코드는 `migrate-radix-to-base`).
- 제안서에는 구현 프로그램(웹앱·프로토타입·시연)을 쓰지 않는다. 수정 후 `npm run proposal:pdf && npm run proposal:verify`.
- 웹앱 수정 후 `app/`에서 테스트·E2E·tsc·lint·build를 모두 통과시킨다. 배포는 저장소 루트에서 `vercel deploy --prod --yes`(외부 공개이므로 사용자 확인 후).
- 문구는 해요체 한국어. 이모지·그라디언트·가운데점(·) 메타 문구 금지. 오렌지는 지정된 곳에만.
- `reference/`는 병원 내부 자료 — 외부에 올리지 않는다.
