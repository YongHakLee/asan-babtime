import { describe, expect, it, vi } from "vitest"

import { createClock } from "./clock"

describe("createClock", () => {
  it("returns real time by default", () => {
    const r = 1000
    const c = createClock(() => r)
    expect(c.now().getTime()).toBe(1000)
    expect(c.isDemo()).toBe(false)
  })

  it("demo time advances with real time", () => {
    let r = 0
    const c = createClock(() => r)
    c.setDemo(new Date("2026-10-14T12:20:00+09:00"))
    r += 60_000
    expect(c.now().toISOString()).toBe("2026-10-14T03:21:00.000Z")
    expect(c.isDemo()).toBe(true)
  })

  it("setDemo(null) returns to real time and notifies", () => {
    const r = 5000
    const c = createClock(() => r)
    c.setDemo(new Date(0))
    const fn = vi.fn()
    const unsub = c.subscribe(fn)
    c.setDemo(null)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(c.isDemo()).toBe(false)
    expect(c.now().getTime()).toBe(5000)
    unsub()
    c.tick()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("tick notifies subscribers", () => {
    const c = createClock(() => 0)
    const fn = vi.fn()
    c.subscribe(fn)
    c.tick()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("demoVersion counts explicit setDemo calls, not ticks", () => {
    const c = createClock(() => 0)
    expect(c.demoVersion()).toBe(0)
    c.tick()
    expect(c.demoVersion()).toBe(0)
    c.setDemo(new Date(0))
    c.setDemo(null)
    expect(c.demoVersion()).toBe(2)
  })
})
