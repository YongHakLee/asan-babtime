import { act, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useClock } from "@/hooks/useClock"
import { ClockProvider } from "./clock"

function Probe() {
  const { now, isDemo, setDemo } = useClock()
  return (
    <div>
      <span data-testid="t">{now.toISOString()}</span>
      <span data-testid="d">{String(isDemo)}</span>
      <button onClick={() => setDemo(null)}>real</button>
    </div>
  )
}

const shown = () => new Date(screen.getByTestId("t").textContent!).getTime()

describe("ClockProvider", () => {
  it("shows injected demo time and returns to real time on setDemo(null)", () => {
    const demo = new Date("2026-10-14T12:20:00+09:00")
    render(
      <ClockProvider initialDemo={demo}>
        <Probe />
      </ClockProvider>
    )
    expect(screen.getByTestId("d").textContent).toBe("true")
    expect(shown()).toBeGreaterThanOrEqual(demo.getTime())
    expect(shown()).toBeLessThan(demo.getTime() + 5000)

    const before = Date.now()
    act(() => screen.getByText("real").click())
    expect(screen.getByTestId("d").textContent).toBe("false")
    expect(shown()).toBeGreaterThanOrEqual(before)
  })
})
