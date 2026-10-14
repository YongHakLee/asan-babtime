import { useState } from "react"
import { Link, useLocation } from "react-router"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useClock } from "@/hooks/useClock"
import { formatMinutes, seoulMinutes, seoulWeekdayIndex } from "@/lib/format"
import { cn } from "@/lib/utils"

const DAYS = ["월", "화", "수", "목", "금", "토", "일"]
const WEEK_START_DAY = 12 // 2026-10-12 월요일
const MIN = 5 * 60
const MAX = 25 * 60 // 25:00 = 다음 날 01:00

function demoDate(dayIndex: number, minutes: number): Date {
  const day = String(WEEK_START_DAY + dayIndex).padStart(2, "0")
  const midnight = new Date(`2026-10-${day}T00:00:00+09:00`).getTime()
  return new Date(midnight + minutes * 60_000)
}

export function DemoTimeSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-3xl">
        {/* 닫히면 내용이 언마운트되므로 열 때마다 현재 시계로 다시 시작한다 */}
        <DemoTimeForm onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}

/** 주소에 ?at=이 있으면 그대로 붙여 검수 직원 화면으로 간다. */
function staffHref(search: string): string {
  const at = new URLSearchParams(search).get("at")
  // 시각의 ':'은 그대로 두어 주소를 읽기 쉽게 한다
  return at
    ? `/staff?at=${encodeURIComponent(at).replace(/%3A/gi, ":")}`
    : "/staff"
}

function DemoTimeForm({ onDone }: { onDone: () => void }) {
  const { now, setDemo } = useClock()
  const { search } = useLocation()
  const [day, setDay] = useState(() => Math.max(0, seoulWeekdayIndex(now)))
  const [minutes, setMinutes] = useState(() =>
    Math.min(MAX, Math.max(MIN, Math.round(seoulMinutes(now) / 5) * 5))
  )

  return (
    <>
      <SheetHeader>
        <SheetTitle>시연 시간</SheetTitle>
        <SheetDescription>
          보고 싶은 요일과 시각을 고르면 화면이 그 시각 기준으로 바뀌어요.
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-6 px-6">
        <ToggleGroup
          value={[String(day)]}
          onValueChange={(v) => {
            if (v[0] !== undefined) setDay(Number(v[0]))
          }}
          spacing={1}
          aria-label="요일"
          className="w-full"
        >
          {DAYS.map((d, i) => (
            <ToggleGroupItem
              key={d}
              value={String(i)}
              aria-label={`${d}요일`}
              className="flex-1"
            >
              {d}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="flex flex-col gap-3">
          <p
            id="demo-time-label"
            className="text-2xl font-semibold tabular-nums"
          >
            {formatMinutes(minutes % 1440)}
            {minutes >= 1440 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                다음 날
              </span>
            )}
          </p>
          <Slider
            aria-labelledby="demo-time-label"
            min={MIN}
            max={MAX}
            step={5}
            value={[minutes]}
            onValueChange={(v) => setMinutes(Array.isArray(v) ? v[0] : v)}
          />
        </div>
      </div>
      <SheetFooter>
        <Button
          onClick={() => {
            setDemo(demoDate(day, minutes))
            onDone()
          }}
        >
          이 시각으로 보기
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setDemo(null)
            onDone()
          }}
        >
          실시간으로 돌아가기
        </Button>
        <Link
          to={staffHref(search)}
          onClick={onDone}
          className={cn(buttonVariants({ variant: "link" }), "h-11 self-center")}
        >
          검수 직원 화면 열기
        </Link>
      </SheetFooter>
    </>
  )
}
