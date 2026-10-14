import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon, StarIcon } from "@hugeicons/core-free-icons"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { DiningHallId, MealKey } from "@/domain/types"
import { useClock } from "@/hooks/useClock"
import { usePrefs } from "@/hooks/usePrefs"
import { requestPermission } from "@/lib/alerts"
import { getActiveMeal, getServiceStatus, seoulYmd } from "@/lib/hours"
import {
  getRating,
  rateMeal,
  type Rating,
  type Subscriptions,
} from "@/lib/prefs"
import { MEAL_LABEL } from "@/lib/recommend"
import { storage } from "@/lib/storage"

type Row = {
  id: string
  label: string
  description?: string
} & (
  | { hall: DiningHallId }
  | { flag: "favoriteDay" | "boxLunchDeadline" | "closingSoon" }
)

const ROWS: Row[] = [
  { id: "sub-east", label: "동관 대기가 줄면 알려주기", hall: "east" },
  { id: "sub-west", label: "서관 대기가 줄면 알려주기", hall: "west" },
  { id: "sub-new", label: "신관 대기가 줄면 알려주기", hall: "new" },
  {
    id: "sub-fav",
    label: "즐겨찾는 메뉴가 나오는 날",
    description: "전날 18:00, 당일 10:30에 알려드려요",
    flag: "favoriteDay",
  },
  {
    id: "sub-box",
    label: "도시락 예약 마감 전",
    description: "목요일 16:30에 알려드려요",
    flag: "boxLunchDeadline",
  },
  { id: "sub-close", label: "배식 마감 30분 전", flag: "closingSoon" },
]

/** 배식 시각 순서 */
const MEALS: MealKey[] = ["breakfast", "lunch", "dinner", "mobile", "lateNight"]

/** 동관에서 지금 배식 중인 끼니, 없으면 오늘 가장 나중에 끝난 끼니 */
function ratingTarget(now: Date): MealKey | null {
  const active = getActiveMeal("east", now)
  if (active) return active
  const ended = MEALS.filter(
    (m) => getServiceStatus("east", m, now).kind === "ended"
  )
  return ended.at(-1) ?? null
}

const LEFTOVERS: { value: Rating["leftover"]; label: string }[] = [
  { value: "none", label: "남김없이 먹었어요" },
  { value: "some", label: "조금 남겼어요" },
  { value: "much", label: "많이 남겼어요" },
]

function isOn(s: Subscriptions, r: Row): boolean {
  return "hall" in r ? s.queueCleared.includes(r.hall) : s[r.flag]
}

function withRow(s: Subscriptions, r: Row, on: boolean): Subscriptions {
  if ("hall" in r) {
    const rest = s.queueCleared.filter((h) => h !== r.hall)
    return { ...s, queueCleared: on ? [...rest, r.hall] : rest }
  }
  return { ...s, [r.flag]: on }
}

function SubscriptionSection() {
  const { subscriptions, setSubscriptions } = usePrefs()
  const [asked, setAsked] = useState(false)
  const [blocked, setBlocked] = useState(false)

  const change = async (r: Row, on: boolean) => {
    setSubscriptions(withRow(subscriptions, r, on))
    if (!on || asked) return
    setAsked(true)
    const result = await requestPermission()
    if (result !== "granted") setBlocked(true)
  }

  return (
    <section aria-labelledby="subs-title" className="flex flex-col gap-3">
      <h2 id="subs-title" className="text-lg font-bold tracking-tight">
        알림 받기
      </h2>
      {blocked && (
        <Alert>
          <HugeiconsIcon icon={Alert02Icon} aria-hidden />
          <AlertDescription>
            브라우저 알림이 꺼져 있어 앱 안에서만 알려드려요. 브라우저 설정 &gt;
            사이트 권한 &gt; 알림에서 허용할 수 있어요
          </AlertDescription>
        </Alert>
      )}
      {!storage.isPersistent() && (
        <Alert>
          <HugeiconsIcon icon={Alert02Icon} aria-hidden />
          <AlertDescription>
            이 브라우저에서는 설정이 저장되지 않아요
          </AlertDescription>
        </Alert>
      )}
      <FieldGroup className="gap-0">
        {ROWS.map((r) => (
          <FieldLabel
            key={r.id}
            htmlFor={r.id}
            className="min-h-14 border-b border-border font-normal has-[>[data-slot=field]]:rounded-none has-[>[data-slot=field]]:border-x-0 has-[>[data-slot=field]]:border-t-0 has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-transparent *:data-[slot=field]:min-h-14 *:data-[slot=field]:px-0 *:data-[slot=field]:py-3"
          >
            <Field orientation="horizontal" className="items-center">
              <FieldContent>
                <FieldTitle
                  id={`${r.id}-title`}
                  className="text-[0.9375rem] font-normal"
                >
                  {r.label}
                </FieldTitle>
                {r.description && (
                  <FieldDescription>{r.description}</FieldDescription>
                )}
              </FieldContent>
              <Switch
                id={r.id}
                aria-labelledby={`${r.id}-title`}
                checked={isOn(subscriptions, r)}
                onCheckedChange={(on) => void change(r, on)}
              />
            </Field>
          </FieldLabel>
        ))}
      </FieldGroup>
    </section>
  )
}

