import { useRef, useSyncExternalStore, type Ref } from "react"

import { BuildingTile } from "@/components/common/BuildingTile"
import { exampleFacts, MenuItemRow } from "@/components/menu/MenuItemRow"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { SERVICE_WINDOWS, VENUES } from "@/data/restaurants"
import type { Course, DiningHallId, MealKey } from "@/domain/types"
import { dayKind } from "@/lib/hours"
import { getCourses } from "@/lib/menu"
import { isSoldOut, subscribeOverrides } from "@/lib/override"
import { mockRating } from "@/lib/prefs"
import { cn } from "@/lib/utils"

const LIVE_CORNER = "라이브코너"

/** 그날 그 끼니의 배식 시간들. 운영하지 않으면 빈 배열. */
function hoursOn(hall: DiningHallId, meal: MealKey, date: Date): string[] {
  const kind = dayKind(date)
  return SERVICE_WINDOWS.filter(
    (w) => w.venue === hall && w.meal === meal && w.days.includes(kind)
  ).map((w) => `${w.start}–${w.end}`)
}

function useSoldOut(
  hall: DiningHallId,
  meal: MealKey,
  course: string | undefined,
  date: Date
): boolean {
  return useSyncExternalStore(subscribeOverrides, () =>
    isSoldOut(hall, meal, course, date)
  )
}

function CourseBlock({
  hall,
  meal,
  course,
  date,
  rated,
}: {
  hall: DiningHallId
  meal: MealKey
  course: Course
  date: Date
  rated: boolean
}) {
  const soldOut = useSoldOut(hall, meal, course.label, date)
  const [main, ...sides] = course.items
  const facts = exampleFacts(main)
  const rating = rated ? mockRating(main.name) : null

  return (
    <div className="flex flex-col">
      {(course.label || soldOut) && (
        <p className="flex items-baseline gap-2 pt-1 text-xs font-semibold">
          {course.label && <span className="text-primary">{course.label}</span>}
          {soldOut && <span className="text-status-busy">품절</span>}
        </p>
      )}
      <ul className="flex flex-col">
        <MenuItemRow item={main} main>
          {facts && (
            <p className="mt-1 text-xs leading-snug text-muted-foreground">
              {facts}
            </p>
          )}
          {rating && (
            <p className="mt-1 text-xs font-medium text-primary tabular-nums">
              {`★ ${rating.avg.toFixed(1)} (${rating.count})`}
            </p>
          )}
        </MenuItemRow>
        {sides.map((item) => (
          <MenuItemRow key={item.name} item={item} />
        ))}
      </ul>
    </div>
  )
}

function HallColumn({
  hall,
  meal,
  date,
  headingRef,
  onShowEast,
}: {
  hall: DiningHallId
  meal: MealKey
  date: Date
  headingRef?: Ref<HTMLHeadingElement>
  onShowEast?: () => void
}) {
  const venue = VENUES[hall]
  const hours = hoursOn(hall, meal, date)
  const all = getCourses(date, hall, meal)
  // 운영하지 않는 날에도 서관 라이브코너는 따로 차려진다
  const courses =
    hours.length > 0 ? all : all.filter((c) => c.label?.startsWith(LIVE_CORNER))

  return (
    <section aria-labelledby={`hall-${hall}`} className="min-w-0">
      <h3
        id={`hall-${hall}`}
        ref={headingRef}
        tabIndex={-1}
        className="flex scroll-mt-4 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <BuildingTile
          glyph={venue.short}
          className="size-7 rounded-md text-sm"
        />
        <span className="flex min-w-0 flex-col">
          <span className="text-[0.9375rem] leading-tight font-bold tracking-tight">
            {venue.label}
          </span>
          {hours.length > 0 && (
            <span className="mt-0.5 text-[0.6875rem] leading-none font-medium text-muted-foreground tabular-nums">
              {hours.join(", ")}
            </span>
          )}
        </span>
      </h3>

      {courses.length === 0 ? (
        <Empty className="mt-3 gap-3 rounded-2xl bg-accent px-3 py-6">
          <EmptyHeader>
            <EmptyDescription className="text-[0.8125rem] leading-normal text-foreground/80">
              주말과 공휴일에는 서관·신관 식당을 운영하지 않아요
            </EmptyDescription>
          </EmptyHeader>
          {onShowEast && (
            <EmptyContent>
              <Button variant="outline" size="sm" onClick={onShowEast}>
                동관 메뉴 보기
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {courses.map((course, i) => (
            <div key={course.label ?? i} className="flex flex-col gap-2">
              {i > 0 && <Separator />}
              <CourseBlock
                hall={hall}
                meal={meal}
                course={course}
                date={date}
                rated={i === 0}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/**
 * 직원식당 비교. 중식은 동관과 서관·신관을 두 열로 나란히,
 * 그 밖의 끼니는 동관만 운영하므로 한 열로 보여 준다.
 */
export function HallCompare({ meal, date }: { meal: MealKey; date: Date }) {
  const eastHeading = useRef<HTMLHeadingElement>(null)
  const compare = meal === "lunch"

  const showEast = () => {
    const el = eastHeading.current
    if (!el) return
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches
    el.scrollIntoView?.({
      block: "start",
      behavior: reduce ? "auto" : "smooth",
    })
    el.focus({ preventScroll: true })
  }

  return (
    <div
      className={cn(
        "grid gap-x-4 gap-y-6",
        compare
          ? "grid-cols-2 md:grid-cols-[repeat(2,minmax(0,24rem))] md:gap-x-12"
          : "grid-cols-1 md:max-w-sm"
      )}
    >
      <HallColumn
        hall="east"
        meal={meal}
        date={date}
        headingRef={eastHeading}
      />
      {compare && (
        <HallColumn
          hall="westNew"
          meal={meal}
          date={date}
          onShowEast={showEast}
        />
      )}
    </div>
  )
}
