import { waitText } from "@/components/common/StatusText"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatMinutes, seoulMinutes } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface ForecastPoint {
  time: Date
  waitMinutes: number
  isNow: boolean
}

/** 막대 높이의 기준 상한. 대기가 짧은 날에도 막대가 과장되지 않게 한다. */
const MIN_SCALE_MINUTES = 5

const hm = (d: Date) => formatMinutes(seoulMinutes(d))

/**
 * 10분 칸 예상 대기 막대(한 계열 스파크라인). 지난 칸은 primary,
 * 지금 칸은 brand-orange, 이후 칸은 옅은 primary. 값은 막대마다 툴팁과
 * 화면 낭독용 목록으로 함께 제공해 색이나 마우스에 기대지 않는다.
 */
export function ForecastBars({ points }: { points: ForecastPoint[] }) {
  if (points.length === 0) return null
  const scale = Math.max(MIN_SCALE_MINUTES, ...points.map((p) => p.waitMinutes))
  const nowIdx = points.findIndex((p) => p.isNow)

  return (
    <div data-slot="forecast-bars" className="mt-2.5 max-w-80">
      <div aria-hidden className="flex h-[1.375rem] items-end gap-0.5">
        {points.map((p, i) => (
          <Tooltip key={p.time.getTime()}>
            <TooltipTrigger
              render={<span />}
              className="group flex h-full min-w-0 flex-1 items-end"
            >
              <span
                className={cn(
                  "block w-full rounded-t-[2px] transition-opacity group-hover:opacity-70 motion-reduce:transition-none",
                  p.isNow
                    ? "bg-brand-orange"
                    : nowIdx === -1 || i < nowIdx
                      ? "bg-primary"
                      : "bg-primary/25"
                )}
                style={{
                  height: `max(2px, ${Math.round((p.waitMinutes / scale) * 100)}%)`,
                }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <span className="font-semibold">{waitText(p.waitMinutes)}</span>
              <span className="opacity-70">
                {hm(p.time)}
                {p.isNow && " 지금"}
              </span>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <ol aria-label="10분 단위 예상 대기" className="sr-only">
        {points.map((p) => (
          <li key={p.time.getTime()}>
            {`${hm(p.time)}${p.isNow ? "(지금)" : ""} ${waitText(p.waitMinutes)}`}
          </li>
        ))}
      </ol>
    </div>
  )
}
