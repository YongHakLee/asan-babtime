import { useEffect, useRef, useState } from "react"

import { waitText } from "@/components/common/StatusText"
import { formatMinutes } from "@/lib/format"
import type { PatternRow } from "@/lib/pattern"
import { LEVEL_LABEL, type CongestionLevel } from "@/lib/queue"
import { cn } from "@/lib/utils"

/** 칸 안 단계 약자. 색에 기대지 않도록 모든 칸에 쓴다. */
const ABBR: Record<CongestionLevel, string> = {
  ok: "여",
  mid: "보",
  queue: "줄",
  busy: "혼",
}

/** 상태색을 카드에 섞은 면(design/tokens.css `--status-*-tint`). 단계가 오를수록 진하다. */
const TINT: Record<CongestionLevel, string> = {
  ok: "bg-status-ok-tint",
  mid: "bg-status-mid-tint",
  queue: "bg-status-queue-tint",
  busy: "bg-status-busy-tint",
}

const RANGE: Record<CongestionLevel, string> = {
  ok: "2분 미만",
  mid: "2–5분",
  queue: "5–10분",
  busy: "10분 이상",
}

const LEVELS: CongestionLevel[] = ["ok", "mid", "queue", "busy"]

/** 칸이 이보다 좁아지면 표 안에서 가로로 밀어 본다(페이지는 넘치지 않는다). */
const MIN_CELL_REM = 0.9375
const ROW_HEAD_REM = 1.625

/** 가로 스크롤이 생겼는지(좁은 화면의 동관 24칸 등). 생기면 안내 문구를 보이고 키보드로도 밀 수 있게 한다. */
function useOverflowX<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [overflow, setOverflow] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === "undefined") return
    const check = () => setOverflow(el.scrollWidth > el.clientWidth + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, overflow] as const
}

function Swatch({ level }: { level: CongestionLevel }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-5 place-items-center rounded-[4px] text-[0.625rem] leading-none font-semibold text-foreground",
        TINT[level]
      )}
    >
      {ABBR[level]}
    </span>
  )
}

/**
 * 평소 혼잡 패턴 히트맵: 요일 행 × 시각 열 표.
 * 칸은 단계별 면 색과 약자(여/보/줄/혼)로 보이고, 화면 낭독기는 칸마다
 * "혼잡, 약 12분"처럼 읽는다. 열 머리는 정시만 보이게 쓰고 나머지 시각은 낭독용으로만 둔다.
 */
export function PatternGrid({
  rows,
  label,
  today,
}: {
  rows: PatternRow[]
  /** 식당 이름. 캡션은 "{label} 평소 혼잡 패턴" */
  label: string
  /** 강조할 요일 날짜(YYYY-MM-DD). 저장 주간 안의 같은 요일 */
  today?: string
}) {
  const [scroller, overflow] = useOverflowX<HTMLDivElement>()
  if (rows.length === 0) return null
  // 요일마다 배식 창 길이가 달라도(동관 일요일은 14:00까지) 같은 열에 맞춘다
  const times = [...new Set(rows.flatMap((r) => r.slots.map((s) => s.time)))].sort()
  const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
  const step = times.length > 1 ? mins(times[1]) - mins(times[0]) : 10
  const end = formatMinutes(mins(times.at(-1)!) + step)

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={scroller}
        tabIndex={overflow ? 0 : undefined}
        aria-label={overflow ? `${label} 평소 혼잡 패턴 표` : undefined}
        role={overflow ? "region" : undefined}
        className="overflow-x-auto rounded-sm pb-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <table
          className="w-full table-fixed border-separate border-spacing-0.5"
          style={{
            minWidth: `calc(${ROW_HEAD_REM}rem + ${times.length} * (${MIN_CELL_REM}rem + 2px))`,
          }}
        >
          <caption className="sr-only">{`${label} 평소 혼잡 패턴`}</caption>
          <colgroup>
            <col style={{ width: `${ROW_HEAD_REM}rem` }} />
            {times.map((t) => (
              <col key={t} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <td className="sticky left-0 bg-popover" />
              {times.map((t) => {
                const onHour = t.endsWith(":00")
                return (
                  <th
                    key={t}
                    scope="col"
                    className="relative h-4 p-0 text-left align-bottom font-normal"
                  >
                    {onHour && (
                      <span
                        aria-hidden
                        className="absolute bottom-0.5 left-0 text-[0.6875rem] leading-none whitespace-nowrap text-muted-foreground tabular-nums"
                      >
                        {`${Number(t.slice(0, 2))}시`}
                      </span>
                    )}
                    <span className="sr-only">{t}</span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isToday = r.date === today
              const byTime = new Map(r.slots.map((s) => [s.time, s]))
              return (
                <tr key={r.date}>
                  <th
                    scope="row"
                    className={cn(
                      // 가로로 밀어도 요일이 보이게 왼쪽에 붙인다
                      "sticky left-0 bg-popover pr-1.5 text-left text-xs font-medium whitespace-nowrap",
                      isToday ? "font-bold text-primary" : "text-muted-foreground"
                    )}
                  >
                    {r.dayLabel}
                    {isToday && <span className="sr-only">(오늘)</span>}
                  </th>
                  {times.map((t) => {
                    const s = byTime.get(t)
                    if (!s)
                      return (
                        <td key={t} className="h-6 p-0">
                          <span className="sr-only">운영 안 함</span>
                        </td>
                      )
                    const text = `${LEVEL_LABEL[s.level]}, ${waitText(s.waitMinutes)}`
                    return (
                      <td
                        key={t}
                        title={`${r.dayLabel} ${t} ${text}`}
                        className={cn(
                          "h-6 rounded-[4px] p-0 text-center text-[0.625rem] leading-none",
                          TINT[s.level],
                          s.level === "ok"
                            ? "text-muted-foreground"
                            : "font-semibold text-foreground"
                        )}
                      >
                        <span aria-hidden>{ABBR[s.level]}</span>
                        <span className="sr-only">{text}</span>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {overflow && (
        <p className="-mt-1 text-xs text-muted-foreground">
          {`표를 옆으로 밀면 ${end}까지 볼 수 있어요`}
        </p>
      )}
      <ul
        aria-label="혼잡 단계"
        className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-muted-foreground"
      >
        {LEVELS.map((l) => (
          <li key={l} className="flex items-center gap-1.5">
            <Swatch level={l} />
            <span>
              <span className="font-medium text-foreground">{LEVEL_LABEL[l]}</span>{" "}
              {RANGE[l]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