function StarPicker({
  value,
  onChange,
}: {
  value: Rating["stars"] | null
  onChange: (v: Rating["stars"]) => void
}) {
  return (
    <ToggleGroup
      aria-label="별점"
      value={value ? [String(value)] : []}
      onValueChange={(v) => {
        if (v[0] !== undefined) onChange(Number(v[0]) as Rating["stars"])
      }}
      spacing={1}
      className="w-full"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <ToggleGroupItem
          key={n}
          value={String(n)}
          aria-label={`별 ${n}개`}
          className="h-11 flex-1 rounded-2xl p-0 aria-pressed:bg-transparent"
        >
          <HugeiconsIcon
            icon={StarIcon}
            aria-hidden
            strokeWidth={1.75}
            className={
              value !== null && n <= value
                ? "size-7 fill-primary text-primary"
                : "size-7 text-muted-foreground/75"
            }
          />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function RatingForm({
  storageKey,
  meal,
}: {
  storageKey: string
  meal: MealKey
}) {
  const saved = getRating(storageKey)
  const [stars, setStars] = useState<Rating["stars"] | null>(
    saved?.stars ?? null
  )
  const [leftover, setLeftover] = useState<Rating["leftover"] | null>(
    saved?.leftover ?? null
  )

  const send = () => {
    if (!stars || !leftover) return
    rateMeal(storageKey, { stars, leftover })
    toast.add({ title: "평가를 보냈어요" })
  }

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend variant="label">{`동관 ${MEAL_LABEL[meal]}은 어땠나요`}</FieldLegend>
        <StarPicker value={stars} onChange={setStars} />
      </FieldSet>
      <FieldSet>
        <FieldLegend variant="label">남긴 양은 어땠나요</FieldLegend>
        <ToggleGroup
          aria-label="남긴 양"
          value={leftover ? [leftover] : []}
          onValueChange={(v) => {
            if (v[0] !== undefined) setLeftover(v[0] as Rating["leftover"])
          }}
          spacing={1.5}
          className="grid w-full grid-cols-3"
        >
          {LEFTOVERS.map((l) => (
            <ToggleGroupItem
              key={l.value}
              value={l.value}
              className="h-12 min-w-0 border border-border px-1 text-[0.8125rem] leading-tight whitespace-normal aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:font-semibold aria-pressed:text-primary"
            >
              {l.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </FieldSet>
      <Button
        type="button"
        size="lg"
        className="h-11 w-full"
        disabled={!stars || !leftover}
        onClick={send}
      >
        평가 보내기
      </Button>
    </FieldGroup>
  )
}

function RatingSection() {
  const { now } = useClock()
  const meal = ratingTarget(now)
  const key = meal ? `${seoulYmd(now)}:east:${meal}` : null

  return (
    <section aria-labelledby="rating-title" className="flex flex-col gap-4">
      <h2 id="rating-title" className="text-lg font-bold tracking-tight">
        오늘 식사 어땠나요?
      </h2>
      {meal && key ? (
        <RatingForm key={key} storageKey={key} meal={meal} />
      ) : (
        <p className="text-sm text-muted-foreground">
          오늘 평가할 식사가 아직 없어요
        </p>
      )}
    </section>
  )
}

export default function AlertsPage() {
  return (
    <main className="flex flex-1 flex-col">
      <section
        aria-labelledby="alerts-title"
        className="bg-deep px-4 pt-4 pb-[2.125rem] text-deep-foreground"
      >
        <div className="mx-auto flex max-w-5xl items-baseline justify-between gap-3">
          <h1
            id="alerts-title"
            className="text-[1.5625rem] leading-tight font-bold tracking-[-0.035em]"
          >
            알림
          </h1>
          <p className="text-xs text-deep-muted">
            필요한 알림만 골라 받아요
          </p>
        </div>
      </section>

      <div className="relative -mt-[18px] flex flex-1 flex-col rounded-t-3xl bg-card px-4 pt-5 pb-8">
        <div className="mx-auto grid w-full max-w-5xl gap-10 md:grid-cols-2 md:gap-12">
          <SubscriptionSection />
          <RatingSection />
        </div>
      </div>
    </main>
  )
}
