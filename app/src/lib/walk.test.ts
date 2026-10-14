import { beforeEach, describe, expect, it } from 'vitest'

import { BUILDINGS } from '@/data/buildings'
import type { BuildingId } from '@/domain/types'
import { setOverride } from '@/lib/override'
import { t } from '@/test/time'

import { fastestHall, hallOptions, walkMinutes } from './walk'

describe('walk', () => {
  beforeEach(() => localStorage.clear())

  it('walkMinutes reads the spec table', () => {
    expect(walkMinutes('west', 'new')).toBe(4)
    expect(walkMinutes('asanLife', 'new')).toBe(10)
    expect(walkMinutes('eduResearch', 'east')).toBe(6)
  })

  it('from 서관 at Wed 12:20 picks 신관 (walk 4, no wait)', () =>
    expect(fastestHall(t('2026-10-14T12:20'), 'west')).toMatchObject({ hall: 'new', walk: 4 }))

  it('excludes halls closed on arrival', () => {
    // 13:58 동관 출발: 서관(7분)·신관(8분)은 14:00 마감 뒤에 도착한다(ended)
    const halls = hallOptions(t('2026-10-14T13:58'), 'east').map((o) => o.hall)
    expect(halls).not.toContain('west')
    expect(halls).not.toContain('new')
  })

  it('includes a hall reached shortly before it opens (V2-R9): Wed 10:55 from 동관', () => {
    const at = t('2026-10-14T10:55')
    const east = fastestHall(at, 'east')!
    // 10:57 도착, 11:00 개시: 기다림 3분 + 개시 직후 대기 0분
    expect(east).toMatchObject({ hall: 'east', walk: 2, waitOnArrival: 3, total: 5 })
    expect(east.ready).toEqual(t('2026-10-14T11:00'))
    expect(east.arriveAt).toEqual(t('2026-10-14T10:57'))
  })

  it('Wed 10:55 from 서관 picks 서관, from 신관 picks 신관', () => {
    expect(fastestHall(t('2026-10-14T10:55'), 'west')).toMatchObject({ hall: 'west', walk: 2, total: 5 })
    expect(fastestHall(t('2026-10-14T10:55'), 'new')).toMatchObject({ hall: 'new', walk: 2, total: 5 })
  })

  it('a hall opening more than 30 minutes after arrival is left out', () => {
    expect(fastestHall(t('2026-10-14T10:20'), 'east')).toBeNull()
    // 동관 석식 17:30: 16:50 출발(16:52 도착)은 38분 전이라 빠진다, 17:05 출발은 들어간다
    expect(fastestHall(t('2026-10-14T16:50'), 'east')).toBeNull()
    expect(fastestHall(t('2026-10-14T17:05'), 'east')).toMatchObject({ hall: 'east' })
  })

  it('weekend morning: 서관·신관 do not serve, so only 동관 counts', () =>
    expect(hallOptions(t('2026-10-17T10:50'), 'west').map((o) => o.hall)).toEqual(['east']))

  it('arriveAt = at + walk, total = walk + waitOnArrival, sorted by total', () => {
    const at = t('2026-10-14T12:20')
    const opts = hallOptions(at, 'eduResearch')
    expect(opts.length).toBeGreaterThan(0)
    for (const o of opts) {
      expect(o.arriveAt.getTime()).toBe(at.getTime() + o.walk * 60_000)
      expect(o.total).toBeCloseTo(o.walk + o.waitOnArrival)
    }
    const totals = opts.map((o) => o.total)
    expect(totals).toEqual([...totals].sort((a, b) => a - b))
  })

  it('every building gets a pick during Wed lunch', () => {
    for (const b of Object.keys(BUILDINGS) as BuildingId[])
      expect(fastestHall(t('2026-10-14T12:20'), b)).not.toBeNull()
  })

  it('weekend: only 동관 is an option', () =>
    expect(hallOptions(t('2026-10-17T12:20'), 'west').map((o) => o.hall)).toEqual(['east']))

  it('nothing open gives null', () => expect(fastestHall(t('2026-10-14T15:30'), 'west')).toBeNull())

  it('staff clear on east counts as no wait on arrival', () => {
    const at = t('2026-10-14T12:20')
    setOverride('east', 'clear', at)
    const east = hallOptions(at, 'east').find((o) => o.hall === 'east')!
    expect(east.waitOnArrival).toBe(0)
    expect(fastestHall(at, 'east')).toMatchObject({ hall: 'east', walk: 2 })
  })
})
