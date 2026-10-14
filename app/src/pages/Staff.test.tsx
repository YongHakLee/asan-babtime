import { act, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { createClock } from "@/lib/clock"
import StaffPage from "@/pages/Staff"
import { renderAt } from "@/test/render"
import { t } from "@/test/time"

beforeEach(() => localStorage.clear())

describe("Staff", () => {
  it("shows the muted fallback when no override is active", () => {
    renderAt("2026-10-14T12:20", <StaffPage />)
    expect(
      screen.getByText("지금은 예측값을 보여주고 있어요")
    ).toBeInTheDocument()
  })

  it("counts down the remaining minutes of the override", async () => {
    let real = Date.now()
    const clock = createClock(() => real)
    clock.setDemo(t("2026-10-14T12:20"))
    renderAt("2026-10-14T12:20", <StaffPage />, { clock })

    await userEvent.click(screen.getByRole("button", { name: /^줄 있음/ }))
    expect(screen.getByText("12:20에 입력, 15분 남음")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^줄 있음/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    )

    real += 60_000
    act(() => clock.tick())
    expect(screen.getByText("12:20에 입력, 14분 남음")).toBeInTheDocument()
  })
})
