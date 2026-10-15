import { useEffect, useReducer, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DINING_HALLS as HALLS, VENUES } from "@/data/restaurants"
import { waitText } from "@/components/common/StatusText"
import type { DiningHallId, MealKey } from "@/domain/types"
import { useClock } from "@/hooks/useClock"
import { formatMinutes, seoulMinutes } from "@/lib/format"
import {
  getActiveMeal,
  getNextService,
  getServiceStatus,
  seoulYmd,
} from "@/lib/hours"
import { cn } from "@/lib/utils"
import { getCourses } from "@/lib/menu"
import {
  addStaffEntry,
  cancelStaffEntry,
  entryRemainingMs,
  getActiveEntry,
  isSoldOut,
  setSoldOut,
  subscribeOverrides,
} from "@/lib/override"
import { LEVEL_LABEL, type CongestionLevel } from "@/lib/queue"
import { MEAL_LABEL } from "@/lib/recommend"

const BUTTONS: {
  level: CongestionLevel
  label: string
  hint: string
  pressed: string
}[] = [
  {
    level: "ok",
    label: "여유",
    hint: "2분 미만",
    pressed:
      "aria-pressed:border-status-ok aria-pressed:bg-status-ok/15 aria-pressed:hover:bg-status-ok/20",
  },
  {
    level: "mid",
    label: "보통",
    hint: "2–5분",
    pressed:
      "aria-pressed:border-status-mid aria-pressed:bg-status-mid/15 aria-pressed:hover:bg-status-mid/20",
  },
  {
    level: "queue",
    label: "줄 있음",
    hint: "5–10분",
    pressed:
      "aria-pressed:border-status-queue aria-pressed:bg-status-queue/15 aria-pressed:hover:bg-status-queue/20",
  },
  {
    level: "busy",
    label: "혼잡",
    hint: "10분 이상",
    pressed:
      "aria-pressed:border-status-busy aria-pressed:bg-status-busy/15 aria-pressed:hover:bg-status-busy/20",
  },
]

const DOT: Record<CongestionLevel, string> = {
  ok: "text-status-ok",
  mid: "text-status-mid",
  queue: "text-status-queue",
  busy: "text-status-busy",
}

const PARTICLE: Record<CongestionLevel, string> = {
  ok: "로",
  mid: "으로",
  queue: "으로",
  busy: "으로",
}

/** 비교 문장의 대기 분: 4.6분이 "약 5분"으로 올라가 직원 등급(2–5분)과 어긋나 보이지 않게 내림한다. */
function compareWait(waitMinutes: number): string {
  return waitText(waitMinutes < 1 ? 0 : Math.floor(waitMinutes))
}

function EntranceInput({ hall }: { hall: DiningHallId }) {
  const { now } = useClock()
  const [, bump] = useReducer((n: number) => n + 1, 0)
  useEffect(() => subscribeOverrides(bump), [])
  // 방금 취소한 식당. 식당을 바꾸면 key로 다시 만들어 지워지고,  새로 입력해도 지운다
  const [cancelledHall, setCancelledHall] = useState<DiningHallId | null>(null)

  // now는 시계가 흐를 때 다시 그리기 위한 값이다. 남은 시간은 실제 시계로 잰다
  const active = getActiveEntry(hall)
  const left = active ? Math.ceil(entryRemainingMs(active) / 60_000) : 0
  const justCancelled = !active && cancelledHall === hall

  return (
    <section aria-labelledby="entrance-title" className="flex flex-col gap-3">
      <h2 id="entrance-title" className="text-lg font-bold tracking-tight">
        입구 상황
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {BUTTONS.map((b) => {
          const pressed = active?.level === b.level
          return (
            <Button
              key={b.level}
              type="button"
              variant="outline"
              aria-pressed={pressed}
              onClick={() => {
                setCancelledHall(null)
                addStaffEntry(hall, b.level, now)
              }}
              className={cn(
                "relative h-24 flex-col gap-1 rounded-3xl border-2 px-2 py-3",
                b.pressed
              )}
            >
              {pressed && (
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  aria-hidden
                  strokeWidth={2}
                  className={cn(
                    "absolute top-2.5 right-2.5 size-5",
                    DOT[b.level]
                  )}
                />
              )}
              <span className="text-2xl leading-tight font-bold tracking-tight">
                {b.label}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {b.hint}
              </span>
            </Button>
          )
        })}
      </div>
      {/* 입력하거나 풀릴 때만 읽어 준다. 매분 바뀌는 남은 시간은 라이브 영역 밖에 둔다 */}
      <p key={active?.id ?? "none"} role="status" className="sr-only">
        {active
          ? `${LEVEL_LABEL[active.level]} 입력됨`
          : justCancelled
            ? "입력 취소됨"
            : ""}
      </p>
      {active ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {`${formatMinutes(seoulMinutes(new Date(active.at)))}에 입력, ${left}분 남음`}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                cancelStaffEntry(active.id)
                setCancelledHall(hall)
              }}
            >
              입력 취소
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {`모델${active.model.level === active.level ? "도" : "은"} ${LEVEL_LABEL[active.model.level]}(${compareWait(active.model.waitMinutes)})${PARTICLE[active.model.level]} 봤어요`}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {justCancelled
            ? "입력을 취소했어요. 지금은 예측값을 보여주고 있어요"
            : "지금은 예측값을 보여주고 있어요"}
        </p>
      )}
    </section>
  )
}

