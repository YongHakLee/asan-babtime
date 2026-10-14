import { useId } from "react"

import { BuildingTile } from "@/components/common/BuildingTile"
import { TAKEOUT_HOURS, VENUES } from "@/data/restaurants"
import { cn } from "@/lib/utils"

/** 직원식당별 테이크아웃 운영시간 (메뉴의 테이크아웃 탭, 지도 화면) */
export function TakeoutHours({ className }: { className?: string }) {
  const id = useId()

  return (
    <section
      aria-labelledby={id}
      className={cn("rounded-2xl bg-accent px-4 py-3.5", className)}
    >
      <h3 id={id} className="text-[0.8125rem] font-semibold">
        테이크아웃 운영시간
      </h3>
      <dl className="mt-2.5 flex flex-col gap-2 text-[0.8125rem]">
        {(["east", "westNew"] as const).map((hall) => (
          <div key={hall} className="flex items-start gap-2.5">
            <dt className="flex w-24 shrink-0 items-center gap-2 font-medium">
              <BuildingTile
                glyph={VENUES[hall].short}
                className="size-5 rounded-[5px] text-[0.6875rem]"
              />
              {VENUES[hall].label}
            </dt>
            <dd className="flex flex-col text-muted-foreground tabular-nums">
              {TAKEOUT_HOURS[hall].split(", ").map((line) => (
                <span key={line}>{line}</span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
