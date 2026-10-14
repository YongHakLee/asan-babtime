import { BuildingTile } from "@/components/common/BuildingTile"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SERVICE_WINDOWS, VENUES } from "@/data/restaurants"
import type { DayKind, MealKey, VenueId } from "@/domain/types"
import { DAY_KIND_LABEL, dayKind, getServiceStatus } from "@/lib/hours"
import { MEAL_LABEL } from "@/lib/recommend"
import { cn } from "@/lib/utils"

const DAYS: DayKind[] = ["weekday", "saturday", "sundayOrHoliday"]
/** 배식 시각 순서 (이동식 21:30 → 야식 23:30) */
const MEALS: MealKey[] = ["breakfast", "lunch", "dinner", "mobile", "lateNight"]

type Row = {
  meal: MealKey
  note?: string
  cells: Record<DayKind, { start: string; end: string } | null>
}

function rowsFor(venue: VenueId): Row[] {
  return MEALS.flatMap((meal) => {
    const ws = SERVICE_WINDOWS.filter(
      (w) => w.venue === venue && w.meal === meal
    )
    if (ws.length === 0) return []
    const cells = Object.fromEntries(
      DAYS.map((d) => {
        const w = ws.find((x) => x.days.includes(d))
        return [d, w ? { start: w.start, end: w.end } : null]
      })
    ) as Row["cells"]
    // 끼니 이름과 같은 메모(이동식)는 되풀이하지 않는다
    const note = ws.find((w) => w.displayNote)?.displayNote
    return [{ meal, note: note === MEAL_LABEL[meal] ? undefined : note, cells }]
  })
}

/** 식당 하나의 끼니별·요일 유형별 운영시간. 지금 열린 끼니는 굵게 표시한다. */
export function HoursTable({ venue, now }: { venue: VenueId; now: Date }) {
  const v = VENUES[venue]
  const today = dayKind(now)

  return (
    <Table className="table-fixed caption-top text-[0.8125rem]">
      <TableCaption className="mt-0 mb-1 text-left text-foreground">
        <span className="flex items-center gap-2">
          <BuildingTile
            glyph={v.short}
            tone={venue === "boxLunch" ? "soft" : "solid"}
            className="size-6 rounded-md text-[0.75rem]"
          />
          <span className="text-[0.9375rem] font-semibold tracking-tight">
            {v.name}
          </span>{" "}
          <span className="sr-only">운영시간</span>
        </span>
      </TableCaption>
      <colgroup>
        <col className="w-[26%]" />
        <col />
        <col />
        <col />
      </colgroup>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead
            scope="col"
            className="h-9 px-0 text-xs font-normal text-muted-foreground"
          >
            끼니
          </TableHead>
          {DAYS.map((d) => (
            <TableHead
              key={d}
              scope="col"
              className={cn(
                "h-9 pr-1 pl-0 text-xs",
                d === today
                  ? "font-semibold text-primary"
                  : "font-normal text-muted-foreground"
              )}
            >
              {DAY_KIND_LABEL[d]}
              {d === today && <span className="sr-only">, 오늘</span>}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rowsFor(venue).map((r) => {
          const open = getServiceStatus(venue, r.meal, now).kind === "open"
          return (
            <TableRow
              key={r.meal}
              className={cn("hover:bg-transparent", open && "font-semibold")}
            >
              <TableHead
                scope="row"
                className="h-auto px-0 py-2.5 align-top whitespace-normal"
              >
                <span className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className={open ? "font-bold" : "font-medium"}>
                    {MEAL_LABEL[r.meal]}
                  </span>
                  {open && (
                    <span className="text-[0.6875rem] font-semibold text-primary">
                      운영 중
                    </span>
                  )}
                </span>
                {r.note && (
                  <span className="mt-0.5 flex flex-col text-[0.6875rem] leading-snug font-normal text-muted-foreground">
                    {r.note.split(", ").map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </span>
                )}
              </TableHead>
              {DAYS.map((d) => (
                <TableCell
                  key={d}
                  className={cn(
                    "py-2.5 pr-1 pl-0 align-top text-xs tracking-tight whitespace-normal tabular-nums",
                    d === today ? "text-foreground" : "text-muted-foreground",
                    !r.cells[d] && "font-normal text-muted-foreground"
                  )}
                >
                  {r.cells[d] ? (
                    // 좁은 화면에서는 줄표 뒤에서 줄을 바꾼다
                    <>
                      {r.cells[d].start}–<wbr />
                      {r.cells[d].end}
                    </>
                  ) : (
                    "운영 안 함"
                  )}
                </TableCell>
              ))}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
