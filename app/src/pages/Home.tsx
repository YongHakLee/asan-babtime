import { useState, type ReactNode } from "react"

import {
  BuildingTile,
  type BuildingGlyph,
} from "@/components/common/BuildingTile"
import { ForecastBars } from "@/components/common/ForecastBars"
import { ServiceStrip } from "@/components/common/ServiceStrip"
import { StatusLines, StatusText } from "@/components/common/StatusText"
import { HallDetailSheet } from "@/components/home/HallDetailSheet"
import { WorkBuildingChip } from "@/components/home/WorkBuildingSheet"
import { Separator } from "@/components/ui/separator"
import { DINING_HALLS as HALLS, VENUES } from "@/data/restaurants"
import type {
  BuildingId,
  DiningHallId,
  MealKey,
  ServiceStatus,
  VenueId,
} from "@/domain/types"
import { useClock } from "@/hooks/useClock"
import { usePrefs } from "@/hooks/usePrefs"
import { useVenueStatus } from "@/hooks/useVenueStatus"
import {
  formatMinutes,
  seoulMinutes,
  seoulWeekdayIndex,
  seoulWeekdayTime,
} from "@/lib/format"
import {
  getActiveMeal,
  getNextService,
  getServiceStatus,
  seoulYmd,
} from "@/lib/hours"
import { getCourses, MENU_WEEK_LABEL, summary } from "@/lib/menu"
import { forecast, homeHeadline, MEAL_LABEL } from "@/lib/recommend"
import { cn } from "@/lib/utils"
import { walkMinutes } from "@/lib/walk"

const MEALS: MealKey[] = ["breakfast", "lunch", "dinner", "mobile", "lateNight"]
const DAY_MS = 86_400_000

const hm = (d: Date) => formatMinutes(seoulMinutes(d))

/** 다음 배식이 오늘이 아닐 때 "내일 11:00부터" · "월요일 11:00부터" */
function laterStart(opensAt: Date, now: Date): string {
  const days = Math.round(
    (Date.parse(seoulYmd(opensAt)) - Date.parse(seoulYmd(now))) / DAY_MS
  )
  const day = days === 1 ? "내일" : seoulWeekdayTime(opensAt).split(" ")[0]
  return `${day} ${hm(opensAt)}부터`
}

/** 오늘 배식이 하나도 없는 날의 이유 */
function dayOffLabel(now: Date): string {
  // 일요일과 공휴일은 같은 dayKind라 요일로 가른다 (5=토, 6=일)
  return seoulWeekdayIndex(now) >= 5 ? "주말 휴무" : "공휴일 휴무"
}

/** 배식 중이 아닌 식당의 상태 글과 함께 보여 줄 다음 끼니 */
function idleState(venue: VenueId, now: Date) {
  const next = getNextService(venue, now)
  const servesToday = MEALS.some(
    (m) => getServiceStatus(venue, m, now).kind !== "notToday"
  )
  const sameDay = next && seoulYmd(next.opensAt) === seoulYmd(now)
  const menu = next ? summary(getCourses(next.opensAt, venue, next.meal)) : ""

  if (next && sameDay) {
    return {
      primary: `${hm(next.opensAt)} 시작`,
      secondary: MEAL_LABEL[next.meal],
      tone: "text-foreground",
      menu,
    }
  }
  return {
    primary: servesToday ? "오늘 운영 종료" : dayOffLabel(now),
    secondary: next ? laterStart(next.opensAt, now) : undefined,
    tone: "text-muted-foreground",
    menu,
  }
}

function Row({
  name,
  glyph,
  tone,
  menu,
  status,
  extra,
  walk,
  onOpen,
}: {
  name: string
  glyph: BuildingGlyph
  tone?: "solid" | "soft"
  menu: string
  status: ReactNode
  extra?: ReactNode
  /** 근무 건물에서 걸어서 걸리는 시간(분). 설정했을 때만 */
  walk?: number
  /** 있으면 줄 전체가 상세 시트를 여는 버튼이 된다 */
  onOpen?: () => void
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[2.125rem_minmax(0,1fr)_auto] items-start gap-x-3 py-3.5",
        onOpen &&
          "relative -mx-2 rounded-xl px-2 transition-colors has-[[data-slot=row-trigger]:hover]:bg-accent/60 motion-reduce:transition-none"
      )}
    >
      <BuildingTile glyph={glyph} tone={tone} />
      <div className="min-w-0 pt-px">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h2 className="text-[0.9375rem] leading-snug font-semibold tracking-tight">
            {onOpen ? (
              // 이름 버튼의 ::after가 줄 전체를 덮어 어디를 눌러도 열린다(이름은 짧게 유지)
              <button
                type="button"
                data-slot="row-trigger"
                aria-haspopup="dialog"
                onClick={onOpen}
                className="text-left outline-none after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
              >
                {name}
              </button>
            ) : (
              name
            )}
          </h2>
          {walk !== undefined && (
            <span className="text-xs text-muted-foreground tabular-nums">
              걸어서 {walk}분(추정)
            </span>
          )}
        </div>
        {menu && (
          <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted-foreground">
            {menu}
          </p>
        )}
        {extra}
      </div>
      <div className="pt-0.5">{status}</div>
    </div>
  )
}

