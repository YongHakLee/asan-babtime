import {
  createContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"

import { createClock, type Clock } from "@/lib/clock"
import { subscribeOverrides } from "@/lib/override"

const TICK_MS = 30_000

type Snap = { now: Date; isDemo: boolean; demoVersion: number }

export type ClockValue = {
  now: Date
  isDemo: boolean
  /** 시연 시각을 직접 바꿀 때마다 1씩 는다. 화면 선택을 새로 시작할 때 쓴다. */
  demoVersion: number
  setDemo: (at: Date | null) => void
}

export const ClockContext = createContext<ClockValue | null>(null)

/**
 * `?at=YYYY-MM-DDTHH:MM`(서울 시각)을 읽는다. 없거나 잘못된 값이면 null.
 * 열 때마다 항상 그 시각에서 시작한다(같은 주소를 다시 열면 같은 장면이 나온다).
 */
function readAtParam(): Date | null {
  if (typeof window === "undefined") return null
  const at = new URLSearchParams(window.location.search).get("at")
  if (!at) return null
  const base = new Date(`${at}+09:00`)
  return Number.isNaN(base.getTime()) ? null : base
}

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
    // 앱 최상위(주입·initialDemo 없음)에서만 주소의 ?at=을 따른다
    const demo = initialDemo ?? (injected ? null : readAtParam())
    if (demo) c.setDemo(demo)
    return c
  })
  const clock = injected ?? own

  // getSnapshot은 변경 때만 새 객체를 만들어 참조를 안정적으로 유지.
  // now와 isDemo를 한 스냅샷에 담아 항상 서로 일치시킨다.
  const store = useMemo(() => {
    const read = (): Snap => ({
      now: clock.now(),
      isDemo: clock.isDemo(),
      demoVersion: clock.demoVersion(),
    })
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
          fresh.demoVersion !== cache.snap.demoVersion ||
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
  const { now, isDemo, demoVersion } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot
  )

  useEffect(() => {
    const id = setInterval(() => clock.tick(), TICK_MS)
    return () => clearInterval(id)
  }, [clock])

  // 직원 입력·품절이 바뀌면 시계를 한 번 깨워 화면과 알림 규칙을 바로 다시 평가한다.
  // (subscribeOverrides는 그 두 키에만 반응한다)
  useEffect(() => subscribeOverrides(() => clock.tick()), [clock])

  const value = useMemo<ClockValue>(
    () => ({ now, isDemo, demoVersion, setDemo: (at) => clock.setDemo(at) }),
    [now, isDemo, demoVersion, clock]
  )
  return <ClockContext.Provider value={value}>{children}</ClockContext.Provider>
}
