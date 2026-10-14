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
 * 10분 칸 예상 대기 막대(한 계열 스파크라인). 지난 칸은 꽉 찬 primary,
 * 지금 칸은 brand-orange, 이후 칸(예측)은 primary 테두리에 옅은 채움.
 * 테두리가 카드 대비 3:1을 넘어 막대 모양이 보이고, 채움 차이로 지난 칸과
 * 구분된다. 값은 막대마다 툴팁과
 * 화면 낭독용 목록으로 함께 제공해 색이나 마우스에 기대지 않는다.
 */
export function ForecastBars({
  points,
  size = "sm",
}: {
  points: ForecastPoint[]
  /** sm: 홈 식당 줄 안의 작은 막대 · lg: 식당 상세의 큰 막대(정시 눈금 포함) */
  size?: "sm" | "lg"
}) {
  if (points.length === 0) return null
  const scale = Math.max(MIN_SCALE_MINUTES, ...points.map((p) => p.waitMinutes))
  const nowIdx = points.findIndex((p) => p.isNow)
  const lg = size === "lg"

  return (
    <div
      data-slot="forecast-bars"
      data-size={size}
      className={cn(lg ? "w-full" : "mt-2.5 max-w-80")}
    >
      <div
        aria-hidden
        className={cn(
          "flex items-end gap-0.5",
          lg ? "h-16 border-b border-border" : "h-[1.375rem]"
        )}
      >
        {points.map((p, i) => (
          <Tooltip key={p.time.getTime()}>
            <TooltipTrigger
              render={<span />}
              className="group flex h-full min-w-0 flex-1 items-end"
            >
              <span
                className={cn(
                  "block w-full transition-opacity",
                  lg ? "rounded-t-[4px]" : "rounded-t-[2px]",
                  "group-hover:opacity-70 motion-reduce:transition-none",
                  p.isNow
                    ? "bg-brand-orange"
                    : nowIdx === -1 || i < nowIdx
                      ? "bg-primary"
                      : "border border-b-0 border-primary bg-primary/15"
                )}
                style={{
                  height: `max(3px, ${Math.round((p.waitMinutes / scale) * 100)}%)`,
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
      {lg && (
        <div aria-hidden className="flex gap-0.5 pt-1">
          {points.map((p) => {
            const m = seoulMinutes(p.time)
            return (
              <span
                key={p.time.getTime()}
                className="relative h-3.5 min-w-0 flex-1 text-[0.6875rem] leading-none text-muted-foreground tabular-nums"
              >
                {m % 60 === 0 && (
                  <span className="absolute top-0 left-0 whitespace-nowrap">
                    {`${m / 60}시`}
                  </span>
                )}
              </span>
            )
          })}
        </div>
      )}
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
