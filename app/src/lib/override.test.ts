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
import { getSubscriptions } from '@/lib/prefs'

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

describe('legacy westNew values', () => {
  it('are ignored without errors', () => {
    localStorage.setItem(
      'babttae.subscriptions',
      JSON.stringify({ queueCleared: ['westNew', 'east'], favoriteDay: false, boxLunchDeadline: false, closingSoon: false }),
    )
    expect(getSubscriptions().queueCleared).toEqual(['east'])
    const now = Date.now()
    localStorage.setItem('babttae.overrides', JSON.stringify({ westNew: { hall: 'westNew', kind: 'queue', at: now, realAt: now } }))
    expect(() => getActiveOverride('west')).not.toThrow()
    expect(getActiveOverride('west')).toBeNull()
    expect(getActiveOverride('new')).toBeNull()
    // 예전 형식이 배열이어도 오류 없이 무시한다
    localStorage.setItem('babttae.overrides', JSON.stringify([{ hall: 'westNew', kind: 'queue', at: now, realAt: now }]))
    expect(getActiveOverride('west')).toBeNull()
    // 다른 식당 키 아래 엉뚱한 hall이 저장돼 있으면 쓰지 않는다
    localStorage.setItem('babttae.overrides', JSON.stringify({ west: { hall: 'westNew', kind: 'queue', at: now, realAt: now } }))
    expect(getActiveOverride('west')).toBeNull()
    localStorage.setItem('babttae.soldout', JSON.stringify([{ hall: 'westNew', meal: 'lunch', date: '2026-10-14' }]))
    expect(isSoldOut('west', 'lunch', undefined, t('2026-10-14T12:20'))).toBe(false)
    setSoldOut({ hall: 'west', meal: 'lunch', date: '2026-10-14' }, true)
    expect(JSON.parse(localStorage.getItem('babttae.soldout')!)).toEqual([{ hall: 'west', meal: 'lunch', date: '2026-10-14' }])
    setOverride('new', 'clear', t('2026-10-14T12:20'))
    expect(Object.keys(JSON.parse(localStorage.getItem('babttae.overrides')!))).toEqual(['new'])
  })
})
