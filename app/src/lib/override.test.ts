import { afterEach, describe, expect, it, vi } from 'vitest'

import { t } from '@/test/time'
import {
  getActiveOverride,
  isSoldOut,
  overrideRemainingMs,
  setOverride,
  setSoldOut,
  subscribeOverrides,
} from '@/lib/override'

describe('overrides', () => {
  afterEach(() => vi.useRealTimers())

  it('override expires after 15 real minutes, whatever the demo clock says', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-20T01:00:00Z'))
    setOverride('east', 'queue', t('2026-10-14T12:00'))
    const o = getActiveOverride('east')
    expect(o?.kind).toBe('queue')
    expect(o?.at).toBe(t('2026-10-14T12:00').getTime())
    expect(o?.realAt).toBe(Date.now())
    vi.setSystemTime(new Date('2026-10-20T01:14:59Z'))
    expect(getActiveOverride('east')?.kind).toBe('queue')
    expect(overrideRemainingMs(getActiveOverride('east')!)).toBe(1000)
    vi.setSystemTime(new Date('2026-10-20T01:15:00Z'))
    expect(getActiveOverride('east')).toBeNull()
  })
  it('an override stored without realAt (old format) is inactive', () => {
    localStorage.setItem('babttae.overrides', JSON.stringify({ east: { hall: 'east', kind: 'queue', at: Date.now() } }))
    expect(getActiveOverride('east')).toBeNull()
  })
  it('sold out is per date', () => {
    setSoldOut({ hall: 'east', meal: 'dinner', course: 'B', date: '2026-10-14' }, true)
    expect(isSoldOut('east', 'dinner', 'B', t('2026-10-14T18:00'))).toBe(true)
    expect(isSoldOut('east', 'dinner', 'B', t('2026-10-15T18:00'))).toBe(false)
    setSoldOut({ hall: 'east', meal: 'dinner', course: 'B', date: '2026-10-14' }, false)
    expect(isSoldOut('east', 'dinner', 'B', t('2026-10-14T18:00'))).toBe(false)
  })
})

describe('subscribeOverrides storage events', () => {
  it('reacts only to the override and sold-out keys', () => {
    const fn = vi.fn()
    const off = subscribeOverrides(fn)
    try {
      for (const key of ['babttae.alerts.sent', 'babttae.theme', 'babttae.favorites', 'other']) {
        window.dispatchEvent(new StorageEvent('storage', { key }))
      }
      expect(fn).not.toHaveBeenCalled()
      window.dispatchEvent(new StorageEvent('storage', { key: 'babttae.overrides' }))
      window.dispatchEvent(new StorageEvent('storage', { key: 'babttae.soldout' }))
      expect(fn).toHaveBeenCalledTimes(2)
    } finally {
      off()
    }
  })
})
