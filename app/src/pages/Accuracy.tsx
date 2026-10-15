import { useEffect, useReducer, useState, type ReactNode } from "react"
import { Link, useLocation, useNavigate } from "react-router"

import { AccuracyBars } from "@/components/ops/AccuracyBars"
import { Button, buttonVariants } from "@/components/ui/button"
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DINING_HALLS as HALLS, VENUES } from "@/data/restaurants"
import { useClock } from "@/hooks/useClock"
import {
  accuracyBins,
  accuracySummary,
  judgedEntries,
  type AccuracyBin,
  type AccuracyHall,
} from "@/lib/accuracy"
import { keepAt } from "@/lib/demoLink"
import { subscribeOverrides } from "@/lib/override"
import { cn } from "@/lib/utils"

const FILTERS: { value: AccuracyHall; label: string }[] = [
  { value: "all", label: "전체" },
  ...HALLS.map((h) => ({ value: h, label: VENUES[h].label })),
]

const isFilter = (v: string | null): v is AccuracyHall =>
  FILTERS.some((f) => f.value === v)

/** 핵심 수치 하나(라벨 + 값). 카드를 반복하지 않고 구분선으로 나눈다. */
function Kpi({
  label,
  value,
  hero,
  sub,
}: {
  label: string
  value: string
  hero?: boolean
  sub?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="text-xs leading-snug text-pretty text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "leading-none font-bold tracking-tight",
          hero ? "text-5xl" : "text-2xl"
        )}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function BinTable({ bins }: { bins: AccuracyBin[] }) {
  // 390px 화면에서도 여섯 열이 가로 스크롤 없이 들어가게 칸 여백을 줄인다
  const num = "px-2 text-right tabular-nums"
  const head = "px-2 text-right"
  return (
    <Table className="text-[0.8125rem]">
      <TableHeader>
        <TableRow>
          <TableHead className="px-2">시간대</TableHead>
          <TableHead className={head}>입력</TableHead>
          <TableHead className={head}>일치</TableHead>
          <TableHead className={head}>일치율</TableHead>
          <TableHead className={head}>낮게 봄</TableHead>
          <TableHead className={head}>높게 봄</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bins.map((b) => (
          <TableRow key={b.start}>
            <TableCell className="px-2 tabular-nums">{`${b.start}–${b.end}`}</TableCell>
            <TableCell className={num}>{b.total}</TableCell>
            <TableCell className={num}>{b.match}</TableCell>
            <TableCell className={num}>
              {b.matchPct === null ? "없음" : `${b.matchPct}%`}
            </TableCell>
            <TableCell className={num}>{b.under}</TableCell>
            <TableCell className={num}>{b.over}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function Section({
  id,
  title,
  caption,
  children,
}: {
  id: string
  title: string
  caption: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-base font-bold tracking-tight">
          {title}
        </h2>
        <p className="text-xs leading-snug text-muted-foreground">{caption}</p>
      </div>
      {children}
    </section>
  )
}

export default function AccuracyPage() {
  const { now } = useClock()
  const { search } = useLocation()
  const navigate = useNavigate()
  const [tableOpen, setTableOpen] = useState(false)
  // 직원 입력이 바뀌면(다른 탭 포함) 다시 그린다
  const [, bump] = useReducer((n: number) => n + 1, 0)
  useEffect(() => subscribeOverrides(bump), [])

  const raw = new URLSearchParams(search).get("hall")
  const hall: AccuracyHall = isFilter(raw) ? raw : "all"

  const setHall = (next: AccuracyHall) => {
    const params = new URLSearchParams(search)
    if (next === "all") params.delete("hall")
    else params.set("hall", next)
    // 시각의 ':'은 그대로 두어 주소를 읽기 쉽게 한다(keepAt과 같은 표기)
    const s = params.toString().replace(/%3A/gi, ":")
    navigate({ search: s ? `?${s}` : "" }, { replace: true })
  }

  const entries = judgedEntries(now)
  const summary = accuracySummary(entries, hall)
  const bins = accuracyBins(entries, hall)

  return (
    <main className="flex flex-1 flex-col">
      <section
        aria-labelledby="accuracy-title"
        className="bg-deep px-4 pt-4 pb-[2.125rem] text-deep-foreground"
      >
        <div className="mx-auto max-w-5xl">
          <h1
            id="accuracy-title"
            className="text-[1.5625rem] leading-tight font-bold tracking-[-0.035em]"
          >
            예측 점검
          </h1>
          <p className="mt-1 text-xs text-pretty text-deep-muted">
            검수 직원 입력과 그 순간의 모델 예측을 비교했어요. 모의 데이터라
            실제 모델 성능이 아니에요
          </p>
        </div>
      </section>

      <div className="relative -mt-[18px] flex flex-1 flex-col rounded-t-3xl bg-card px-4 pt-5 pb-8">
        {/* 머리글과 왼쪽 끝을 맞추되, 그래프가 넓게 퍼지지 않게 폭을 줄인다 */}
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex max-w-2xl flex-col gap-6">
            <ToggleGroup
              aria-label="식당"
              value={[hall]}
              onValueChange={(v) => {
                if (v[0] !== undefined) setHall(v[0] as AccuracyHall)
              }}
              spacing={1.5}
              className="grid w-full grid-cols-4"
            >
              {FILTERS.map((f) => (
                <ToggleGroupItem
                  key={f.value}
                  value={f.value}
                  className="h-11 border border-border text-[0.9375rem] aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:font-semibold aria-pressed:text-primary"
                >
                  {f.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            {summary.total === 0 ? (
              <Empty className="py-10">
                <EmptyHeader>
                  <EmptyTitle>이 기간에는 비교할 입력이 없어요</EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  <div className="flex items-stretch gap-4 sm:gap-8">
                    <Kpi
                      hero
                      label="등급 일치율"
                      value={`${summary.matchPct}%`}
                    />
                    <Separator orientation="vertical" />
                    <Kpi label="입력" value={`${summary.total}건`} />
                    <Separator orientation="vertical" />
                    <Kpi
                      label="모델이 낮게 봤어요"
                      value={`${summary.underPct}%`}
                      sub={`높게 봤어요 ${summary.overPct}%`}
                    />
                  </div>
                  <p className="text-xs leading-snug text-pretty text-muted-foreground">
                    10월 12일부터 지금 시각까지의 평일 중식 입력이에요. 모의
                    입력에 이 브라우저에서 넣은 입력을 더했고, 취소한 입력은
                    뺐어요.
                  </p>
                </div>

                <Separator />

                <Section
                  id="accuracy-bins"
                  title="시간대별 일치율"
                  caption="평일 중식, 30분 단위"
                >
                  <AccuracyBars bins={bins} average={summary.matchPct} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-expanded={tableOpen}
                    aria-controls="accuracy-table"
                    onClick={() => setTableOpen((o) => !o)}
                    className="self-end"
                  >
                    {tableOpen ? "표 닫기" : "표로 보기"}
                  </Button>
                  {tableOpen && (
                    <div id="accuracy-table">
                      <BinTable bins={bins} />
                    </div>
                  )}
                </Section>
              </>
            )}

            <Link
              to={keepAt("/ops", search)}
              className={cn(buttonVariants({ variant: "link" }), "self-start")}
            >
              운영자 화면 보기
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
