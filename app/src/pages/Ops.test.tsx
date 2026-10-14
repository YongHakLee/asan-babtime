import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { setSoldOut } from "@/lib/override"
import OpsPage from "@/pages/Ops"
import { renderAt } from "@/test/render"
import { t } from "@/test/time"

describe("OpsPage", () => {
  it("shows the title, the mock-data line and five sections in spec order", () => {
    renderAt("2026-10-14T12:20", <OpsPage />)
    expect(
      screen.getByRole("heading", { level: 1, name: "운영자 화면" })
    ).toBeInTheDocument()
    expect(
      screen.getByText("모의 데이터로 보여주는 식당 운영 요약이에요")
    ).toBeInTheDocument()
    expect(screen.getAllByText(/모의 데이터/).length).toBeGreaterThan(1)
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)
    ).toEqual([
      "지금 상황",
      "오늘 시간대별 입장 추정",
      "품절 기록",
      "만족도·잔반",
      "내일 준비 제안",
    ])
  })

  it("lists every hall's current status", () => {
    renderAt("2026-10-14T12:20", <OpsPage />)
    const now = screen.getByRole("region", { name: "지금 상황" })
    for (const name of ["동관", "서관", "신관"])
      expect(within(now).getByText(name)).toBeInTheDocument()
  })

  it("shows an empty state when nothing is sold out", () => {
    renderAt("2026-10-14T12:20", <OpsPage />)
    expect(screen.getByText("오늘 품절 입력이 없어요")).toBeInTheDocument()
  })

  it("lists today's sold-out input", () => {
    setSoldOut(
      {
        hall: "east",
        meal: "lunch",
        date: "2026-10-14",
        at: t("2026-10-14T12:10").getTime(),
      },
      true
    )
    renderAt("2026-10-14T12:20", <OpsPage />)
    const log = screen.getByRole("region", { name: "품절 기록" })
    expect(within(log).getByText("동관 중식")).toBeInTheDocument()
    expect(within(log).getByText("12:10")).toBeInTheDocument()
  })

  it("suggests tomorrow's preparation (Tuesday → Wednesday)", () => {
    renderAt("2026-10-13T16:00", <OpsPage />)
    const prep = screen.getByRole("region", { name: "내일 준비 제안" })
    expect(
      within(prep).getByText(/동관 배식 라인 추가 검토$/)
    ).toBeInTheDocument()
    expect(
      within(prep).getByText("동관 꽈리고추간장닭갈비 준비량 상향 검토")
    ).toBeInTheDocument()
  })
})