/**
 * 품절을 입력할 끼니: 배식 중이면 그 끼니, 아니면 오늘 남은 다음 끼니.
 * day는 배식 창이 시작한 날이라 자정을 넘긴 야식도 시작한 날로 기록된다.
 */
function soldOutTarget(
  hall: DiningHallId,
  now: Date
): { meal: MealKey; day: Date } | null {
  const active = getActiveMeal(hall, now)
  if (active) {
    const s = getServiceStatus(hall, active, now)
    if (s.kind === "open") return { meal: active, day: s.opensAt }
  }
  const next = getNextService(hall, now)
  if (next && seoulYmd(next.opensAt) === seoulYmd(now)) {
    return { meal: next.meal, day: next.opensAt }
  }
  return null
}

function SoldOutSection({ hall }: { hall: DiningHallId }) {
  const { now } = useClock()
  const [, bump] = useReducer((n: number) => n + 1, 0)
  useEffect(() => subscribeOverrides(bump), [])

  const venue = VENUES[hall].label
  const target = soldOutTarget(hall, now)
  const courses = target ? getCourses(target.day, hall, target.meal) : []
  const mealLabel = target ? MEAL_LABEL[target.meal] : ""

  return (
    <section aria-labelledby="soldout-title" className="flex flex-col gap-1">
      <h2 id="soldout-title" className="text-lg font-bold tracking-tight">
        품절 입력
      </h2>
      {!target ? (
        <p className="text-sm text-muted-foreground">
          오늘은 {venue}에 남은 배식이 없어요
        </p>
      ) : courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          오늘은 {venue} {mealLabel} 메뉴가 없어요
        </p>
      ) : (
        <FieldGroup className="gap-0">
          {courses.map((c, i) => {
            const id = `soldout-${hall}-${target.meal}-${c.label ?? i}`
            const label = c.label
              ? `${mealLabel} ${c.label} 품절`
              : `${mealLabel} 품절`
            return (
              <FieldLabel
                key={id}
                htmlFor={id}
                className="min-h-14 border-b border-border font-normal has-[>[data-slot=field]]:rounded-none has-[>[data-slot=field]]:border-x-0 has-[>[data-slot=field]]:border-t-0 has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-transparent *:data-[slot=field]:min-h-14 *:data-[slot=field]:px-0 *:data-[slot=field]:py-3"
              >
                <Field orientation="horizontal" className="items-center">
                  <FieldContent>
                    <FieldTitle
                      id={`${id}-title`}
                      className="text-[0.9375rem] font-normal"
                    >
                      {label}
                    </FieldTitle>
                  </FieldContent>
                  <Switch
                    id={id}
                    aria-labelledby={`${id}-title`}
                    checked={isSoldOut(hall, target.meal, c.label, target.day)}
                    onCheckedChange={(on) =>
                      setSoldOut(
                        {
                          hall,
                          meal: target.meal,
                          course: c.label,
                          date: seoulYmd(target.day),
                          at: now.getTime(),
                        },
                        on
                      )
                    }
                  />
                </Field>
              </FieldLabel>
            )
          })}
        </FieldGroup>
      )}
    </section>
  )
}

export default function StaffPage() {
  const [hall, setHall] = useState<DiningHallId>("east")

  return (
    <main className="flex flex-1 flex-col">
      <section
        aria-labelledby="staff-title"
        className="bg-deep px-4 pt-4 pb-[2.125rem] text-deep-foreground"
      >
        <div className="mx-auto max-w-5xl">
          <h1
            id="staff-title"
            className="text-[1.5625rem] leading-tight font-bold tracking-[-0.035em]"
          >
            검수 직원 화면
          </h1>
          <p className="mt-1 text-xs text-deep-muted">
            입구 상황을 누르면 직원들 화면에 바로 반영돼요. 15분 동안 유지돼요
          </p>
        </div>
      </section>

      <div className="relative -mt-[18px] flex flex-1 flex-col rounded-t-3xl bg-card px-4 pt-5 pb-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex max-w-xl flex-col gap-8">
            <ToggleGroup
              aria-label="식당"
              value={[hall]}
              onValueChange={(v) => {
                if (v[0] !== undefined) setHall(v[0] as DiningHallId)
              }}
              spacing={1.5}
              className="grid w-full grid-cols-3"
            >
              {HALLS.map((h) => (
                <ToggleGroupItem
                  key={h}
                  value={h}
                  className="h-12 border border-border text-[0.9375rem] aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:font-semibold aria-pressed:text-primary"
                >
                  {VENUES[h].label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <EntranceInput key={hall} hall={hall} />
            <SoldOutSection hall={hall} />
          </div>
        </div>
      </div>
    </main>
  )
}
