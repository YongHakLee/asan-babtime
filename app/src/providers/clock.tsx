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
import { storage } from "@/lib/storage"

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

const ANCHOR_KEY = "demoAnchor"
const ANCHOR_MAX_MS = 6 * 3_600_000

/**
 * `?at=YYYY-MM-DDTHH:MM`(서울 시각)을 읽는다. 없거나 잘못된 값이면 null.
 * 같은 `at`로 연 탭들이 같은 시연 시각을 보도록, 처음 연 시점(realStart)을
 * 저장소에 공유하고 거기서 흐른 시간만큼 더한다. 6시간이 지난 기준은 새로 잡는다.
 */
function readAtParam(): Date | null {
  if (typeof window === "undefined") return null
  const at = new URLSearchParams(window.location.search).get("at")
  if (!at) return null
  const base = new Date(`${at}+09:00`)
  if (Number.isNaN(base.getTime())) return null
  const nowMs = Date.now()
  const anchor = storage.get<{ at: string; realStart: number } | null>(
    ANCHOR_KEY,
    null
  )
  if (
    anchor &&
    anchor.at === at &&
    nowMs >= anchor.realStart &&
    nowMs - anchor.realStart < ANCHOR_MAX_MS
  ) {
    return new Date(base.getTime() + (nowMs - anchor.realStart))
  }
  storage.set(ANCHOR_KEY, { at, realStart: nowMs })
  return base
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

  // 다른 탭의 직원 입력은 입력 시각(at)이 이 탭의 now 스냅샷보다 늦을 수 있다.
  // 입력이 올 때 스냅샷을 새로 읽어 바로 유효하게 보이도록 한다.
  useEffect(() => subscribeOverrides(() => clock.tick()), [clock])

  const value = useMemo<ClockValue>(
    () => ({ now, isDemo, demoVersion, setDemo: (at) => clock.setDemo(at) }),
    [now, isDemo, demoVersion, clock]
  )
  return <ClockContext.Provider value={value}>{children}</ClockContext.Provider>
}
