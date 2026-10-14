import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import Home from "@/pages/Home"
import { renderAt } from "@/test/render"

describe("Home", () => {
  it("shows headline and statuses at Wed 12:20", () => {
    renderAt("2026-10-14T12:20", <Home />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "지금은 서관·신관이 바로 드실 수 있어요"
    )
    expect(
      within(screen.getByRole("listitem", { name: /동관 직원식당/ })).getByText(
        /줄 있음|혼잡/
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText("꽈리고추간장닭갈비, 순두부찌개")
    ).toBeInTheDocument()
  })

  it("shows wait, forecast only on the busy hall, and box lunch pickup", () => {
    renderAt("2026-10-14T12:20", <Home />)
    const east = screen.getByRole("listitem", { name: "동관 직원식당" })
    const west = screen.getByRole("listitem", { name: "서관·신관 직원식당" })
    const box = screen.getByRole("listitem", { name: "간편식 도시락" })
    expect(within(east).getByText(/^약 \d+분$/)).toBeInTheDocument()
    expect(
      within(east).getByRole("list", { name: /예상 대기/ })
    ).toBeInTheDocument()
    expect(within(west).getByText("여유")).toBeInTheDocument()
    expect(within(west).getByText("대기 없음")).toBeInTheDocument()
    expect(within(west).queryByRole("list", { name: /예상 대기/ })).toBeNull()
    expect(within(box).getByText("13:00까지")).toBeInTheDocument()
    expect(within(box).getByText("수령")).toBeInTheDocument()
  })

  it("outside service hours shows next service and no empty list", () => {
    renderAt("2026-10-14T15:30", <Home />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "다음 배식은 석식 17:30부터예요"
    )
    expect(screen.getByText(/^석식 메뉴: /)).toBeInTheDocument()
    const east = screen.getByRole("listitem", { name: "동관 직원식당" })
    const west = screen.getByRole("listitem", { name: "서관·신관 직원식당" })
    const box = screen.getByRole("listitem", { name: "간편식 도시락" })
    expect(within(east).getByText("17:30 시작")).toBeInTheDocument()
    expect(within(west).getByText("오늘 운영 종료")).toBeInTheDocument()
    expect(within(box).getByText("오늘 마감")).toBeInTheDocument()
    expect(within(east).queryByText(/줄 있음|혼잡|여유|보통/)).toBeNull()
  })

  it("shows weekend closure in words", () => {
    renderAt("2026-10-17T12:20", <Home />)
    const west = screen.getByRole("listitem", { name: "서관·신관 직원식당" })
    expect(within(west).getByText("주말 휴무")).toBeInTheDocument()
  })

  it("shows a weekday holiday closure in words", () => {
    renderAt("2026-10-09T12:20", <Home />)
    const west = screen.getByRole("listitem", { name: "서관·신관 직원식당" })
    expect(within(west).getByText("공휴일 휴무")).toBeInTheDocument()
  })

  it("labels prediction as simulation", () => {
    renderAt("2026-10-14T12:20", <Home />)
    expect(screen.getByText("모의 데이터 기반 예측 시연")).toBeInTheDocument()
  })

  it("has a single h1", () => {
    renderAt("2026-10-14T12:20", <Home />)
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })
})
