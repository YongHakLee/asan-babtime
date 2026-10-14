import { describe, expect, it, vi } from 'vitest'

import { t } from '@/test/time'
import { getActiveOverride, isSoldOut, setOverride, setSoldOut, subscribeOverrides } from '@/lib/override'

describe('overrides', () => {
  it('override expires after 15 minutes', () => {
    setOverride('east', 'queue', t('2026-10-14T12:00'))
    expect(getActiveOverride('east', t('2026-10-14T12:14'))?.kind).toBe('queue')
    expect(getActiveOverride('east', t('2026-10-14T12:15'))).toBeNull()
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
