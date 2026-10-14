import { useMemo, type ReactNode } from "react"
import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { Location01Icon, WalkingIcon } from "@hugeicons/core-free-icons"

import { ForecastBars } from "@/components/common/ForecastBars"
import { PatternGrid } from "@/components/common/PatternGrid"
import { StatusText } from "@/components/common/StatusText"
import { buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { VENUES } from "@/data/restaurants"
import type { DiningHallId, MealKey } from "@/domain/types"
import { useClock } from "@/hooks/useClock"
import { usePrefs } from "@/hooks/usePrefs"
import { useVenueStatus } from "@/hooks/useVenueStatus"
import { seoulWeekdayIndex, seoulWeekdayTime } from "@/lib/format"
import {
  getActiveMeal,
  getNextService,
  getServiceStatus,
  seoulYmd,
} from "@/lib/hours"
import { getCourses, summary } from "@/lib/menu"
import { weeklyPattern } from "@/lib/pattern"
import {
  forecast,
  koreanTime,
  MEAL_LABEL,
  recommendTime,
} from "@/lib/recommend"
import { cn } from "@/lib/utils"
import { walkMinutes } from "@/lib/walk"

const MEALS: MealKey[] = ["breakfast", "lunch", "dinner", "mobile", "lateNight"]
const DAY_MS = 86_400_000
const PATTERN_MEAL: MealKey = "lunch"

/** 저장 주간(2026-10-12 월요일 시작)에서 오늘과 같은 요일의 날짜 */
const storedWeekDate = (now: Date) =>
  `2026-10-${String(12 + seoulWeekdayIndex(now)).padStart(2, "0")}`

function Section({
  title,
  aside,
  children,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** 오늘(진행 중이거나 오늘 남은) 끼니. 없으면 다음 배식 */
function focusMeal(hall: DiningHallId, now: Date) {
  const active = getActiveMeal(hall, now)
  if (active) {
    const s = getServiceStatus(hall, active, now)
    if (s.kind === "open") return { meal: active, opensAt: s.opensAt, today: true }
  }
  const next = getNextService(hall, now)
  if (!next) return null
  return {
    meal: next.meal,
    opensAt: next.opensAt,
    today: seoulYmd(next.opensAt) === seoulYmd(now),
  }
}

/** "내일 중식" · "월요일 중식" */
function laterMealLabel(meal: MealKey, opensAt: Date, now: Date): string {
  const days = Math.round(
    (Date.parse(seoulYmd(opensAt)) - Date.parse(seoulYmd(now))) / DAY_MS
  )
  const day = days === 1 ? "내일" : seoulWeekdayTime(opensAt).split(" ")[0]
  return `${day} ${MEAL_LABEL[meal]}`
}

function TodayForecast({ hall }: { hall: DiningHallId }) {
  const { now } = useClock()
  const { meal, status, level, waitMinutes } = useVenueStatus(hall)
  const focus = focusMeal(hall, now)
  const open = meal !== null && status?.kind === "open"
  const points = focus?.today ? forecast(hall, focus.meal, now) : []
  const servesToday = MEALS.some(
    (m) => getServiceStatus(hall, m, now).kind !== "notToday"
  )

  let note: string | null = null
  if (focus?.today && points.length > 0) {
    const rec = recommendTime(hall, focus.meal, now)
    const quiet = points.every((p) => p.waitMinutes < 2)
    if (!open) note = `${koreanTime(focus.opensAt)}에 배식을 시작해요`
    else if (quiet) note = "배식 내내 바로 드실 수 있을 것으로 보여요"
    else if (rec && rec.getTime() > now.getTime() && waitMinutes >= 3)
      note = `${koreanTime(rec)}부터 한산해질 것으로 보여요`
  }

  return (
    <Section
      title={
        focus?.today ? `오늘 ${MEAL_LABEL[focus.meal]} 예상 대기` : "오늘 예상 대기"
      }
      aside={
        open && <StatusText level={level} waitMinutes={waitMinutes} />
      }
    >
      {points.length > 0 ? (
        <>
          <ForecastBars points={points} size="lg" />
          {note && <p className="text-[0.8125rem] text-foreground">{note}</p>}
        </>
      ) : (
        <p className="text-[0.8125rem] text-muted-foreground">
          {servesToday ? "오늘 배식이 끝났어요" : "오늘은 운영하지 않아요"}
        </p>
      )}
    </Section>
  )
}

function DetailBody({ hall }: { hall: DiningHallId }) {
  const { now } = useClock()
  const { workBuilding } = usePrefs()
  const venue = VENUES[hall]
  const rows = useMemo(() => weeklyPattern(hall, PATTERN_MEAL), [hall])
  const focus = focusMeal(hall, now)
  const menu = focus ? summary(getCourses(focus.opensAt, hall, focus.meal), 3) : ""
  const menuTitle = focus
    ? focus.today
      ? `오늘 ${MEAL_LABEL[focus.meal]} 메뉴`
      : `${laterMealLabel(focus.meal, focus.opensAt, now)} 메뉴`
    : "메뉴"

  return (
    <div className="flex flex-col gap-6 px-6 pb-8">
      <TodayForecast hall={hall} />

      <Separator />

      <Section title={`평소 ${MEAL_LABEL[PATTERN_MEAL]} 혼잡 패턴`}>
        <p className="-mt-1.5 text-xs leading-snug text-pretty text-muted-foreground">
          요일별 10분 단위예요. 10월 3주차 메뉴로 돌린 모의 데이터 예측이에요.
        </p>
        <PatternGrid rows={rows} label={venue.name} today={storedWeekDate(now)} />
      </Section>

      <Separator />

      <Section title="위치">
        <div className="flex flex-col gap-2 text-[0.8125rem] leading-snug">
          <p className="flex items-start gap-2">
            <HugeiconsIcon
              icon={Location01Icon}
              aria-hidden
              className="mt-px size-4 shrink-0 text-muted-foreground"
            />
            <span>
              <span className="font-semibold text-primary">{`${venue.building} ${venue.floor}`}</span>{" "}
              {venue.directions}
            </span>
          </p>
          {workBuilding && (
            <p className="flex items-start gap-2">
              <HugeiconsIcon
                icon={WalkingIcon}
                aria-hidden
                className="mt-px size-4 shrink-0 text-muted-foreground"
              />
              <span className="tabular-nums">
                {`근무 건물에서 걸어서 ${walkMinutes(workBuilding, hall)}분(추정)`}
              </span>
            </p>
          )}
        </div>
        <Link
          to={`/map?venue=${hall}`}
          className={cn(buttonVariants({ variant: "outline" }), "h-11 self-start")}
        >
          지도에서 보기
        </Link>
      </Section>

      {menu && (
        <>
          <Separator />
          <Section title={menuTitle}>
            <p className="text-[0.8125rem] leading-snug text-foreground">{menu}</p>
          </Section>
        </>
      )}
    </div>
  )
}

/** 홈 식당 줄을 누르면 여는 식당 상세. 제목은 식당 이름. */
export function HallDetailSheet({
  hall,
  open,
  onOpenChange,
}: {
  hall: DiningHallId
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const venue = VENUES[hall]
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92dvh] max-w-lg overflow-y-auto rounded-t-3xl"
      >
        <SheetHeader className="pb-5">
          <SheetTitle>{venue.name}</SheetTitle>
          <SheetDescription>
            예상 대기와 평소 붐비는 시간, 위치를 함께 보여 드려요.
          </SheetDescription>
        </SheetHeader>
        <DetailBody hall={hall} />
      </SheetContent>
    </Sheet>
  )
}
