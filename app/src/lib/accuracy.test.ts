import { beforeEach, describe, expect, it } from 'vitest'

import { accuracyBins, accuracySummary, judgedEntries, mockEntries, type Judged } from '@/lib/accuracy'
import { seoulYmd } from '@/lib/hours'
import { addStaffEntry, cancelStaffEntry } from '@/lib/override'
import { peakOf, type CongestionLevel } from '@/lib/queue'
import { t } from '@/test/time'

const ORDER: CongestionLevel[] = ['ok', 'mid', 'queue', 'busy']
const hm = (ms: number) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }).format(new Date(ms))
const j = (hall: Judged['hall'], staff: CongestionLevel, model: CongestionLevel): Judged => ({
  hall,
  at: t('2026-10-14T12:00').getTime(),
  staff,
  model,
  source: 'mock',
})

beforeEach(() => localStorage.clear())

describe('mockEntries', () => {
  it('is deterministic and stops at now', () => {
    const now = t('2026-10-14T12:20')
    const a = mockEntries(now)
    expect(a).toEqual(mockEntries(now))
    expect(a.every((e) => e.at <= now.getTime())).toBe(true)
    const count = (hall: string, ymd: string) =>
      a.filter((e) => e.hall === hall && seoulYmd(new Date(e.at)) === ymd).length
    expect(count('east', '2026-10-12')).toBe(12)
    expect(count('west', '2026-10-13')).toBe(9)
    expect(count('new', '2026-10-13')).toBe(9)
    expect(count('west', '2026-10-14')).toBe(4)
    expect(a).toHaveLength(72)
  })

  it('follows the 20-minute grid', () => {
    const times = mockEntries(t('2026-10-18T23:00'))
      .filter((e) => e.hall === 'east' && seoulYmd(new Date(e.at)) === '2026-10-12')
      .map((e) => hm(e.at))
    expect(times).toEqual(
      Array.from({ length: 12 }, (_, i) => {
        const m = 11 * 60 + 10 + i * 20
        return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
      }),
    )
  })

  it('has no weekend entries', () => {
    const days = new Set(mockEntries(t('2026-10-18T23:00')).map((e) => seoulYmd(new Date(e.at))))
    expect(days.has('2026-10-17')).toBe(false)
    expect(days.has('2026-10-18')).toBe(false)
    expect(days.size).toBe(5)
  })

  it('under-predicts more near the peak', () => {
    const all = mockEntries(t('2026-10-18T23:00'))
    const near = (e: Judged) => {
      const peak = new Date(`${seoulYmd(new Date(e.at))}T${peakOf(e.hall, 'lunch')}:00+09:00`).getTime()
      return Math.abs(e.at - peak) <= 20 * 60_000
    }
    const under = (e: Judged) => ORDER.indexOf(e.staff) > ORDER.indexOf(e.model)
    const rate = (xs: Judged[]) => xs.filter(under).length / xs.length
    expect(rate(all.filter(near))).toBeGreaterThan(rate(all.filter((e) => !near(e))))
  })

  it('differs from the model by at most one step', () => {
    for (const e of mockEntries(t('2026-10-18T23:00'))) {
      expect(Math.abs(ORDER.indexOf(e.staff) - ORDER.indexOf(e.model))).toBeLessThanOrEqual(1)
    }
  })
})

describe('judgedEntries', () => {
  it('merges real entries and drops cancelled ones', () => {
    const first = addStaffEntry('west', 'busy', t('2026-10-14T12:15'))
    const second = addStaffEntry('west', 'ok', t('2026-10-14T12:16'))
    cancelStaffEntry(second.id)
    const real = judgedEntries(t('2026-10-14T12:20')).filter((e) => e.source === 'real')
    expect(real).toHaveLength(1)
    expect(real[0].staff).toBe('busy')
    expect(real[0].model).toBe(first.model.level)
  })

  it('excludes real entries outside weekday lunch or the stored week', () => {
    addStaffEntry('east', 'busy', t('2026-10-15T08:30'))
    addStaffEntry('east', 'busy', t('2026-10-20T12:00'))
    expect(judgedEntries(t('2026-10-21T00:00')).some((e) => e.source === 'real')).toBe(false)
  })

  it('excludes real entries after now', () => {
    addStaffEntry('east', 'busy', t('2026-10-14T12:40'))
    expect(judgedEntries(t('2026-10-14T12:20')).some((e) => e.source === 'real')).toBe(false)
  })

  it('is empty before the first mock time and sorted by at', () => {
    expect(judgedEntries(t('2026-10-12T11:00'))).toEqual([])
    const a = judgedEntries(t('2026-10-14T12:20')).map((e) => e.at)
    expect(a).toEqual([...a].sort((x, y) => x - y))
  })
})

describe('accuracySummary', () => {
  const list = [j('east', 'ok', 'ok'), j('west', 'mid', 'mid'), j('west', 'busy', 'queue'), j('east', 'ok', 'mid')]

  it('counts match, under and over', () => {
    expect(accuracySummary(list, 'all')).toEqual({ total: 4, match: 2, under: 1, over: 1, matchPct: 50, underPct: 25, overPct: 25 })
    expect(accuracySummary(list, 'west')).toEqual({ total: 2, match: 1, under: 1, over: 0, matchPct: 50, underPct: 50, overPct: 0 })
    expect(accuracySummary([], 'all')).toEqual({ total: 0, match: 0, under: 0, over: 0, matchPct: 0, underPct: 0, overPct: 0 })
  })
})

describe('accuracyBins', () => {
  it('splits by 30 minutes and flags low samples', () => {
    const at = (s: string) => ({ ...j('east', 'ok', 'ok'), at: t(s).getTime() })
    const bins = accuracyBins([at('2026-10-14T11:05'), at('2026-10-14T11:25'), at('2026-10-14T11:40')], 'east')
    expect(bins).toHaveLength(8)
    expect(bins[0]).toMatchObject({ start: '11:00', end: '11:30', total: 2 })
    expect(bins[1]).toMatchObject({ total: 1, lowSample: true })
    expect(bins[2]).toMatchObject({ total: 0, matchPct: null, lowSample: false })
    expect(bins[7].end).toBe('15:00')
  })
})
