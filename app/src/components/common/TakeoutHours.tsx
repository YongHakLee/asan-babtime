import { useId } from "react"

import { BuildingTile } from "@/components/common/BuildingTile"
import { MENU_GROUPS, TAKEOUT_HOURS, VENUES } from "@/data/restaurants"
import { cn } from "@/lib/utils"

/** 테이크아웃 매장(동관 / 서관·신관). 매장 키는 메뉴 묶음 이름과 같다 */
const STORES = Object.keys(TAKEOUT_HOURS) as (keyof typeof TAKEOUT_HOURS)[]

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
        {STORES.map((store) => (
          <div key={store} className="flex items-start gap-2.5">
            <dt className="flex w-28 shrink-0 items-center gap-2 font-medium">
              <span className="flex shrink-0 gap-0.5">
                {MENU_GROUPS[store].venues.map((v) => (
                  <BuildingTile
                    key={v}
                    glyph={VENUES[v].short}
                    className="size-5 rounded-[5px] text-[0.6875rem]"
                  />
                ))}
              </span>
              {MENU_GROUPS[store].label}
            </dt>
            <dd className="flex flex-col text-muted-foreground tabular-nums">
              {TAKEOUT_HOURS[store].split(", ").map((line) => (
                <span key={line}>{line}</span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
