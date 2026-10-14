import { act, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createClock } from "@/lib/clock"
import StaffPage from "@/pages/Staff"
import { renderAt } from "@/test/render"
import { t } from "@/test/time"

beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

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
