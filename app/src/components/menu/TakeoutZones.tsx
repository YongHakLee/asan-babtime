import { TakeoutHours } from "@/components/common/TakeoutHours"
import type { TakeoutZone, ZoneId } from "@/domain/types"
import { getMenuForDate } from "@/lib/menu"
import { cn } from "@/lib/utils"

/** 실제 테이크아웃 존 색. 존 표시에만 쓴다. */
const ZONE_TONE: Record<ZoneId, string> = {
  green: "bg-zone-green-bg text-zone-green-fg",
  orange: "bg-zone-orange-bg text-zone-orange-fg",
  purple: "bg-zone-purple-bg text-zone-purple-fg",
}

function Zone({ zone }: { zone: TakeoutZone }) {
  return (
    <section aria-labelledby={`zone-${zone.zone}`} className="min-w-0">
      <h3 id={`zone-${zone.zone}`} className="flex items-center gap-2.5">
        <span
          className={cn(
            "rounded-md px-2 py-1 text-[0.8125rem] leading-none font-bold",
            ZONE_TONE[zone.zone]
          )}
        >
          {zone.name}
        </span>
        <span className="text-[0.8125rem] font-medium text-muted-foreground">
          {`${zone.pick}가지 골라 담기`}
        </span>
      </h3>
      <dl className="mt-2 flex flex-col divide-y divide-border">
        {zone.groups.map((g) => (
          <div
            key={g.label}
            className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 py-2.5"
          >
            <dt className="flex flex-col gap-0.5 pt-px text-[0.8125rem] leading-snug font-semibold">
              {g.label}
              {g.eastOnly && (
                <span className="text-[0.6875rem] font-medium text-primary">
                  동관 전용
                </span>
              )}
            </dt>
            <dd className="flex flex-col gap-1 text-sm leading-snug text-foreground/80">
              {g.items.map((item) => (
                <span key={item} className="wrap-break-word">
                  {item}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** 존별 테이크아웃 품목과 운영시간 */
export function TakeoutZones({ date }: { date: Date }) {
  const { zones } = getMenuForDate(date).takeout

  return (
    <div className="flex flex-col gap-7">
      <div className="grid gap-7 md:grid-cols-3 md:gap-8">
        {zones.map((z) => (
          <Zone key={z.zone} zone={z} />
        ))}
      </div>
      <TakeoutHours />
    </div>
  )
}
