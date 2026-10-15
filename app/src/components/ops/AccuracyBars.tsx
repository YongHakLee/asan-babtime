import { useState } from "react"

import type { AccuracyBin } from "@/lib/accuracy"
import { cn } from "@/lib/utils"

const GRID = [0, 50, 100]

/** 칸 수치 한 줄. 막대 버튼의 이름과 아래 안내 줄이 같은 문장을 쓴다. */
function binReadout(b: AccuracyBin): string {
  const range = `${b.start}–${b.end}`
  if (b.matchPct === null) return `${range} 입력 없음`
  return `${range} 일치 ${b.matchPct}%(${b.total}건 중 ${b.match}건), 모델이 낮게 봄 ${b.under}건${b.lowSample ? ", 표본이 적어요" : ""}`
}

/**
 * 30분 칸 등급 일치율 막대(한 계열이라 범례 없음). y축은 0~100%,
 * 기간 전체 일치율(average)을 점선 기준선과 직접 라벨로 둔다.
 * 표본이 적은 칸은 막대를 옅게 하고, 칸을 누르거나 마우스를 올리거나
 * 초점을 옮기면 그래프 아래 고정 안내 줄에 그 칸의 수치가 나온다.
 */
export function AccuracyBars({
  bins,
  average,
}: {
  bins: AccuracyBin[]
  average: number
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const current = bins.find((b) => b.start === selected)

  return (
    <div data-slot="accuracy-bars" className="flex flex-col gap-3">
      <div className="flex gap-2 pt-2">
        <div
          aria-hidden
          className="relative h-40 w-8 shrink-0 text-[0.6875rem] leading-none text-muted-foreground tabular-nums"
        >
          {GRID.map((v) => (
            <span
              key={v}
              className="absolute right-0 translate-y-1/2"
              style={{ bottom: `${v}%` }}
            >
              {`${v}%`}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-40">
            {GRID.map((v) => (
              <span
                key={v}
                aria-hidden
                className="absolute inset-x-0 border-t border-border"
                style={{ bottom: `${v}%` }}
              />
            ))}
            <div className="absolute inset-0 flex gap-0.5">
              {bins.map((b) => {
                const label = binReadout(b)
                const pick = () => setSelected(b.start)
                return (
                  <button
                    key={b.start}
                    type="button"
                    aria-label={label}
                    onPointerEnter={pick}
                    onFocus={pick}
                    onClick={pick}
                    className={cn(
                      "flex h-full min-w-0 flex-1 items-end justify-center rounded-t-[4px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      b.start === selected && "bg-muted"
                    )}
                  >
                    {b.matchPct !== null && (
                      <span
                        className={cn(
                          "block w-full max-w-6 rounded-t-[4px] bg-primary",
                          b.lowSample && "opacity-40"
                        )}
                        style={{ height: `max(2px, ${b.matchPct}%)` }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted-foreground/60"
              style={{ bottom: `${average}%` }}
            />
          </div>
          <div aria-hidden className="flex gap-0.5 pt-1">
            {bins.map((b) => (
              <span
                key={b.start}
                className="relative h-3.5 min-w-0 flex-1 text-[0.6875rem] leading-none text-muted-foreground tabular-nums"
              >
                {b.start.endsWith(":00") && (
                  <span className="absolute top-0 left-0 whitespace-nowrap">
                    {`${Number(b.start.slice(0, 2))}시`}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
        {/* 기준선 직접 라벨: 막대와 겹치지 않게 선 오른쪽 끝 바깥에 둔다 */}
        <div aria-hidden className="relative h-40 w-14 shrink-0">
          <span
            className="absolute left-0 translate-y-1/2 text-xs leading-none whitespace-nowrap text-muted-foreground tabular-nums"
            style={{ bottom: `${average}%` }}
          >
            {`평균 ${average}%`}
          </span>
        </div>
      </div>
      <p
        aria-live="polite"
        className="min-h-[2lh] text-[0.8125rem] leading-snug text-pretty tabular-nums"
      >
        {current ? binReadout(current) : "막대를 누르면 시간대별 수치가 보여요"}
      </p>
    </div>
  )
}
