import { useEffect, useReducer, useRef, useState } from "react"
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
  OVERRIDE_TTL_MS,
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

function EntranceInput({ hall }: { hall: DiningHallId }) {
  const { now } = useClock()
  const [, bump] = useReducer((n: number) => n + 1, 0)
  useEffect(() => subscribeOverrides(bump), [])
  // 스크린리더에 읽어 줄 마지막 문구. key가 바뀌면 새 글자 노드가 되어 다시 읽는다.
  // 만료로 풀릴 때는 바꾸지 않아 읽지 않는다. 식당을 바꾸면 key로 다시 만들어 지워진다
  const [announce, setAnnounce] = useState<{
    key: string
    text: string
    entryId?: string
  } | null>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)

  // now는 시계가 흐를 때 다시 그리기 위한 값이다. 남은 시간은 실제 시계로 잰다
  const active = getActiveEntry(hall)
  const left = active ? Math.ceil(entryRemainingMs(active) / 60_000) : 0

  // 선택 안내는 그 선택이 아직 켜져 있을 때만 남긴다(만료나 다른 탭의 교체·취소면 조용히 지운다)
  const shownAnnounce =
    announce && (!announce.entryId || active?.id === announce.entryId)
      ? announce
      : null

  return (
    <section aria-labelledby="entrance-title" className="flex flex-col gap-3">
      <h2
        id="entrance-title"
        ref={titleRef}
        tabIndex={-1}
        className="text-lg font-bold tracking-tight outline-none"
      >
        입구 상황
      </h2>
      {/* 선택하면 버튼이 밀리지 않게 줄 높이를 그대로 둔다 */}
      <p
        data-testid="entrance-prompt"
        aria-hidden={active ? true : undefined}
        className={cn("text-sm text-muted-foreground", active && "invisible")}
      >
        지금 입구 상황을 골라 주세요
      </p>
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
                const entry = addStaffEntry(hall, b.level, now)
                setAnnounce({
                  key: entry.id,
                  text: `${b.label} 선택됨`,
                  entryId: entry.id,
                })
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
      {/* 선택하거나 취소할 때만 읽어 준다. 매분 바뀌는 남은 시간은 라이브 영역 밖에 둔다 */}
      <p role="status" className="sr-only">
        {shownAnnounce && (
          <span key={shownAnnounce.key}>{shownAnnounce.text}</span>
        )}
      </p>
      {active && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
          <p className="font-semibold">
            {`직원들 화면에 '${LEVEL_LABEL[active.level]}'${PARTICLE[active.level]} 보여요`}
          </p>
          <p className="text-sm text-muted-foreground">
            {`${formatMinutes(seoulMinutes(new Date(active.at + OVERRIDE_TTL_MS)))}까지 유지돼요(${left}분 남음)`}
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => {
              cancelStaffEntry(active.id)
              setAnnounce({ key: `cancel-${active.id}`, text: "선택 취소됨" })
              titleRef.current?.focus()
            }}
          >
            선택 취소
          </Button>
        </div>
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
