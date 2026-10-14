import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useClock } from "@/hooks/useClock"
import { createClock } from "@/lib/clock"
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

  it("injected clock changed before mount: now and isDemo agree immediately", () => {
    const clock = createClock()
    const demo = new Date("2026-10-14T12:20:00+09:00")
    const setDemo = clock.setDemo
    // seed state change that happens between render and subscribe
    let first = true
    clock.subscribe = ((orig) => (fn: () => void) => {
      if (first) {
        first = false
        setDemo(demo)
      }
      return orig(fn)
    })(clock.subscribe.bind(clock))
    render(
      <ClockProvider clock={clock}>
        <Probe />
      </ClockProvider>
    )
    expect(screen.getByTestId("d").textContent).toBe("true")
    expect(Math.abs(shown() - demo.getTime())).toBeLessThan(5000)
  })
})

describe("ClockProvider ?at= query", () => {
  const setSearch = (s: string) =>
    window.history.replaceState(null, "", `/${s}`)
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    setSearch("")
    vi.useRealTimers()
  })

  const nowAfterMount = () => {
    const r = render(
      <ClockProvider>
        <Probe />
      </ClockProvider>
    )
    const v = shown()
    r.unmount()
    return v
  }

  it("tabs opened at different real times share one demo time", () => {
    setSearch("?at=2026-10-14T12:20")
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-10-14T03:00:00Z"))
    const first = nowAfterMount()
    vi.setSystemTime(new Date("2026-10-14T03:00:30Z"))
    const second = nowAfterMount()
    expect(first).toBe(new Date("2026-10-14T12:20:00+09:00").getTime())
    expect(second - first).toBe(30_000)
  })

  it("resets the anchor when stale (over 6 h) or when at differs", () => {
    setSearch("?at=2026-10-14T12:20")
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-10-14T03:00:00Z"))
    nowAfterMount()
    vi.setSystemTime(new Date("2026-10-14T09:30:00Z"))
    expect(nowAfterMount()).toBe(new Date("2026-10-14T12:20:00+09:00").getTime())
    setSearch("?at=2026-10-14T18:00")
    vi.setSystemTime(new Date("2026-10-14T09:31:00Z"))
    expect(nowAfterMount()).toBe(new Date("2026-10-14T18:00:00+09:00").getTime())
  })

  it("starts in demo at the Seoul time given by ?at=", () => {
    setSearch("?at=2026-10-14T12:20")
    render(
      <ClockProvider>
        <Probe />
      </ClockProvider>
    )
    expect(screen.getByTestId("d").textContent).toBe("true")
    const demo = new Date("2026-10-14T12:20:00+09:00").getTime()
    expect(shown()).toBeGreaterThanOrEqual(demo)
    expect(shown()).toBeLessThan(demo + 5000)
    expect(window.location.search).toBe("?at=2026-10-14T12:20")
  })

  it("ignores an invalid ?at=", () => {
    setSearch("?at=not-a-time")
    render(
      <ClockProvider>
        <Probe />
      </ClockProvider>
    )
    expect(screen.getByTestId("d").textContent).toBe("false")
  })
})