function HallRow({
  hall,
  from,
  onOpen,
}: {
  hall: DiningHallId
  from: BuildingId | null
  onOpen: () => void
}) {
  const { now } = useClock()
  const { meal, status, level, waitMinutes } = useVenueStatus(hall)
  const venue = VENUES[hall]
  const walk = from ? walkMinutes(from, hall) : undefined

  if (meal && status?.kind === "open") {
    const busy = level === "queue" || level === "busy"
    return (
      <Row
        name={venue.name}
        glyph={venue.short}
        walk={walk}
        onOpen={onOpen}
        menu={summary(getCourses(status.opensAt, hall, meal))}
        status={<StatusText level={level} waitMinutes={waitMinutes} />}
        extra={busy && <ForecastBars points={forecast(hall, meal, now)} />}
      />
    )
  }

  const idle = idleState(hall, now)
  return (
    <Row
      name={venue.name}
      glyph={venue.short}
      walk={walk}
      onOpen={onOpen}
      menu={idle.menu}
      status={
        <StatusLines
          className={idle.tone}
          primary={idle.primary}
          secondary={idle.secondary}
        />
      }
    />
  )
}

function BoxLunchRow() {
  const { now } = useClock()
  const venue = VENUES.boxLunch
  const s = getServiceStatus("boxLunch", "lunch", now)

  if (s.kind === "open" || s.kind === "before") {
    return (
      <Row
        name={venue.name}
        glyph={venue.short}
        tone="soft"
        menu={summary(getCourses(now, "boxLunch", "lunch"))}
        status={
          <StatusLines
            primary={
              s.kind === "open"
                ? `${hm(s.closesAt)}까지`
                : `${hm(s.opensAt)}부터`
            }
            secondary="수령"
          />
        }
      />
    )
  }

  const next = getNextService("boxLunch", now)
  return (
    <Row
      name={venue.name}
      glyph={venue.short}
      tone="soft"
      menu={
        next ? summary(getCourses(next.opensAt, "boxLunch", next.meal)) : ""
      }
      status={
        <StatusLines
          className="text-muted-foreground"
          primary={s.kind === "ended" ? "오늘 마감" : dayOffLabel(now)}
          secondary={next ? laterStart(next.opensAt, now) : undefined}
        />
      }
    />
  )
}

/** 시트 맨 위 배식 막대: 열린 직원식당(동관 우선)의 끼니, 없으면 가장 이른 다음 배식 */
function stripFor(now: Date): { meal: MealKey; status: ServiceStatus } | null {
  for (const hall of HALLS) {
    const meal = getActiveMeal(hall, now)
    if (meal) return { meal, status: getServiceStatus(hall, meal, now) }
  }
  const next = HALLS.flatMap((h) => getNextService(h, now) ?? []).sort(
    (a, b) => a.opensAt.getTime() - b.opensAt.getTime()
  )[0]
  if (!next) return null
  return {
    meal: next.meal,
    status: {
      kind: "before",
      opensAt: next.opensAt,
      minutesUntil: Math.ceil(
        (next.opensAt.getTime() - now.getTime()) / 60_000
      ),
    },
  }
}

export default function HomePage() {
  const { now } = useClock()
  const { workBuilding } = usePrefs()
  const { title, detail, tiles } = homeHeadline(now, workBuilding)
  const strip = stripFor(now)
  const [sheetHall, setSheetHall] = useState<DiningHallId>("east")
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <main className="@container flex flex-1 flex-col lg:flex-row lg:bg-deep">
      <section
        aria-labelledby="home-title"
        className="bg-deep px-4 pt-4 pb-[2.125rem] text-deep-foreground lg:w-[42%] lg:shrink-0 lg:pt-12 lg:pr-12 lg:pl-[max(1rem,calc((100cqw_-_64rem)/2))]"
      >
        <div className="lg:sticky lg:top-12">
          <div className="flex gap-1.5">
            {tiles.map((g) => (
              <BuildingTile
                key={g}
                glyph={g}
                tone="inverse"
                className="size-[1.875rem] rounded-[7px] text-[0.9375rem] lg:size-10 lg:text-lg"
              />
            ))}
          </div>
          <h1
            id="home-title"
            className="mt-5 text-[1.5625rem] leading-[1.28] font-bold tracking-[-0.035em] text-balance lg:mt-7 lg:text-[2.375rem] lg:leading-[1.2]"
          >
            {title}
          </h1>
          {detail && (
            <p className="mt-2 text-[0.8125rem] leading-normal text-pretty text-deep-muted lg:mt-4 lg:text-[0.9375rem]">
              {detail}
            </p>
          )}
        </div>
      </section>

      <section
        aria-label="식당별 상황"
        className="relative -mt-[18px] flex flex-1 flex-col rounded-t-3xl bg-card px-4 pt-4 pb-6 lg:mt-0 lg:rounded-tr-none lg:pt-10 lg:pr-[max(1rem,calc((100cqw_-_64rem)/2))] lg:pl-12"
      >
        <WorkBuildingChip />
        {strip && <ServiceStrip meal={strip.meal} status={strip.status} />}
        <ul className="mt-1.5 flex flex-col">
          {HALLS.map((hall, i) => (
            <li key={hall} aria-label={VENUES[hall].name}>
              {i > 0 && <Separator />}
              <HallRow
                hall={hall}
                from={workBuilding}
                onOpen={() => {
                  setSheetHall(hall)
                  setSheetOpen(true)
                }}
              />
            </li>
          ))}
          <li aria-label={VENUES.boxLunch.name}>
            <Separator />
            <BoxLunchRow />
          </li>
        </ul>
        <HallDetailSheet
          hall={sheetHall}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
        <div className="mt-auto flex flex-col gap-0.5 pt-6 text-[0.6875rem] text-muted-foreground">
          <p>모의 데이터로 대기를 예측한 시연이에요.</p>
          <p>{`${MENU_WEEK_LABEL}이에요.`}</p>
        </div>
      </section>
    </main>
  )
}
