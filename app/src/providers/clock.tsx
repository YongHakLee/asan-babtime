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

type Snap = { now: Date; isDemo: boolean }

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

  // getSnapshot은 변경 때만 새 객체를 만들어 참조를 안정적으로 유지.
  // now와 isDemo를 한 스냅샷에 담아 항상 서로 일치시킨다.
  const store = useMemo(() => {
    const read = (): Snap => ({ now: clock.now(), isDemo: clock.isDemo() })
    const cache = { snap: read() }
    return {
      subscribe: (fn: () => void) => {
        const unsub = clock.subscribe(() => {
          cache.snap = read()
          fn()
        })
        // 렌더~구독 사이에 바뀐 시계 상태를 따라잡는다
        const fresh = read()
        if (
          fresh.isDemo !== cache.snap.isDemo ||
          Math.abs(fresh.now.getTime() - cache.snap.now.getTime()) >= 1000
        ) {
          cache.snap = fresh
          fn()
        }
        return unsub
      },
      getSnapshot: () => cache.snap,
    }
  }, [clock])
  const { now, isDemo } = useSyncExternalStore(store.subscribe, store.getSnapshot)

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
