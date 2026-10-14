import type { MealKey, ServiceStatus } from "@/domain/types"
import { formatMinutes, seoulMinutes } from "@/lib/format"
import { MEAL_LABEL } from "@/lib/recommend"

const hm = (d: Date) => formatMinutes(seoulMinutes(d))

/** 90 → "1시간 30분" */
function duration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}분`
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`
}

/**
 * 배식 시간 막대. 배식 중이면 지난 만큼 primary로 채우고 지금 위치에
 * 브랜드 오렌지 표시선을 둔다. 배식 전이면 남은 시간을 글로만 알린다.
 */
export function ServiceStrip({
  meal,
  status,
}: {
  meal: MealKey
  status: ServiceStatus
}) {
  const label = MEAL_LABEL[meal]

  if (status.kind !== "open") {
    const text =
      status.kind === "before"
        ? `${label} 시작까지 ${duration(status.minutesUntil)} 남았어요`
        : status.kind === "ended"
          ? `오늘 ${label} 배식은 끝났어요`
          : `오늘은 ${label} 배식이 없어요`
    return <p className="text-xs text-muted-foreground">{text}</p>
  }

  const total = status.closesAt.getTime() - status.opensAt.getTime()
  const left = Math.min(total, status.minutesLeft * 60_000)
  const pct = `${Math.round(((total - left) / total) * 1000) / 10}%`

  return (
    <div className="flex items-center gap-2.5 text-xs text-muted-foreground tabular-nums">
      <span>
        {label} {hm(status.opensAt)}
      </span>
      <div
        aria-hidden
        data-slot="service-track"
        className="relative h-1 flex-1 rounded-full bg-primary/15"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
          style={{ width: pct }}
        />
        <div
          data-slot="now-tick"
          className="absolute -top-1 h-3 w-0.5 -translate-x-1/2 rounded-full bg-brand-orange"
          style={{ left: pct }}
        />
      </div>
      <span>{hm(status.closesAt)}</span>
      <span className="sr-only">
        {`지금 ${label} 배식 중이에요. ${duration(status.minutesLeft)} 남았어요.`}
      </span>
    </div>
  )
}
