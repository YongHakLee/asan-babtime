# 밥타임 디자인 시스템

웹앱·제안서 공통 토큰. 색의 단일 원천은 `../design/tokens.css`이고, 앱은 `src/index.css`에서 이를 import해 shadcn 변수에 연결한다. 앱 코드에 HEX를 직접 쓰지 않는다.

근거: CI 메인 ASAN GREEN(Pantone 3155C), 보조 ASAN Orange(Pantone 138C). 공식 HEX가 공개되지 않아 로고·웹사이트 실측값을 쓴다.

## 색 역할

| 역할 | 라이트 | 다크 | 쓰임 |
|---|---|---|---|
| deep | `#004F51` | `#1D3C3B` | 홈 상단 영역, 제안서 표지·제목 |
| deep-foreground | `#FFFFFF` | `#E6F0EE` | deep 위 글자 |
| deep-muted | `#B3CACB` | `#B3CFCB` | deep 위 보조 글자(`text-deep-muted`) |
| primary | `#00696D` | `#7CC4BD` | 버튼, 활성 탭, 그래프 |
| primary-foreground | `#FFFFFF` | `#10302E` | primary 위 글자 |
| background | `#EEF5F4` | `#161A1A` | 페이지 바탕(회색 대신 녹색빛) |
| card / sheet | `#FFFFFF` | `#1F2424` | 시트, 목록 면 |
| foreground (ink) | `#10302F` | `#DCE3E2` | 본문 글자(순검정 대신 녹색빛) |
| muted-foreground | `#4C6563` | `#A8B4B2` | 보조 글자 |
| accent / tint | `#E2EFEE` | `#283030` | 표 머리, 보조 면, 비활성 막대 |
| border | `#D6E6E4` | `#353D3C` | 구분선 |
| brand-orange | `#F18D00` | `#E9A23B` | "지금" 표시선, 예측 그래프 현재 막대, 표지 짧은 선 **세 곳만** |
| status-ok (여유) | `#127A4B` | `#8BCFA6` | |
| status-mid (보통) | `#8A5B00` | `#DCC27E` | |
| status-queue (줄 있음) | `#B4470C` | `#E8A982` | |
| status-busy (혼잡) | `#B42318` | `#E89C95` | |

### 테이크아웃 존 색

실제 매장 구역 색. 브랜드 오렌지 사용 제한과 별개인 "구역 식별색"으로, 테이크아웃 화면의 존 표시에만 쓴다.

| 존 | 라이트 면 / 글자 | 다크 면 / 글자 |
|---|---|---|
| zone-green (그린존, 2PICK) | `#DDF3DF` / `#1F6B2E` | `#1E3326` / `#9CD3AC` |
| zone-orange (오렌지존, 3PICK) | `#FFE6CC` / `#8A4A00` | `#3A2D1C` / `#EBC08A` |
| zone-purple (퍼플존, 4PICK) | `#EDE1FA` / `#5B3A8C` | `#2C2737` / `#C9B8E6` |

라이트: 모든 글자색은 해당 바탕에서 WCAG AA(4.5:1) 이상(최저 4.86:1, 존 색 포함). 다크: 글자색은 카드 바탕에서 모두 7:1 이상(본문 12.07, 보조 7.36, 상태색 7.20 이상, 존 색 7.9, deep 위 보조 글자 7.21).

## shadcn 변수 연결

| shadcn 변수 | 연결 |
|---|---|
| `--background`, `--foreground`, `--card`, `--primary`, `--primary-foreground`, `--muted-foreground`, `--accent`, `--border` | tokens.css 값 그대로 |
| `--card-foreground`, `--popover-foreground`, `--secondary-foreground`, `--accent-foreground` | `--foreground` |
| `--popover` | `--card` |
| `--secondary`, `--muted` | `--accent` |
| `--input` | `--border` |
| `--ring` | `--primary` |
| `--destructive` | `--status-busy` |
| `--chart-1` / `--chart-2` | `--primary` / `--brand-orange` |
| `--chart-3` / `--chart-4` / `--chart-5` | `--status-ok` / `--status-queue` / `--muted-foreground` |

shadcn 슬롯이 없는 `deep`, `brand-orange`, `status-*`, `zone-*`는 `@theme inline`에서 `--color-*`로 등록해 `bg-deep`, `text-status-busy`, `bg-zone-green-bg` 같은 유틸리티로 쓴다.

## 서체

- **Wanted Sans Variable** 한 가지(`wanted-sans@1.0.3`, 분할 웹폰트).
- 숫자는 고정폭: `font-feature-settings: "tnum"`.
- 한글 줄바꿈: `word-break: keep-all`.
- `@font-face`는 tokens.css에 두지 않는다. 앱과 제안서가 각자 로드한다.

## 모양

- 모티프: 병원 길안내 사인물. 건물은 한 글자 타일(동·서·신, 8px 모서리)로 표시.
- 모서리 위계: 시트 22px(`rounded-3xl`), 타일 8px(`rounded-lg`), 버튼·입력 maia 기본. 같은 반경을 모든 것에 쓰지 않는다.
- 스타일: shadcn `base-maia`(Base UI), 아이콘 hugeicons.

## 금지 목록

- 반짝이 아이콘(예: ✨), 이모지 아이콘
- 그라디언트 장식
- 같은 카드 반복 나열
- 상태 배지 남발
- 모든 제목 위 영문 대문자 라벨
- 버튼 글자 뒤 화살표
- 가운데점(·)으로 잇는 메타 문자열 남용

## 움직임과 접근성

- 움직임은 사용자 동작에 대한 반응(시트 열림, 상태 전환)에만 쓴다. 자동 등장 애니메이션 없음. `prefers-reduced-motion`을 존중한다.
- 상태는 색만으로 구분하지 않고 항상 글자로 함께 표기한다.
- 병원 로고는 쓰지 않는다(사용 시 디자인·콘텐츠팀 확인 필요). 서비스 이름은 글자로만 표기한다.
