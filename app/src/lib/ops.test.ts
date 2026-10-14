import { describe, expect, it } from 'vitest'

import { t } from '@/test/time'
import { setSoldOut } from '@/lib/override'
import { rateMeal } from '@/lib/prefs'
import { arrivalsSeries } from '@/lib/queue'
import { satisfaction, soldOutLog, todayArrivals, tomorrowPrep } from '@/lib/ops'

describe('arrivalsSeries', () => {
  it('arrivals series is deterministic and non-negative', () => {
    const s = arrivalsSeries('east', 'lunch', t('2026-10-14T00:00'), 1.25)
    expect(s.every((x) => x.arrivals >= 0)).toBe(true)
    expect(s).toEqual(arrivalsSeries('east', 'lunch', t('2026-10-14T00:00'), 1.25))
  })

  it('covers the whole window in 10-minute slots, integers only', () => {
    const s = arrivalsSeries('west', 'lunch', t('2026-10-14T00:00'), 1.05)
    expect(s).toHaveLength(18)
    expect(s[0].time).toEqual(t('2026-10-14T11:00'))
    expect(s.every((x) => Number.isInteger(x.arrivals))).toBe(true)
  })

  it('is empty when the hall does not serve that day', () =>
    expect(arrivalsSeries('west', 'lunch', t('2026-10-17T00:00'), 1)).toEqual([]))

  it('peaks near the model peak', () => {
    const s = arrivalsSeries('east', 'lunch', t('2026-10-14T00:00'), 1.25)
    const peak = s.reduce((a, b) => (b.arrivals > a.arrivals ? b : a))
    expect(peak.time.getTime()).toBeGreaterThanOrEqual(t('2026-10-14T11:50').getTime())
    expect(peak.time.getTime()).toBeLessThanOrEqual(t('2026-10-14T12:20').getTime())
  })
})

describe('todayArrivals', () => {
  it('marks the slot holding `at` as now and later slots as future', () => {
    const east = todayArrivals(t('2026-10-14T12:20')).east
    const i = east.findIndex((x) => x.time === '12:20')
    expect(east[i].now).toBe(true)
    expect(east[i - 1].future).toBeFalsy()
    expect(east[i + 1].future).toBe(true)
  })

  it('uses the current meal, lunch otherwise', () => {
    const a = todayArrivals(t('2026-10-14T18:00'))
    expect(a.east[0].time).toBe('17:30')
    expect(a.west[0].time).toBe('11:00')
    expect(a.west.every((x) => !x.future && !x.now)).toBe(true)
  })

  it('is empty for halls closed today', () => expect(todayArrivals(t('2026-10-17T12:00')).west).toEqual([]))
})

describe('soldOutLog', () => {
  it('soldOut log lists staff input', () => {
    setSoldOut({ hall: 'east', meal: 'dinner', course: 'B', date: '2026-10-14' }, true)
    expect(soldOutLog(t('2026-10-14T18:00'))[0]).toMatchObject({ hall: 'east', meal: 'dinner', course: 'B' })
  })

  it('labels entries and keeps only today, newest first', () => {
    setSoldOut({ hall: 'east', meal: 'lunch', date: '2026-10-13' }, true)
    setSoldOut({ hall: 'west', meal: 'lunch', course: '라이브코너(서관)', date: '2026-10-14', at: t('2026-10-14T12:05').getTime() }, true)
    setSoldOut({ hall: 'east', meal: 'dinner', course: 'B', date: '2026-10-14', at: t('2026-10-14T19:10').getTime() }, true)
    const log = soldOutLog(t('2026-10-14T19:30'))
    expect(log.map((x) => x.label)).toEqual(['동관 석식 B', '서관 중식 라이브코너(서관)'])
    expect(log.map((x) => x.time)).toEqual(['19:10', '12:05'])
  })
})

describe('soldOutLog malformed storage', () => {
  it('treats a non-number `at` as missing', () => {
    localStorage.setItem(
      'babttae.soldout',
      JSON.stringify([{ hall: 'east', meal: 'lunch', date: '2026-10-14', at: '12:10' }]),
    )
    expect(soldOutLog(t('2026-10-14T12:20'))[0]).toMatchObject({ label: '동관 중식', time: undefined })
  })
})

