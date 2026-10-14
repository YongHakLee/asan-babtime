import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes, useLocation } from "react-router"
import { describe, expect, it } from "vitest"

import { Header } from "@/components/layout/Header"
import { renderAt } from "@/test/render"

function Where() {
  const { pathname, search } = useLocation()
  return <p data-testid="where">{pathname + search}</p>
}

const ui = (
  <Routes>
    <Route path="/" element={<Header />} />
    <Route path="/staff" element={<Where />} />
    <Route path="/ops" element={<Where />} />
  </Routes>
)

describe("DemoTimeSheet staff link", () => {
  it("opens the staff screen and keeps ?at=", async () => {
    renderAt("2026-10-14T12:20", ui, { route: "/?at=2026-10-14T12:20" })
    await userEvent.click(screen.getByRole("button", { name: "시연 시간" }))
    await userEvent.click(
      await screen.findByRole("link", { name: "검수 직원 화면 열기" })
    )
    expect(screen.getByTestId("where")).toHaveTextContent(
      "/staff?at=2026-10-14T12:20"
    )
  })

  it("opens /staff without a query when there is no ?at=", async () => {
    renderAt("2026-10-14T12:20", ui)
    await userEvent.click(screen.getByRole("button", { name: "시연 시간" }))
    await userEvent.click(
      await screen.findByRole("link", { name: "검수 직원 화면 열기" })
    )
    expect(screen.getByTestId("where").textContent).toBe("/staff")
  })
})

describe("DemoTimeSheet ops link", () => {
  it("opens the ops screen and keeps ?at=", async () => {
    renderAt("2026-10-14T12:20", ui, { route: "/?at=2026-10-14T12:20" })
    await userEvent.click(screen.getByRole("button", { name: "시연 시간" }))
    await userEvent.click(
      await screen.findByRole("link", { name: "운영자 화면 열기" })
    )
    expect(screen.getByTestId("where")).toHaveTextContent(
      "/ops?at=2026-10-14T12:20"
    )
  })

  it("opens /ops without a query when there is no ?at=", async () => {
    renderAt("2026-10-14T12:20", ui)
    await userEvent.click(screen.getByRole("button", { name: "시연 시간" }))
    await userEvent.click(
      await screen.findByRole("link", { name: "운영자 화면 열기" })
    )
    expect(screen.getByTestId("where").textContent).toBe("/ops")
  })
})
