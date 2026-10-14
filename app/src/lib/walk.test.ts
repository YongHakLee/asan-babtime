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

  it('excludes halls closed on arrival', () =>
    expect(hallOptions(t('2026-10-14T13:58'), 'east').map((o) => o.hall)).not.toContain('west'))

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
