import { BuildingTile } from "@/components/common/BuildingTile"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { BUILDINGS } from "@/data/buildings"
import { VENUES } from "@/data/restaurants"
import type { BuildingId, VenueId } from "@/domain/types"
import { cn } from "@/lib/utils"

const W = 360
const H = 220

/** 직원식당이 있는 건물. 사인물처럼 primary 테두리로 구분한다. */
const HAS_CAFETERIA = new Set<BuildingId>(["east", "west", "new"])

/**
 * 직원식당이 없는 건물의 테두리: muted-foreground를 72%로 얹는다.
 * 지도 바탕·블록 면 대비가 라이트 3.15:1과 3.34:1, 다크 4.87:1과 4.52:1로 3:1을 넘는다.
 */
const PLAIN_OUTLINE_OPACITY = 0.72

/** 핀을 고르면 함께 강조할 건물 */
const HOME: Record<VenueId, BuildingId> = {
  east: "east",
  west: "west",
  new: "new",
  boxLunch: "east",
}

/** 핀 순서(탭 순서): 동관 → 서관 → 신관 → 도시락 */
const ORDER: VenueId[] = ["east", "west", "new", "boxLunch"]

const pct = (v: number, of: number) => `${(v / of) * 100}%`

/**
 * 캠퍼스 모식도와 식당 핀. 건물 블록은 `BUILDINGS`에서 그리고,
 * 색은 모두 토큰 변수라 다크 모드에서 함께 바뀐다.
 * 핀은 HTML 토글 버튼(44px)을 SVG 위에 백분율로 겹쳐 둔다.
 */
export function CampusMap({
  selected,
  onSelect,
}: {
  selected: VenueId | null
  onSelect: (id: VenueId) => void
}) {
  const lit = selected ? HOME[selected] : null

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative aspect-[360/220] w-full overflow-hidden rounded-2xl border border-border bg-background">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          aria-hidden
          className="absolute inset-0 size-full"
        >
          {Object.values(BUILDINGS).map(({ id, name, block: b }) => {
            const main = HAS_CAFETERIA.has(id)
            const on = lit === id
            return (
              <g key={id}>
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={b.h}
                  rx={6}
                  fill={on ? "var(--accent)" : "var(--card)"}
                  stroke={main ? "var(--primary)" : "var(--muted-foreground)"}
                  strokeOpacity={main ? 1 : PLAIN_OUTLINE_OPACITY}
                  strokeWidth={on ? 2 : main ? 1.25 : 1}
                />
                {main ? (
                  <text
                    x={b.x + 11}
                    y={b.y + 22}
                    fill="var(--primary)"
                    fontSize={14}
                    fontWeight={700}
                    letterSpacing="-0.02em"
                  >
                    {name}
                  </text>
                ) : (
                  <text
                    x={b.x + b.w / 2}
                    y={b.y + b.h / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="var(--muted-foreground)"
                    fontSize={12.5}
                    fontWeight={600}
                    letterSpacing="-0.02em"
                  >
                    {name}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        <ToggleGroup
          aria-label="식당 위치"
          value={selected ? [selected] : []}
          onValueChange={(v) => {
            const next = v[0] as VenueId | undefined
            if (next) onSelect(next)
          }}
          className="absolute inset-0 block size-full"
        >
          {ORDER.map((id) => {
            const v = VENUES[id]
            const estimated = v.location === "estimated"
            return (
              <ToggleGroupItem
                key={id}
                value={id}
                aria-label={`${v.name} 위치`}
                style={{ left: pct(v.map.x, W), top: pct(v.map.y, H) }}
                className="group/pin absolute size-11 min-w-0 -translate-1/2 rounded-xl p-0 hover:bg-transparent aria-pressed:bg-transparent md:size-12"
              >
                <BuildingTile
                  glyph={v.short}
                  className={cn(
                    "size-[1.875rem] rounded-[7px] border-[1.5px] border-primary bg-card text-sm text-primary transition-colors md:size-9 md:rounded-lg md:text-base",
                    estimated && "border-dashed",
                    "group-hover/pin:bg-accent",
                    "group-aria-pressed/pin:border-solid group-aria-pressed/pin:bg-primary group-aria-pressed/pin:text-primary-foreground group-aria-pressed/pin:ring-4 group-aria-pressed/pin:ring-primary/20"
                  )}
                />
                {estimated && (
                  <span
                    aria-hidden
                    className="absolute top-1/2 left-full ml-0.5 -translate-y-1/2 text-[0.6875rem] font-semibold text-primary"
                  >
                    추정
                  </span>
                )}
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
      </div>
      <figcaption className="text-[0.6875rem] text-muted-foreground">
        단순화한 배치도예요. 건물 배치는 추정이에요
      </figcaption>
    </figure>
  )
}
