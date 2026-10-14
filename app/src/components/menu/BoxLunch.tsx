import { HugeiconsIcon } from "@hugeicons/react"
import { Notification03Icon, Tick02Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/toast"
import {
  BOX_LUNCH_NOTICE,
  BOX_LUNCH_RESERVATION,
} from "@/data/menus/box-lunch-reservation"
import { SERVICE_WINDOWS } from "@/data/restaurants"
import { useClock } from "@/hooks/useClock"
import { usePrefs } from "@/hooks/usePrefs"
import { seoulMinutes, seoulWeekdayIndex } from "@/lib/format"
import { getServiceStatus } from "@/lib/hours"
import { getCourses } from "@/lib/menu"

/** 하루 한정 수량 */
export const BOX_LUNCH_DAILY = 500
const COUNT_START = 8 * 60 + 30 // 08:30, 신청이 열리는 시각
const PER_MINUTE = 1.6

/**
 * 오늘 남은 도시락 수량(모의, 결정적).
 * m = 08:30부터 지난 분(그 전이면 0)일 때 n = max(0, 500 − ⌊1.6·m⌋).
 * 분당 1.6개씩 단조 감소해 12:20에 132개, 13:00 마감 때 68개가 남는다.
 */
export function boxLunchRemaining(now: Date): number {
  const m = Math.max(0, seoulMinutes(now) - COUNT_START)
  return Math.max(0, BOX_LUNCH_DAILY - Math.floor(PER_MINUTE * m))
}

const PICKUP = SERVICE_WINDOWS.find((w) => w.venue === "boxLunch")!
const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"]

function Today() {
  const { now } = useClock()
  const status = getServiceStatus("boxLunch", "lunch", now)

  if (status.kind === "notToday") {
    const weekend = seoulWeekdayIndex(now) >= 5
    return (
      <Empty className="gap-3 rounded-2xl bg-accent px-4 py-8">
        <EmptyHeader>
          <EmptyDescription className="text-sm text-foreground/80">
            {weekend
              ? "주말에는 간편식 도시락이 없어요"
              : "공휴일에는 간편식 도시락이 없어요"}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const courses = getCourses(now, "boxLunch", "lunch")
  const closed = status.kind === "ended"
  const left = boxLunchRemaining(now)

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-accent px-4 py-3.5">
        {closed ? (
          <p className="flex flex-col gap-1">
            <span className="text-[1.375rem] leading-tight font-bold tracking-tight">
              수령 마감
            </span>
            <span className="text-xs text-muted-foreground">
              {`오늘 수령은 ${PICKUP.end}에 끝났어요`}
            </span>
          </p>
        ) : (
          <>
            <p
              data-slot="box-lunch-left"
              className="flex items-baseline justify-between gap-3"
            >
              <span className="text-[0.8125rem] font-medium text-muted-foreground">
                오늘 남은 수량
              </span>{" "}
              <span className="text-[1.375rem] leading-none font-bold tracking-tight text-primary tabular-nums">
                {`${left}개`}
              </span>
            </p>
            <div
              aria-hidden
              className="mt-3 h-1 overflow-hidden rounded-full bg-primary/15"
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(left / BOX_LUNCH_DAILY) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground tabular-nums">
              {`하루 ${BOX_LUNCH_DAILY}개 한정이고 ${PICKUP.start}–${PICKUP.end}에 받아요`}
            </p>
          </>
        )}
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {courses.map((c) => (
          <li
            key={c.label}
            className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-baseline gap-x-3 py-3 last:pb-0"
          >
            <span className="text-[0.8125rem] font-bold text-primary">
              {c.label}
            </span>
            <span className="text-[0.9375rem] leading-snug font-semibold tracking-tight">
              {c.items[0].name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function md(ymd: string): { day: number; weekday: string } {
  const [y, m, d] = ymd.split("-").map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return { day: d, weekday: WEEKDAYS[(dow + 6) % 7] }
}

function Dish({ name, kcal }: { name: string; kcal?: number }) {
  return (
    <td className="py-3 pr-2 align-top">
      <span className="block text-sm leading-snug font-medium wrap-break-word">
        {name}
      </span>
      {kcal !== undefined && (
        <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
          {`${kcal} kcal`}
        </span>
      )}
    </td>
  )
}

function Reservation() {
  const { subscriptions, setSubscriptions } = usePrefs()
  const subscribed = subscriptions.boxLunchDeadline

  const openAmis = () =>
    toast.add({ title: "AMIS3.0은 병원 내부망에서 열 수 있어요" })

  const subscribe = () => {
    setSubscriptions({ ...subscriptions, boxLunchDeadline: true })
    toast.add({ title: "도시락 마감 알림을 켰어요" })
  }

  const first = md(BOX_LUNCH_RESERVATION[0].date)
  const last = md(BOX_LUNCH_RESERVATION.at(-1)!.date)

  return (
    <section aria-labelledby="box-next" className="flex flex-col">
      <h3 id="box-next" className="text-[0.9375rem] font-bold tracking-tight">
        다음 주 예약 메뉴
      </h3>
      <p className="mt-1 text-xs leading-normal text-muted-foreground">
        {BOX_LUNCH_NOTICE}
      </p>

      <table className="mt-3 w-full table-fixed border-collapse text-left">
        <caption className="sr-only">
          {`10월 ${first.day}일부터 ${last.day}일까지 도시락 예약 메뉴`}
        </caption>
        <colgroup>
          <col className="w-11" />
          <col />
          <col />
        </colgroup>
        <thead>
          <tr className="border-b border-border text-[0.6875rem] text-muted-foreground">
            <th scope="col" className="pb-2 font-medium">
              <span className="sr-only">날짜</span>
            </th>
            <th scope="col" className="pb-2 font-medium">
              <span className="font-bold text-primary">A</span> 한식
            </th>
            <th scope="col" className="pb-2 font-medium">
              <span className="font-bold text-primary">B</span> 샐러드
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {BOX_LUNCH_RESERVATION.map((r) => {
            const d = md(r.date)
            return (
              <tr key={r.date}>
                <th scope="row" className="py-3 align-top font-normal">
                  <span className="block text-[0.9375rem] leading-snug font-bold tabular-nums">
                    {d.day}
                  </span>
                  <span className="block text-[0.6875rem] text-muted-foreground">
                    {d.weekday}
                  </span>
                </th>
                <Dish {...r.a} />
                <Dish {...r.b} />
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button size="lg" onClick={openAmis}>
          AMIS3.0에서 예약하기
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={subscribe}
          disabled={subscribed}
        >
          <HugeiconsIcon
            icon={subscribed ? Tick02Icon : Notification03Icon}
            strokeWidth={2}
            data-icon="inline-start"
          />
          {subscribed ? "마감 알림 켜짐" : "마감 알림 받기"}
        </Button>
      </div>
    </section>
  )
}

/** 간편식 도시락: 오늘 수량과 다음 주 사전 예약 */
export function BoxLunch() {
  return (
    <div className="flex flex-col gap-6 md:max-w-xl">
      <section aria-labelledby="box-today" className="flex flex-col gap-3">
        <h3
          id="box-today"
          className="text-[0.9375rem] font-bold tracking-tight"
        >
          오늘의 간편식 도시락
        </h3>
        <Today />
      </section>
      <Separator />
      <Reservation />
    </div>
  )
}
