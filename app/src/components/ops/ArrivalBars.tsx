import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ArrivalSlot } from "@/lib/ops"
import { cn } from "@/lib/utils"

const people = (n: number) => `약 ${n.toLocaleString("ko-KR")}명`

/**
 * 10분 칸 입장 추정 막대(식당 하나, 한 계열). ForecastBars와 같은 문법:
 * 지난 칸은 꽉 찬 primary, 지금 칸은 brand-orange, 이후 칸(예측)은 primary
 * 테두리에 옅은 채움. 세 식당이 같은 세로 눈금(scale)을 써서 크기를 비교할 수 있고,
 * 같은 시각에 시작하면 칸 너비도 같아 시간축이 맞는다(widthPct).
 * 값은 막대마다 툴팁과 화면 낭독용 목록으로 함께 제공한다.
 */
export function ArrivalBars({
  label,
  slots,
  scale,
  widthPct = 100,
}: {
  /** 화면 낭독용 목록 이름 */
  label: string
  slots: ArrivalSlot[]
  scale: number
  widthPct?: number
}) {
  return (
    <div data-slot="arrival-bars" style={{ width: `${widthPct}%` }}>
      <div aria-hidden className="flex h-14 items-end gap-0.5 border-b border-border">
        {slots.map((s) => (
          <Tooltip key={s.time}>
            <TooltipTrigger
              render={<span />}
              className="group flex h-full min-w-0 flex-1 items-end"
            >
              <span
                className={cn(
                  "block w-full rounded-t-[3px] transition-opacity group-hover:opacity-70 motion-reduce:transition-none",
                  s.now
                    ? "bg-brand-orange"
                    : s.future
                      ? "border border-b-0 border-primary bg-primary/15"
                      : "bg-primary"
                )}
                style={{
                  height: `max(2px, ${Math.round((s.count / scale) * 100)}%)`,
                }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <span className="font-semibold">{people(s.count)}</span>
              <span className="opacity-70">
                {s.time}
                {s.now ? " 지금" : s.future ? " 예측" : ""}
              </span>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div aria-hidden className="flex gap-0.5 pt-1">
        {slots.map((s) => (
          <span
            key={s.time}
            className="relative h-3.5 min-w-0 flex-1 text-[0.6875rem] leading-none text-muted-foreground tabular-nums"
          >
            {s.time.endsWith(":00") && (
              <span className="absolute top-0 left-0 whitespace-nowrap">
                {`${Number(s.time.slice(0, 2))}시`}
              </span>
            )}
          </span>
        ))}
      </div>
      <ol aria-label={label} className="sr-only">
        {slots.map((s) => (
          <li key={s.time}>
            {`${s.time}${s.now ? "(지금)" : s.future ? "(예측)" : ""} ${people(s.count)}`}
          </li>
        ))}
      </ol>
    </div>
  )
}

/** 막대 세 종류를 한 번만 설명하는 범례 */
export function ArrivalLegend() {
  const items = [
    { label: "지난 구간", swatch: "bg-primary" },
    { label: "지금", swatch: "bg-brand-orange" },
    { label: "예측", swatch: "border border-primary bg-primary/15" },
  ]
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span aria-hidden className={cn("size-2.5 rounded-[2px]", i.swatch)} />
          {i.label}
        </li>
      ))}
    </ul>
  )
}
