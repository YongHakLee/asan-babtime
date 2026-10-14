import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { InformationCircleIcon } from "@hugeicons/core-free-icons"

import { BuildingTile } from "@/components/common/BuildingTile"
import { TakeoutHours } from "@/components/common/TakeoutHours"
import { CampusMap } from "@/components/map/CampusMap"
import { HoursTable } from "@/components/map/HoursTable"
import { VENUES } from "@/data/restaurants"
import type { VenueId } from "@/domain/types"
import { useClock } from "@/hooks/useClock"
import { DAY_KIND_LABEL, dayKind } from "@/lib/hours"

const VENUE_ORDER: VenueId[] = ["east", "westNew", "boxLunch"]

/** 고른 식당의 건물·층·찾아가는 법 */
function VenueDetails({ id }: { id: VenueId }) {
  const v = VENUES[id]

  return (
    <div
      aria-live="polite"
      className="grid grid-cols-[2.125rem_minmax(0,1fr)] gap-x-3 border-b border-border py-4"
    >
      <BuildingTile
        glyph={v.short}
        tone={id === "boxLunch" ? "soft" : "solid"}
      />
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-[0.9375rem] leading-snug font-semibold tracking-tight">
          {v.name}
        </h2>
        <p className="text-[0.8125rem] font-semibold text-primary">
          {`${v.building} ${v.floor}`}
        </p>
        <p className="text-sm leading-snug text-foreground/80">
          {v.directions}
        </p>
        {v.location === "estimated" && (
          <p className="mt-1 flex items-start gap-1.5 text-[0.8125rem] leading-snug text-muted-foreground">
            <HugeiconsIcon
              icon={InformationCircleIcon}
              aria-hidden
              className="mt-px size-4 shrink-0"
            />
            추정 위치예요. 현장 안내와 다를 수 있어요
          </p>
        )}
      </div>
    </div>
  )
}

export default function MapPage() {
  const { now } = useClock()
  const [selected, setSelected] = useState<VenueId>("east")

  return (
    <main className="flex flex-1 flex-col">
      <section
        aria-labelledby="map-title"
        className="bg-deep px-4 pt-4 pb-[2.125rem] text-deep-foreground"
      >
        <div className="mx-auto flex max-w-5xl items-baseline justify-between gap-3">
          <h1
            id="map-title"
            className="text-[1.5625rem] leading-tight font-bold tracking-[-0.035em]"
          >
            지도
          </h1>
          <p className="text-xs text-deep-foreground/70">
            식당 위치와 운영시간
          </p>
        </div>
      </section>

      <div className="relative -mt-[18px] flex flex-1 flex-col rounded-t-3xl bg-card px-4 pt-5 pb-8">
        <div className="mx-auto grid w-full max-w-5xl gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-12">
          <section aria-label="식당 배치도" className="flex flex-col">
            <div className="flex flex-col md:sticky md:top-6">
              <CampusMap selected={selected} onSelect={setSelected} />
              <VenueDetails id={selected} />
            </div>
          </section>

          <section aria-labelledby="hours-title" className="flex flex-col">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="hours-title" className="text-lg font-bold tracking-tight">
                운영시간
              </h2>
              <p className="text-xs text-muted-foreground">
                {`오늘은 ${DAY_KIND_LABEL[dayKind(now)]} 시간표예요`}
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-6">
              {VENUE_ORDER.map((id) => (
                <HoursTable key={id} venue={id} now={now} />
              ))}
              <TakeoutHours />
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
