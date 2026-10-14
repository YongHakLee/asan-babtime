import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { toast } from '@/components/ui/toast'
import { useAlertsEngine } from '@/hooks/useAlertsEngine'
import { createClock } from '@/lib/clock'
import { setSubscriptions } from '@/lib/prefs'
import { ClockProvider } from '@/providers/clock'
import { t } from '@/test/time'

function Engine() {
  useAlertsEngine()
  return null
}

afterEach(() => vi.restoreAllMocks())

describe('useAlertsEngine across tabs', () => {
  it('two tabs on different demo dates deliver each alert once and stop writing', () => {
    localStorage.setItem('babttae.favorites', JSON.stringify(['김치']))
    setSubscriptions({ queueCleared: [], favoriteDay: true, boxLunchDeadline: false, closingSoon: false })

    const added = vi.spyOn(toast, 'add').mockImplementation(() => 'id')
    // 다른 탭이 받는 storage 이벤트를 흉내 낸다: 이 창의 모든 쓰기를 이벤트로 돌려준다
    const pending: StorageEvent[] = []
    const writes: string[] = []
    const realSet = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      realSet.call(this, k, v)
      writes.push(k)
      pending.push(new StorageEvent('storage', { key: k }))
    })

    const a = createClock()
    a.setDemo(t('2026-10-14T12:20'))
    const b = createClock()
    b.setDemo(t('2026-10-16T12:20'))
    render(
      <>
        <ClockProvider clock={a}>
          <Engine />
        </ClockProvider>
        <ClockProvider clock={b}>
          <Engine />
        </ClockProvider>
      </>,
    )

    for (let round = 0; round < 20 && pending.length > 0; round++) {
      const batch = pending.splice(0)
      act(() => batch.forEach((e) => window.dispatchEvent(e)))
    }
    expect(pending).toHaveLength(0)

    // 시계가 흘러도(다음 틱) 더 쓰지 않는다
    const before = writes.length
    act(() => {
      a.tick()
      b.tick()
    })
    expect(writes.length).toBe(before)

    const bodies = added.mock.calls.map((c) => (c[0] as { description?: string }).description)
    expect(bodies).toHaveLength(2)
    expect(bodies.every((d) => d?.startsWith('오늘'))).toBe(true)
  })
})
