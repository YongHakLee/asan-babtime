import { cn } from "@/lib/utils"

export type BuildingGlyph = "동" | "서" | "신" | "도"

/**
 * 병원 길안내 사인물의 건물 한 글자 타일.
 * solid: 직원식당 행 · soft: 도시락처럼 보조 항목 · inverse: 딥 그린 위(홈 상단).
 * 글자는 장식이므로 읽지 않게 하고, 이름은 곁의 글이 맡는다.
 */
export function BuildingTile({
  glyph,
  tone = "solid",
  className,
}: {
  glyph: BuildingGlyph
  tone?: "solid" | "soft" | "inverse"
  className?: string
}) {
  return (
    <span
      aria-hidden
      data-slot="building-tile"
      className={cn(
        "grid size-[2.125rem] shrink-0 place-items-center rounded-lg text-base leading-none font-extrabold select-none",
        tone === "solid" && "bg-primary text-primary-foreground",
        tone === "soft" && "bg-accent text-[0.9375rem] text-primary",
        tone === "inverse" && "bg-deep-foreground text-deep",
        className
      )}
    >
      {glyph}
    </span>
  )
}
