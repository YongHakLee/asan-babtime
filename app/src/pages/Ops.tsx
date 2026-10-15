import { useEffect, useReducer, type ReactNode } from "react"
import { Link, useLocation } from "react-router"

import { StatusLines, StatusText } from "@/components/common/StatusText"
import { ArrivalBars, ArrivalLegend } from "@/components/ops/ArrivalBars"
import { buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { DINING_HALLS as HALLS, VENUES } from "@/data/restaurants"
import type { DiningHallId, MealKey } from "@/domain/types"
import { useClock } from "@/hooks/useClock"
import { useVenueStatus } from "@/hooks/useVenueStatus"
import { keepAt } from "@/lib/demoLink"
import { formatMinutes, seoulMinutes, seoulWeekdayTime } from "@/lib/format"
import { getNextService, getServiceStatus, seoulYmd } from "@/lib/hours"
import {
  nextSeoulDay,
  opsMeal,
  satisfaction,
  soldOutLog,
  todayArrivals,
  tomorrowPrep,
} from "@/lib/ops"
import { getActiveEntry, lastEntryOn, subscribeOverrides } from "@/lib/override"
import { subscribePrefs } from "@/lib/prefs"
import { LEVEL_LABEL } from "@/lib/queue"
import { MEAL_LABEL } from "@/lib/recommend"
import { cn } from "@/lib/utils"

const MEALS: MealKey[] = ["breakfast", "lunch", "dinner", "mobile", "lateNight"]
const hm = (d: Date) => formatMinutes(seoulMinutes(d))
const num = (n: number) => n.toLocaleString("ko-KR")

function Section({
  id,
  title,
  caption,
  children,
}: {
  id: string
  title: string
  caption?: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-base font-bold tracking-tight">
          {title}
        </h2>
        {caption && (
          <p className="text-xs leading-snug text-pretty text-muted-foreground">
            {caption}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

/** 식당 이름 + 보조 한 줄 + 오른쪽 상태 */
function HallLine({
  hall,
  sub,
  aside,
}: {
  hall: DiningHallId
  sub: ReactNode
  aside?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-[0.9375rem] font-semibold tracking-tight">
          {VENUES[hall].label}
        </p>
        <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted-foreground">
          {sub}
        </p>
      </div>
      {aside && <div className="pt-0.5">{aside}</div>}
    </div>
  )
}

function NowRow({ hall }: { hall: DiningHallId }) {
  const { now } = useClock()
  const { meal, status, level, waitMinutes } = useVenueStatus(hall)
  const o = getActiveEntry(hall)
  const last = o ? null : lastEntryOn(hall, seoulYmd(now))
  if (meal && status?.kind === "open") {
    return (
      <HallLine
        hall={hall}
        sub={
          <>
            <span className="block">{`${MEAL_LABEL[meal]} 배식 중이에요(${hm(status.closesAt)}까지)`}</span>
            {o ? (
              <span className="block">{`직원 입력: ${LEVEL_LABEL[o.level]}, ${hm(new Date(o.at))}`}</span>
            ) : (
              <span className="block font-semibold text-status-busy">
                {`직원 입력 누락, ${last ? `마지막 입력 ${hm(new Date(last.at))}` : "오늘 입력 없음"}`}
              </span>
            )}
          </>
        }
        aside={<StatusText level={level} waitMinutes={waitMinutes} />}
      />
    )
  }
  const next = getNextService(hall, now)
  if (next && seoulYmd(next.opensAt) === seoulYmd(now)) {
    return (
      <HallLine
        hall={hall}
        sub={`${MEAL_LABEL[next.meal]} 배식 전이에요`}
        aside={
          <StatusLines
            primary={`${hm(next.opensAt)} 시작`}
            secondary={MEAL_LABEL[next.meal]}
          />
        }
      />
    )
  }
  const servesToday = MEALS.some(
    (m) => getServiceStatus(hall, m, now).kind !== "notToday"
  )
  return (
    <HallLine
      hall={hall}
      sub={servesToday ? "오늘 배식을 모두 마쳤어요" : "오늘은 운영하지 않아요"}
      aside={
        <StatusLines
          className="text-muted-foreground"
          primary={servesToday ? "운영 종료" : "휴무"}
        />
      }
    />
  )
}

function NowSection() {
  return (
    <Section
      id="ops-now"
      title="지금 상황"
      caption="예상 대기는 모델 예측이고, 검수 직원 입력이 있으면 그 값을 먼저 써요. 배식 중인데 15분 안의 직원 입력이 없으면 누락으로 표시해요."
    >
      <ul className="flex flex-col">
        {HALLS.map((hall, i) => (
          <li key={hall}>
            {i > 0 && <Separator />}
            <NowRow hall={hall} />
          </li>
        ))}
      </ul>
    </Section>
  )
}

function ArrivalsSection({ now }: { now: Date }) {
  const all = todayArrivals(now)
  const scale = Math.max(1, ...HALLS.flatMap((h) => all[h].map((s) => s.count)))
  const longest = Math.max(...HALLS.map((h) => all[h].length))
  const firstStart = all.east[0]?.time

  return (
    <Section
      id="ops-arrivals"
      title="오늘 시간대별 입장 추정"
      caption="10분마다 들어오는 인원을 모델로 추정한 모의 데이터예요. 세 식당 막대 높이는 같은 기준이에요."
    >
      <ArrivalLegend slots={HALLS.flatMap((h) => all[h])} />
      <div className="flex flex-col gap-5 pt-1">
        {HALLS.map((hall) => {
          const slots = all[hall]
          const { meal } = opsMeal(hall, now)
          const name = `${VENUES[hall].label} ${MEAL_LABEL[meal]}`
          if (slots.length === 0) {
            return (
              <div key={hall} className="flex flex-col gap-1">
                <p className="text-[0.8125rem] font-semibold">{name}</p>
                <p className="text-[0.8125rem] text-muted-foreground">
                  오늘은 운영하지 않아요
                </p>
              </div>
            )
          }
          const total = slots.reduce((s, x) => s + x.count, 0)
          const peak = slots.reduce((a, b) => (b.count > a.count ? b : a))
          // 같은 시각에 시작하면 칸 너비를 맞춰 시간축을 맞춘다
          const aligned = slots[0].time === firstStart
          return (
            <div key={hall} className="flex flex-col gap-1.5">
              <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[0.8125rem]">
                <span className="font-semibold">{name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {`약 ${num(total)}명, ${peak.time}에 가장 많아요`}
                </span>
              </p>
              <ArrivalBars
                label={`${name} 10분 단위 입장 추정`}
                slots={slots}
                scale={scale}
                widthPct={aligned ? (slots.length / longest) * 100 : 100}
              />
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function SoldOutSection({ now }: { now: Date }) {
  const log = soldOutLog(now)
  return (
    <Section
      id="ops-soldout"
      title="품절 기록"
      caption="검수 직원 화면에서 오늘 입력한 품절이에요."
    >
      {log.length === 0 ? (
        <p className="text-[0.8125rem] text-muted-foreground">
          오늘 품절 입력이 없어요
        </p>
      ) : (
        <ul className="flex flex-col">
          {log.map((e, i) => (
            <li key={`${e.label}-${i}`}>
              {i > 0 && <Separator />}
              <div className="flex min-h-11 items-center justify-between gap-3 py-2 text-[0.8125rem]">
                <span className="font-semibold">{e.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {e.time ?? "시각 기록 없음"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

const LEFTOVER_ROWS = [
  { key: "none", label: "남기지 않음" },
  { key: "some", label: "조금 남김" },
  { key: "much", label: "많이 남김" },
] as const

function SatisfactionSection({ now }: { now: Date }) {
  const s = satisfaction(now)
  return (
    <Section
      id="ops-satisfaction"
      title="만족도·잔반"
      caption="오늘 시작한 배식의 주메뉴 모의 평가에 이 브라우저에서 보낸 평가를 더했어요."
    >
      {s.count === 0 ? (
        <p className="text-[0.8125rem] text-muted-foreground">
          아직 오늘 평가가 없어요
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="flex items-baseline gap-2">
            <span className="text-[2rem] leading-none font-bold tracking-tight">
              {s.avg.toFixed(1)}
            </span>
            <span className="text-[0.8125rem] text-muted-foreground">
              {`별점 평균(5점 만점), ${num(s.count)}건`}
            </span>
          </p>
          <ul aria-label="남긴 양 비율" className="flex flex-col gap-2.5">
            {LEFTOVER_ROWS.map((r) => (
              <li
                key={r.key}
                className="grid grid-cols-[5.5rem_minmax(0,1fr)_2.75rem] items-center gap-3 text-[0.8125rem]"
              >
                <span>{r.label}</span>
                <span
                  aria-hidden
                  className="h-2 overflow-hidden rounded-full bg-muted"
                >
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${s.leftover[r.key]}%` }}
                  />
                </span>
                <span className="text-right tabular-nums">{`${s.leftover[r.key]}%`}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  )
}

function PrepSection({ now }: { now: Date }) {
  const day = nextSeoulDay(now)
  const weekday = seoulWeekdayTime(day).split(" ")[0]
  const prep = tomorrowPrep(now)
  return (
    <Section
      id="ops-prep"
      title="내일 준비 제안"
      caption={`내일(${weekday}) 중식 기준이에요. 10월 3주차의 같은 요일 메뉴로 돌린 모의 데이터 예측이에요.`}
    >
      <ul className="flex flex-col">
        {prep.map((p, i) => (
          <li key={p.hall}>
            {i > 0 && <Separator />}
            <div className="flex flex-col gap-1.5 py-3">
              <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-[0.9375rem] font-semibold tracking-tight">
                  {VENUES[p.hall].label}
                </span>
                {p.open && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {`${p.peak}에 가장 많고 약 ${num(p.expected)}명이 올 것으로 보여요`}
                  </span>
                )}
              </p>
              {!p.open ? (
                <p className="text-[0.8125rem] text-muted-foreground">
                  내일은 중식을 운영하지 않아요
                </p>
              ) : p.notes.length === 0 ? (
                <p className="text-[0.8125rem] text-muted-foreground">
                  평소대로 준비하면 될 것으로 보여요
                </p>
              ) : (
                <ul className="flex flex-col gap-1 text-[0.8125rem] leading-snug">
                  {p.notes.map((n) => (
                    <li key={n} className="flex gap-2">
                      <span
                        aria-hidden
                        className="mt-[0.4rem] size-1.5 shrink-0 rounded-full bg-primary"
                      />
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}

export default function OpsPage() {
  const { now } = useClock()
  const { search } = useLocation()
  // 품절 입력·평가가 바뀌면 다시 그린다
  const [, bump] = useReducer((n: number) => n + 1, 0)
  useEffect(() => subscribeOverrides(bump), [])
  useEffect(() => subscribePrefs(bump), [])

  return (
    <main className="flex flex-1 flex-col">
      <section
        aria-labelledby="ops-title"
        className="bg-deep px-4 pt-4 pb-[2.125rem] text-deep-foreground"
      >
        <div className="mx-auto max-w-5xl">
          <h1
            id="ops-title"
            className="text-[1.5625rem] leading-tight font-bold tracking-[-0.035em]"
          >
            운영자 화면
          </h1>
          <p className="mt-1 text-xs text-deep-muted">
            모의 데이터로 보여주는 식당 운영 요약이에요
          </p>
        </div>
      </section>

      <div className="relative -mt-[18px] flex flex-1 flex-col rounded-t-3xl bg-card px-4 pt-5 pb-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <p className="text-xs leading-snug text-pretty text-muted-foreground">
            화면의 모든 수치는 모의 데이터예요. 실제 운영 기록과는 연결하지
            않았어요.
          </p>
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="flex min-w-0 flex-col gap-8">
              <NowSection />
              <Separator />
              <ArrivalsSection now={now} />
            </div>
            <div className="flex min-w-0 flex-col gap-8">
              <Separator className="lg:hidden" />
              <SoldOutSection now={now} />
              <Separator />
              <SatisfactionSection now={now} />
              <Separator />
              <PrepSection now={now} />
            </div>
          </div>
          <Link
            to={keepAt("/ops/accuracy", search)}
            className={cn(
              buttonVariants({ variant: "link" }),
              "h-11 self-start"
            )}
          >
            예측 점검 보기
          </Link>
        </div>
      </div>
    </main>
  )
}
