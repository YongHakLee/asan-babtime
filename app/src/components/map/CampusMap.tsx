import { BuildingTile } from "@/components/common/BuildingTile"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { VENUES } from "@/data/restaurants"
import type { VenueId } from "@/domain/types"
import { cn } from "@/lib/utils"

const W = 360
const H = 220

type BlockKey = "new" | "link" | "west" | "east" | "annex"

/**
 * 실제 배치를 단순화한 블록(viewBox 360×220 좌표).
 * 서관·신관은 서쪽에 위아래로 붙어 있고 연결 통로로 이어지며,
 * 동관은 동쪽, 별관은 남쪽에 둔다.
 */
const BLOCKS: {
  key: BlockKey
  name?: string
  x: number
  y: number
  w: number
  h: number
  /** 이름을 블록 가운데에 둘지(작은 블록), 왼쪽 위에 둘지 */
  center?: boolean
}[] = [
  { key: "new", name: "신관", x: 20, y: 14, w: 128, h: 56 },
  { key: "link", x: 76, y: 70, w: 28, h: 56 },
  { key: "west", name: "서관", x: 20, y: 126, w: 128, h: 58 },
  { key: "east", name: "동관", x: 196, y: 14, w: 144, h: 170 },
  { key: "annex", name: "별관", x: 124, y: 194, w: 112, h: 20, center: true },
]

/** 핀을 고르면 함께 강조할 블록 */
const AREAS: Record<VenueId, BlockKey[]> = {
  east: ["east"],
  westNew: ["new", "link", "west"],
  boxLunch: ["east"],
}

const ORDER: VenueId[] = ["westNew", "east", "boxLunch"]

const pct = (v: number, of: number) => `${(v / of) * 100}%`

/**
 * 캠퍼스 모식도와 식당 핀. 색은 모두 토큰 변수라 다크 모드에서 함께 바뀐다.
 * 핀은 HTML 토글 버튼(44px)을 SVG 위에 백분율로 겹쳐 둔다.
 */
export function CampusMap({
  selected,
  onSelect,
}: {
  selected: VenueId | null
  onSelect: (id: VenueId) => void
}) {
  const lit = new Set(selected ? AREAS[selected] : [])

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative aspect-[360/220] w-full overflow-hidden rounded-2xl border border-border bg-background">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          aria-hidden
          className="absolute inset-0 size-full"
        >
          {BLOCKS.map((b) => (
            <g key={b.key}>
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx={b.key === "link" ? 0 : 6}
                fill={lit.has(b.key) ? "var(--accent)" : "var(--card)"}
                stroke="var(--primary)"
                strokeWidth={lit.has(b.key) ? 2 : 1.25}
                strokeOpacity={lit.has(b.key) ? 1 : 0.55}
              />
              {b.name && (
                <text
                  x={b.center ? b.x + b.w / 2 : b.x + 11}
                  y={b.center ? b.y + b.h / 2 : b.y + 22}
                  textAnchor={b.center ? "middle" : "start"}
                  dominantBaseline={b.center ? "central" : "auto"}
                  fill="var(--primary)"
                  fontSize={b.center ? 11 : 14}
                  fontWeight={700}
                  letterSpacing="-0.02em"
                >
                  {b.name}
                </text>
              )}
            </g>
          ))}
          {/* 통로 양 끝을 열어 이어진 공간으로 보이게 한다 */}
          {(["new", "west"] as const).map((k) => {
            const link = BLOCKS.find((b) => b.key === "link")!
            const y = k === "new" ? link.y : link.y + link.h
            return (
              <line
                key={k}
                x1={link.x + 1.5}
                x2={link.x + link.w - 1.5}
                y1={y}
                y2={y}
                stroke={lit.has("link") ? "var(--accent)" : "var(--card)"}
                strokeWidth={2.5}
              />
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
        단순화한 배치도
      </figcaption>
    </figure>
  )
}
