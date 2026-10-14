export interface Clock {
  now(): Date
  isDemo(): boolean
  setDemo(at: Date | null): void
  /** setDemo가 불린 횟수. 시각이 흐르는 것(tick)으로는 바뀌지 않는다. */
  demoVersion(): number
  subscribe(fn: () => void): () => void
  tick(): void
}

export function createClock(realNow: () => number = Date.now): Clock {
  // 데모 시각 = 설정 시점부터 실제 시간만큼 흐르는 오프셋 방식
  let offset: number | null = null
  let version = 0
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((fn) => fn())

  return {
    now: () => new Date(realNow() + (offset ?? 0)),
    isDemo: () => offset !== null,
    setDemo(at) {
      offset = at ? at.getTime() - realNow() : null
      version += 1
      notify()
    },
    demoVersion: () => version,
    subscribe(fn) {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
    tick: notify,
  }
}
