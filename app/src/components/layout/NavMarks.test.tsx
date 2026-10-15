import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Header } from "@/components/layout/Header"
import { TabBar } from "@/components/layout/TabBar"
import { renderAt } from "@/test/render"

describe("brand orange marks", () => {
  it("puts a short orange line under the 밥타임 wordmark", () => {
    renderAt("2026-10-14T12:20", <Header />)
    const mark = screen
      .getByText("밥타임")
      .querySelector("[data-slot=brand-mark]")
    expect(mark).toHaveClass("bg-brand-orange")
    expect(mark).toHaveAttribute("aria-hidden", "true")
  })

  it("marks only the current menu in both the header and the tab bar", () => {
    renderAt(
      "2026-10-14T12:20",
      <>
        <Header />
        <TabBar />
      </>,
      { route: "/menu" }
    )
    const navs = screen.getAllByRole("navigation", { name: "주요 메뉴" })
    expect(navs).toHaveLength(2)
    for (const nav of navs) {
      const marks = nav.querySelectorAll("[data-slot=active-mark]")
      expect(marks).toHaveLength(1)
      expect(marks[0]).toHaveClass("bg-brand-orange")
      expect(marks[0]).toHaveAttribute("aria-hidden", "true")
      expect(
        within(nav).getByRole("link", { name: "메뉴" }).contains(marks[0])
      ).toBe(true)
    }
  })
})
