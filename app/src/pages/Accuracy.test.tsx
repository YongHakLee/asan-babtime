import { act, fireEvent, screen, within } from "@testing-library/react"
import { useLocation } from "react-router"
import { describe, expect, it } from "vitest"

import { accuracySummary, judgedEntries } from "@/lib/accuracy"
import { addStaffEntry } from "@/lib/override"
import AccuracyPage from "@/pages/Accuracy"
import { renderAt } from "@/test/render"
import { t } from "@/test/time"

const AT = "2026-10-14T12:20"
const ROUTE = `/ops/accuracy?at=${AT}`

function SearchProbe() {
  return <output data-testid="search">{useLocation().search}</output>
}

/** 라벨과 같은 묶음(라벨과 값을 감싼 div)의 글자 */
const tile = (label: string) => screen.getByText(label).closest("div")!

describe("AccuracyPage", () => {
  it("shows the KPI row", () => {
    renderAt(AT, <AccuracyPage />, { route: ROUTE })
    const s = accuracySummary(judgedEntries(t(AT)), "all")
    expect(s.total).toBeGreaterThan(0)
    expect(
      screen.getByRole("heading", { level: 1, name: "예측 점검" })
    ).toBeInTheDocument()
    expect(tile("등급 일치율")).toHaveTextContent(`${s.matchPct}%`)
    expect(tile("입력")).toHaveTextContent(`${s.total}건`)
    expect(tile("모델이 낮게 봤어요")).toHaveTextContent(`${s.underPct}%`)
    expect(screen.getByText(`높게 봤어요 ${s.overPct}%`)).toBeInTheDocument()
  })

  it("filter narrows every number and keeps ?at=", () => {
    renderAt(
      AT,
      <>
        <AccuracyPage />
        <SearchProbe />
      </>,
      { route: ROUTE }
    )
    fireEvent.click(screen.getByRole("button", { name: "서관" }))
    const west = accuracySummary(judgedEntries(t(AT)), "west")
    expect(tile("입력")).toHaveTextContent(`${west.total}건`)
    expect(tile("등급 일치율")).toHaveTextContent(`${west.matchPct}%`)
    expect(screen.getByTestId("search")).toHaveTextContent(
      `?at=${AT}&hall=west`
    )
    fireEvent.click(screen.getByRole("button", { name: "전체" }))
    expect(screen.getByTestId("search")).toHaveTextContent(`?at=${AT}`)
    expect(screen.getByTestId("search")).not.toHaveTextContent("hall=")
  })

  it("unknown ?hall= falls back to all", () => {
    renderAt(AT, <AccuracyPage />, { route: "/ops/accuracy?hall=westNew" })
    expect(screen.getByRole("button", { name: "전체" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  })

  it("bar press shows the bin readout", () => {
    renderAt(AT, <AccuracyPage />, { route: ROUTE })
    const readout = screen.getByText("막대를 누르면 시간대별 수치가 보여요")
    fireEvent.click(screen.getByRole("button", { name: /^11:30–12:00 / }))
    expect(readout.textContent).toMatch(
      /^11:30–12:00 일치 \d+%\(\d+건 중 \d+건\), 모델이 낮게 봄 \d+건(, 표본이 적어요)?$/
    )
    expect(readout).toHaveAttribute("aria-live", "polite")
  })

  it("average line is labelled", () => {
    renderAt(AT, <AccuracyPage />, { route: ROUTE })
    const s = accuracySummary(judgedEntries(t(AT)), "all")
    expect(screen.getByText(`평균 ${s.matchPct}%`)).toBeInTheDocument()
  })

  it("table view lists every bin", () => {
    renderAt(AT, <AccuracyPage />, { route: ROUTE })
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "표로 보기" }))
    const table = screen.getByRole("table")
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((h) => h.textContent)
    ).toEqual(["시간대", "입력", "일치", "일치율", "낮게 봄", "높게 봄"])
    // 머리 1행 + 본문 8행
    expect(within(table).getAllByRole("row")).toHaveLength(9)
    expect(screen.getByRole("button", { name: "표 닫기" })).toBeInTheDocument()
  })

  it("shows the empty state before any input", () => {
    renderAt("2026-10-12T11:00", <AccuracyPage />, {
      route: "/ops/accuracy?at=2026-10-12T11:00",
    })
    expect(
      screen.getByText("이 기간에는 비교할 입력이 없어요")
    ).toBeInTheDocument()
    expect(screen.queryByText("등급 일치율")).not.toBeInTheDocument()
    expect(screen.queryByText("시간대별 일치율")).not.toBeInTheDocument()
    expect(
      screen.queryByText("막대를 누르면 시간대별 수치가 보여요")
    ).not.toBeInTheDocument()
  })

  it("reacts to a new staff entry", () => {
    renderAt(AT, <AccuracyPage />, { route: ROUTE })
    const before = accuracySummary(judgedEntries(t(AT)), "all").total
    expect(tile("입력")).toHaveTextContent(`${before}건`)
    act(() => {
      addStaffEntry("west", "busy", t("2026-10-14T12:15"))
    })
    expect(tile("입력")).toHaveTextContent(`${before + 1}건`)
  })
})
