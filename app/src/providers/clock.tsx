import {
  createContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"

import { createClock, type Clock } from "@/lib/clock"

const TICK_MS = 30_000

export type ClockValue = {
  now: Date
  isDemo: boolean
  setDemo: (at: Date | null) => void
}

export const ClockContext = createContext<ClockValue | null>(null)

export function ClockProvider({
  children,
  clock: injected,
  initialDemo,
}: {
  children: ReactNode
  clock?: Clock
  initialDemo?: Date
}) {
  const [own] = useState<Clock>(() => {
    const c = createClock()
    if (initialDemo) c.setDemo(initialDemo)
    return c
  })
  const clock = injected ?? own

  // getSnapshot은 변경(notify) 때만 새 Date를 만들어 참조를 안정적으로 유지
  const store = useMemo(() => {
    const cache = { snap: clock.now() }
    return {
      subscribe: (fn: () => void) =>
        clock.subscribe(() => {
          cache.snap = clock.now()
          fn()
        }),
      getSnapshot: () => cache.snap,
    }
  }, [clock])
  const now = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const isDemo = clock.isDemo()

  useEffect(() => {
    const id = setInterval(() => clock.tick(), TICK_MS)
    return () => clearInterval(id)
  }, [clock])

  const value = useMemo<ClockValue>(
    () => ({ now, isDemo, setDemo: (at) => clock.setDemo(at) }),
    [now, isDemo, clock]
  )
  return <ClockContext.Provider value={value}>{children}</ClockContext.Provider>
}