describe('satisfaction', () => {
  it('skips stored ratings with non-numeric stars or unknown leftover', () => {
    const before = satisfaction(t('2026-10-14T12:20'))
    localStorage.setItem(
      'babttae.ratings',
      JSON.stringify({
        '2026-10-14:east:lunch': { stars: 'five', leftover: 'none' },
        '2026-10-14:east:breakfast': { stars: 2, leftover: 'lots' },
      }),
    )
    expect(satisfaction(t('2026-10-14T12:20'))).toEqual(before)
  })

  it('skips stored ratings that are null or not objects', () => {
    const before = satisfaction(t('2026-10-14T12:20'))
    localStorage.setItem(
      'babttae.ratings',
      JSON.stringify({ '2026-10-14:east:lunch': null, '2026-10-14:east:breakfast': 5, '2026-10-14:west:lunch': 'good' }),
    )
    expect(satisfaction(t('2026-10-14T12:20'))).toEqual(before)
    for (const raw of ['null', '[1,2]', '7', '"x"']) {
      localStorage.setItem('babttae.ratings', raw)
      expect(satisfaction(t('2026-10-14T12:20'))).toEqual(before)
    }
  })

  it('is deterministic with shares adding up to 100', () => {
    const s = satisfaction(t('2026-10-14T12:20'))
    expect(s).toEqual(satisfaction(t('2026-10-14T12:20')))
    expect(s.count).toBeGreaterThan(0)
    expect(s.avg).toBeGreaterThanOrEqual(3.8)
    expect(s.avg).toBeLessThanOrEqual(4.8)
    expect(s.leftover.none + s.leftover.some + s.leftover.much).toBe(100)
  })

  it("adds this browser's rating for today", () => {
    const before = satisfaction(t('2026-10-14T12:20'))
    rateMeal('2026-10-14:east:lunch', { stars: 1, leftover: 'much' })
    const after = satisfaction(t('2026-10-14T12:20'))
    expect(after.count).toBe(before.count + 1)
    expect(after.avg).toBeLessThanOrEqual(before.avg)
  })

  it('ignores ratings from other days', () => {
    const before = satisfaction(t('2026-10-14T12:20'))
    rateMeal('2026-10-13:east:lunch', { stars: 1, leftover: 'much' })
    expect(satisfaction(t('2026-10-14T12:20'))).toEqual(before)
  })
})

describe('tomorrowPrep', () => {
  it('tomorrow prep flags east line for Wednesday (asked on Tuesday)', () => {
    const p = tomorrowPrep(t('2026-10-13T16:00')).find((x) => x.hall === 'east')!
    expect(p.notes.some((n) => /배식 라인 추가 검토$/.test(n))).toBe(true)
  })

  it('writes the line note as one HH:MM~HH:MM span', () => {
    const p = tomorrowPrep(t('2026-10-13T16:00')).find((x) => x.hall === 'east')!
    const lines = p.notes.filter((n) => n.endsWith('배식 라인 추가 검토'))
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/^\d{2}:\d{2}~\d{2}:\d{2} 동관 배식 라인 추가 검토$/)
  })

  it('flags a popular main dish', () => {
    // 수요일 동관 중식 주메뉴 인기도 1.25
    const p = tomorrowPrep(t('2026-10-13T16:00')).find((x) => x.hall === 'east')!
    expect(p.notes).toContain('동관 꽈리고추간장닭갈비 준비량 상향 검토')
  })

  it('gives every hall a peak and expected headcount', () => {
    const all = tomorrowPrep(t('2026-10-13T16:00'))
    expect(all.map((x) => x.hall)).toEqual(['east', 'west', 'new'])
    for (const p of all) {
      expect(p.peak).toMatch(/^\d{2}:\d{2}$/)
      expect(p.expected).toBeGreaterThan(0)
    }
    expect(all[0].expected).toBeGreaterThan(all[1].expected)
  })

  it('marks halls closed tomorrow (Friday → Saturday)', () => {
    const all = tomorrowPrep(t('2026-10-16T16:00'))
    expect(all.find((x) => x.hall === 'west')).toMatchObject({ open: false, expected: 0, notes: [] })
    expect(all.find((x) => x.hall === 'east')?.open).toBe(true)
  })

  it('quiet halls get no line note', () => {
    const n = tomorrowPrep(t('2026-10-13T16:00')).find((x) => x.hall === 'new')!
    expect(n.notes.some((x) => x.endsWith('배식 라인 추가 검토'))).toBe(false)
  })
})
