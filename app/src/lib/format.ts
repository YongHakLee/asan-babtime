const WEEKDAY_FMT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  weekday: "long",
})
const TIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

const WEEKDAYS = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]

/** "수요일 12:20" — 서울 기준 */
export function seoulWeekdayTime(d: Date): string {
  return `${WEEKDAY_FMT.format(d)} ${TIME_FMT.format(d)}`
}

/** 0 = 월요일 … 6 = 일요일 (서울 기준) */
export function seoulWeekdayIndex(d: Date): number {
  return WEEKDAYS.indexOf(WEEKDAY_FMT.format(d))
}

/** 서울 기준 자정 이후 분 (0–1439) */
export function seoulMinutes(d: Date): number {
  const [h, m] = TIME_FMT.format(d).split(":").map(Number)
  return h * 60 + m
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}
