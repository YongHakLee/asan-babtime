import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Header } from "@/components/layout/Header"
import { TabBar } from "@/components/layout/TabBar"
import { renderAt } from "@/test/render"

describe("brand orange in the shell", () => {
  it("shows the demo state as an orange badge", () => {
    renderAt("2026-10-14T12:20", <Header />)
    const badge = screen.getByText("시연 중")
    expect(badge).toHaveAttribute("data-slot", "badge")
    expect(badge).toHaveClass("bg-brand-orange")
  })

  it("draws no decorative orange lines in the header or tab bar", () => {
    const { container } = renderAt(
      "2026-10-14T12:20",
      <>
        <Header />
        <TabBar />
      </>,
      { route: "/menu" }
    )
    expect(
      [...container.querySelectorAll(".bg-brand-orange")].map(
        (el) => el.textContent
      )
    ).toEqual(["시연 중"])
  })
})
