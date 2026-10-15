import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { t } from '@/test/time'
import {
  addStaffEntry,
  allStaffEntries,
  cancelStaffEntry,
  entryRemainingMs,
  getActiveEntry,
  isSoldOut,
  lastEntryOn,
  setSoldOut,
  staffEntriesOn,
  subscribeOverrides,
} from '@/lib/override'
import { getSubscriptions } from '@/lib/prefs'

describe('staff log', () => {
  afterEach(() => vi.useRealTimers())
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-20T01:00:00Z'))
  })

  it('entry expires after 15 real minutes, whatever the demo clock says', () => {
    const e = addStaffEntry('east', 'busy', t('2026-10-14T12:18'))
    expect(e.at).toBe(t('2026-10-14T12:18').getTime())
    expect(getActiveEntry('east')?.level).toBe('busy')
    vi.setSystemTime(new Date('2026-10-20T01:14:59Z'))
    expect(entryRemainingMs(getActiveEntry('east')!)).toBe(1000)
    vi.setSystemTime(new Date('2026-10-20T01:15:00Z'))
    expect(getActiveEntry('east')).toBeNull()
  })
  it('stores the model prediction at the moment of input', () => {
    // 2026-10-14 12:20 동관은 모델이 '혼잡'(약 16분)으로 본다 (v2 보정 목표)
    const e = addStaffEntry('east', 'queue', t('2026-10-14T12:20'))
    expect(e.model.level).toBe('busy')
    expect(e.model.waitMinutes).toBeGreaterThanOrEqual(10)
  })
  it('records ok/0 as the model outside service', () => {
    expect(addStaffEntry('west', 'busy', t('2026-10-14T15:30')).model).toEqual({ level: 'ok', waitMinutes: 0 })
  })
  it('cancelling the last entry returns to the model, not to the previous entry', () => {
    const first = addStaffEntry('east', 'queue', t('2026-10-14T12:10'))
    const second = addStaffEntry('east', 'busy', t('2026-10-14T12:12'))
    cancelStaffEntry(second.id)
    expect(getActiveEntry('east')).toBeNull()
    expect(lastEntryOn('east', '2026-10-14')?.id).toBe(first.id)
    expect(staffEntriesOn('2026-10-14')).toHaveLength(2)
  })
  it('drops entries older than 48 real hours when saving', () => {
    addStaffEntry('east', 'ok', t('2026-10-14T12:00'))
    vi.setSystemTime(new Date('2026-10-22T01:00:01Z'))
    addStaffEntry('west', 'ok', t('2026-10-14T12:00'))
    expect(allStaffEntries().map((e) => e.hall)).toEqual(['west'])
  })
  it('ignores malformed staffLog entries and the old overrides key', () => {
    const now = Date.now()
    localStorage.setItem('babttae.overrides', JSON.stringify({ east: { hall: 'east', kind: 'queue', at: now, realAt: now } }))
    expect(getActiveEntry('east')).toBeNull()
    localStorage.setItem('babttae.staffLog', JSON.stringify({ not: 'an array' }))
    expect(allStaffEntries()).toEqual([])
    localStorage.setItem('babttae.staffLog', JSON.stringify([
      { id: 'a', hall: 'westNew', level: 'busy', at: now, realAt: now, model: { level: 'ok', waitMinutes: 0 } },
      { id: 'b', hall: 'east', level: 'jammed', at: now, realAt: now, model: { level: 'ok', waitMinutes: 0 } },
      { id: 'c', hall: 'east', level: 'busy', at: now, realAt: now },
    ]))
    expect(allStaffEntries()).toEqual([])
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
  it('reacts only to the staff log and sold-out keys', () => {
    const fn = vi.fn()
    const off = subscribeOverrides(fn)
    try {
      for (const key of ['babttae.alerts.sent', 'babttae.theme', 'babttae.favorites', 'babttae.overrides', 'other']) {
        window.dispatchEvent(new StorageEvent('storage', { key }))
      }
      expect(fn).not.toHaveBeenCalled()
      window.dispatchEvent(new StorageEvent('storage', { key: 'babttae.staffLog' }))
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
    localStorage.setItem('babttae.soldout', JSON.stringify([{ hall: 'westNew', meal: 'lunch', date: '2026-10-14' }]))
    expect(isSoldOut('west', 'lunch', undefined, t('2026-10-14T12:20'))).toBe(false)
    setSoldOut({ hall: 'west', meal: 'lunch', date: '2026-10-14' }, true)
    expect(JSON.parse(localStorage.getItem('babttae.soldout')!)).toEqual([{ hall: 'west', meal: 'lunch', date: '2026-10-14' }])
  })
})
