import type { ReactNode } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { FavouriteIcon } from "@hugeicons/core-free-icons"

import { Toggle } from "@/components/ui/toggle"
import type { Allergen, MenuItem } from "@/domain/types"
import { usePrefs } from "@/hooks/usePrefs"
import { cn } from "@/lib/utils"

const ALLERGEN_LABEL: Record<Allergen, string> = {
  egg: "달걀",
  milk: "우유",
  wheat: "밀",
  soy: "대두",
  peanut: "땅콩",
  shellfish: "갑각류",
  fish: "생선",
  pork: "돼지고기",
  beef: "쇠고기",
  chicken: "닭고기",
}

/** "알레르기 예시: 닭고기, 대두, 달걀, 약 720 kcal 예시" — 값은 모의 예시 */
export function exampleFacts(item: MenuItem): string | null {
  const parts: string[] = []
  if (item.allergens?.length) {
    parts.push(
      `알레르기 예시: ${item.allergens.map((a) => ALLERGEN_LABEL[a]).join(", ")}`
    )
  }
  if (item.kcal) parts.push(`약 ${item.kcal} kcal 예시`)
  return parts.length ? parts.join(", ") : null
}

/**
 * 메뉴 품목 한 줄. 주메뉴는 굵게, 반찬은 한 단계 작게.
 * 오른쪽 하트는 즐겨찾기 토글(aria-pressed)이며 개인 설정에 저장된다.
 */
export function MenuItemRow({
  item,
  main = false,
  children,
}: {
  item: MenuItem
  main?: boolean
  children?: ReactNode
}) {
  const { favorites, toggleFavorite } = usePrefs()
  const on = favorites.includes(item.name)

  return (
    <li
      aria-label={item.name}
      className={cn(
        "flex justify-between gap-1",
        main ? "items-start pb-1" : "items-center"
      )}
    >
      <div className={cn("min-w-0", main && "pt-2.5")}>
        <p
          className={cn(
            "leading-snug wrap-break-word",
            main
              ? "text-[0.9375rem] font-semibold tracking-tight"
              : "text-sm text-foreground/80"
          )}
        >
          {item.name}
        </p>
        {children}
      </div>
      <Toggle
        aria-label="즐겨찾기"
        pressed={on}
        onPressedChange={() => toggleFavorite(item.name)}
        className={cn(
          "-mr-3.5 size-11 min-w-11 shrink-0 px-0 text-muted-foreground/60 hover:bg-transparent hover:text-primary aria-pressed:bg-transparent aria-pressed:text-primary [&_svg]:transition-colors aria-pressed:[&_svg]:fill-current motion-reduce:[&_svg]:transition-none",
          !main &&
            "text-muted-foreground/45 [&_svg:not([class*='size-'])]:size-[0.9375rem]"
        )}
      >
        <HugeiconsIcon icon={FavouriteIcon} strokeWidth={1.8} />
      </Toggle>
    </li>
  )
}
