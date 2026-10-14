import { useState } from "react"

import { BoxLunch } from "@/components/menu/BoxLunch"
import { HallCompare } from "@/components/menu/HallCompare"
import { TakeoutZones } from "@/components/menu/TakeoutZones"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { MealKey } from "@/domain/types"
import { useClock } from "@/hooks/useClock"
import { seoulWeekdayIndex } from "@/lib/format"
import {
  getActiveMeal,
  getNextService,
  getServiceStatus,
  seoulYmd,
} from "@/lib/hours"
import { MENU_WEEK_LABEL } from "@/lib/menu"
import { MEAL_LABEL } from "@/lib/recommend"

type TabKey = "halls" | "takeout" | "box"

const TABS: { value: TabKey; label: string }[] = [
  { value: "halls", label: "식당" },
  { value: "takeout", label: "테이크아웃" },
  { value: "box", label: "도시락" },
]

/** 배식 시각 순서 (이동식 21:30 → 야식 23:30) */
const MEALS: MealKey[] = ["breakfast", "lunch", "dinner", "mobile", "lateNight"]
const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"]
const DAY_MS = 86_400_000

/**
 * 처음 보여 줄 날과 끼니. 동관이 배식 중이면 그 끼니(자정을 넘긴 야식은
 * 시작한 날), 아니면 동관의 다음 끼니, 그마저 없으면 중식.
 */
function defaults(now: Date): { anchor: Date; meal: MealKey } {
  const active = getActiveMeal("east", now)
  if (active) {
    const s = getServiceStatus("east", active, now)
    if (s.kind === "open") return { anchor: s.opensAt, meal: active }
  }
  return { anchor: now, meal: getNextService("east", now)?.meal ?? "lunch" }
}

/**
 * anchor가 속한 주의 월~일(서울 정오). 메뉴는 요일로 저장 주에 대응하므로
 * 내용은 "10월 3주차" 표와 같고, 휴무·품절 판정은 실제 날짜로 한다.
 */
function weekOf(anchor: Date): Date[] {
  const noon = new Date(`${seoulYmd(anchor)}T12:00:00+09:00`).getTime()
  const i = seoulWeekdayIndex(anchor)
  return WEEKDAYS.map((_, k) => new Date(noon + (k - i) * DAY_MS))
}

function DayPicker({
  days,
  today,
  value,
  onChange,
}: {
  days: Date[]
  today: number
  value: number
  onChange: (i: number) => void
}) {
  return (
    <ToggleGroup
      aria-label="날짜"
      value={[String(value)]}
      onValueChange={(v) => {
        if (v[0] !== undefined) onChange(Number(v[0]))
      }}
      spacing={1}
      className="grid w-full grid-cols-7 md:max-w-xl"
    >
      {days.map((d, i) => {
        const [, m, dd] = seoulYmd(d).split("-").map(Number)
        return (
          <ToggleGroupItem
            key={i}
            value={String(i)}
            aria-label={`${m}월 ${dd}일 ${WEEKDAYS[i]}요일${i === today ? ", 오늘" : ""}`}
            className="group/day relative h-14 min-w-0 flex-col gap-0.5 rounded-2xl px-0 aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            <span className="text-[0.6875rem] leading-none font-medium text-muted-foreground group-aria-pressed/day:text-primary-foreground/80">
              {WEEKDAYS[i]}
            </span>
            <span className="text-base leading-tight font-semibold tabular-nums">
              {dd}
            </span>
            {i === today && (
              <span
                aria-hidden
                className="absolute bottom-1.5 size-1 rounded-full bg-primary group-aria-pressed/day:bg-primary-foreground"
              />
            )}
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}

function MealPicker({
  value,
  onChange,
}: {
  value: MealKey
  onChange: (m: MealKey) => void
}) {
  return (
    <ToggleGroup
      aria-label="끼니"
      value={[value]}
      onValueChange={(v) => {
        if (v[0]) onChange(v[0] as MealKey)
      }}
      spacing={1.5}
      className="flex w-full flex-wrap md:max-w-xl"
    >
      {MEALS.map((m) => (
        <ToggleGroupItem
          key={m}
          value={m}
          className="h-10 flex-1 border border-border px-0 text-[0.8125rem] aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:font-semibold aria-pressed:text-primary"
        >
          {MEAL_LABEL[m]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function MenuBody({ initial }: { initial: { anchor: Date; meal: MealKey } }) {
  const days = weekOf(initial.anchor)
  const today = seoulWeekdayIndex(initial.anchor)
  const [day, setDay] = useState(today)
  const [meal, setMeal] = useState<MealKey>(initial.meal)
  const date = days[day]

  const dayPicker = (
    <DayPicker days={days} today={today} value={day} onChange={setDay} />
  )

  return (
    <>
      <TabsContent value="halls" className="flex flex-col gap-3">
        {dayPicker}
        <MealPicker value={meal} onChange={setMeal} />
        <div className="mt-3">
          <HallCompare meal={meal} date={date} />
        </div>
      </TabsContent>
      <TabsContent value="takeout" className="flex flex-col gap-6">
        {dayPicker}
        <TakeoutZones date={date} />
      </TabsContent>
      <TabsContent value="box">
        <BoxLunch />
      </TabsContent>
    </>
  )
}

export default function MenuPage() {
  const { now } = useClock()
  const [tab, setTab] = useState<TabKey>("halls")
  const initial = defaults(now)
  // 시연 시각을 바꿔 날이나 기본 끼니가 달라지면 선택을 새로 시작한다
  const bodyKey = `${seoulYmd(initial.anchor)}|${initial.meal}`

  return (
    <main className="flex flex-1 flex-col">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TabKey)}
        className="flex-1 gap-0"
      >
        <section
          aria-labelledby="menu-title"
          className="bg-deep px-4 pt-4 pb-[2.125rem] text-deep-foreground"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h1
                id="menu-title"
                className="text-[1.5625rem] leading-tight font-bold tracking-[-0.035em]"
              >
                메뉴
              </h1>
              <p className="text-xs text-deep-foreground/70">
                {MENU_WEEK_LABEL}
              </p>
            </div>
            <TabsList
              variant="line"
              aria-label="메뉴 종류"
              className="h-11 w-full justify-start gap-6 p-0"
            >
              {TABS.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="h-full flex-none px-0 text-[0.9375rem] text-deep-foreground/65 after:bg-deep-foreground hover:text-deep-foreground data-active:font-semibold data-active:text-deep-foreground"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </section>

        <section className="relative -mt-[18px] flex flex-1 flex-col rounded-t-3xl bg-card px-4 pt-5 pb-8">
          <div className="mx-auto w-full max-w-5xl">
            <MenuBody key={bodyKey} initial={initial} />
          </div>
        </section>
      </Tabs>
    </main>
  )
}
