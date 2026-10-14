# 아산 밥때 — 서울아산병원 직원식당의 메뉴와 예상 대기를 보여 주는 시연용 웹앱(모의 데이터)
- 설치: `npm install`
- 개발 서버: `npm run dev`
- 테스트: `npm test`(단위), `npm run e2e`(Playwright, 390px·1280px)
- 시연: `/?at=2026-10-14T12:20`처럼 `at`으로 시각을 고정해요. 열 때마다 그 시각에서 시작해요. 시연 시간 시트의 "검수 직원 화면 열기"나 다른 탭의 `/staff`에서 줄 상태를 바꾸면 화면이 함께 바뀌어요. 직원 입력은 실제 시각으로 15분 동안 유지돼요

## 배포
- 색 토큰은 저장소 루트의 `design/tokens.css`에 있고 `src/index.css`가 `../../design/tokens.css`로 불러와요. 그래서 `app/`만 따로 올리면 빌드가 깨져요
- Vercel에는 저장소 전체를 연결하고 프로젝트 설정의 Root Directory를 `app`으로 지정해요. 빌드 명령은 `npm run build`, 출력 폴더는 `dist`예요. 주소 새로 고침은 `vercel.json`의 rewrite가 `index.html`로 보내요
- shadcn ui 파일 중 `toggle`, `switch`, `slider`, `field`는 초점·트랙 대비를 위해, `toast`는 모바일 탭 막대 위에 띄우려고 직접 고쳤어요. `npx shadcn add`로 다시 설치하면 이 수정을 다시 적용해야 해요
