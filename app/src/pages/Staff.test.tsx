import { act, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createClock } from "@/lib/clock"
import { isSoldOut } from "@/lib/override"
import MenuPage from "@/pages/Menu"
import StaffPage from "@/pages/Staff"
import { renderAt } from "@/test/render"
import { t } from "@/test/time"

beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

const pickHall = (name: string) =>
  userEvent.click(
    within(screen.getByRole("group", { name: "식당" })).getByRole("button", {
      name,
    })
  )
const switchNames = () =>
  screen.getAllByRole("switch").map((s) => s.getAttribute("aria-labelledby"))
    .map((id) => document.getElementById(id!)!.textContent)

describe("Staff sold-out switches (R21)", () => {
  it("east lists every course of the current meal", () => {
    renderAt("2026-10-12T18:00", <StaffPage />)
    expect(switchNames()).toEqual(["석식 A 품절", "석식 B 품절"])
    expect(
      screen.queryByText("품절 입력은 동관 석식에만 있어요")
    ).toBeNull()
  })

  it("east at lunch lists the lunch course, not dinner", () => {
    renderAt("2026-10-14T12:20", <StaffPage />)
    expect(switchNames()).toEqual(["중식 품절"])
  })

  it("east falls back to the next meal today", () => {
    renderAt("2026-10-14T15:30", <StaffPage />)
    expect(switchNames()).toEqual(["석식 품절"])
  })

  it("east after midnight marks the late-night meal of the day it started", async () => {
    renderAt("2026-10-15T00:30", <StaffPage />)
    expect(switchNames()).toEqual(["야식 품절"])
    await userEvent.click(screen.getByRole("switch", { name: "야식 품절" }))
    expect(isSoldOut("east", "lateNight", undefined, t("2026-10-14T23:40"))).toBe(true)
  })

  it("westNew lists its lunch and the menu shows it sold out", async () => {
    renderAt(
      "2026-10-14T12:20",
      <>
        <StaffPage />
        <MenuPage />
      </>
    )
    await pickHall("서관·신관")
    expect(switchNames()).toEqual(["중식 품절"])
    const west = screen.getByRole("region", { name: /^서관·신관/ })
    expect(within(west).queryByText("품절")).toBeNull()
    await userEvent.click(screen.getByRole("switch", { name: "중식 품절" }))
    expect(within(west).getByText("품절")).toBeInTheDocument()
    expect(
      within(screen.getByRole("region", { name: /^동관/ })).queryByText("품절")
    ).toBeNull()
  })

  it("westNew with nothing left today says so", async () => {
    renderAt("2026-10-14T15:30", <StaffPage />)
    await pickHall("서관·신관")
    expect(screen.queryAllByRole("switch")).toHaveLength(0)
    expect(
      screen.getByText("오늘은 서관·신관에 남은 배식이 없어요")
    ).toBeInTheDocument()
  })
})

describe("Staff", () => {
  it("shows the muted fallback when no override is active", () => {
    renderAt("2026-10-14T12:20", <StaffPage />)
    expect(
      screen.getByText("지금은 예측값을 보여주고 있어요")
    ).toBeInTheDocument()
  })

  it("counts down the remaining minutes on the real clock", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-10-20T01:00:00Z"))
    const clock = createClock()
    clock.setDemo(t("2026-10-14T12:20"))
    renderAt("2026-10-14T12:20", <StaffPage />, { clock })

    await userEvent.click(screen.getByRole("button", { name: /^줄 있음/ }))
    expect(screen.getByText("12:20에 입력, 15분 남음")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^줄 있음/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    )

    vi.setSystemTime(new Date("2026-10-20T01:01:00Z"))
    act(() => clock.tick())
    expect(screen.getByText("12:20에 입력, 14분 남음")).toBeInTheDocument()

    // 시연 시각을 크게 옮겨도 남은 시간은 실제 시간으로만 줄어든다
    act(() => clock.setDemo(t("2026-10-16T18:00")))
    expect(screen.getByText("12:20에 입력, 14분 남음")).toBeInTheDocument()

    vi.setSystemTime(new Date("2026-10-20T01:15:00Z"))
    act(() => clock.tick())
    expect(
      screen.getByText("지금은 예측값을 보여주고 있어요")
    ).toBeInTheDocument()
  })
})
