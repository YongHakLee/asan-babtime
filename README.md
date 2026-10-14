# 아산 밥때 — 2026 서울아산병원 업무개선 AI 공모전 제안

- `proposal/`: 상세 제안서 원고(`상세제안서.md`), 완성 PDF(`상세제안서.pdf`), 빌드 스크립트(`build/`)
- `app/`: 서비스 개념을 보여 주는 웹앱. 설치·실행은 `app/README.md` 참고
- `design/`: 색 토큰(`tokens.css`). 제안서 PDF와 웹앱이 함께 쓴다
- `docs/`: 조사 노트(`docs/research/`)와 설계·계획 문서(`docs/superpowers/`)

제안서 PDF 다시 만들기(저장소 루트에서): `npm install` → `npx playwright install chromium` → `npm run proposal:pdf` → `npm run proposal:verify`(PASS 확인)
