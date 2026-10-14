import { describe, expect, it } from 'vitest'

import { dayPopularity } from '@/lib/menu'
import { weeklyPattern } from '@/lib/pattern'
import { levelForWait, simulateQueue } from '@/lib/queue'

describe('weeklyPattern', () => {
  it('west pattern covers Mon–Fri 11:00–13:50', () => {
    const p = weeklyPattern('west')
    expect(p.map((r) => r.dayLabel)).toEqual(['월', '화', '수', '목', '금'])
    expect(p[0].slots[0].time).toBe('11:00')
    expect(p[0].slots.at(-1)!.time).toBe('13:50')
    expect(p[0].slots).toHaveLength(18)
  })

  it('east lunch includes weekend', () =>
    expect(weeklyPattern('east').map((r) => r.dayLabel)).toEqual(['월', '화', '수', '목', '금', '토', '일']))

  it('east lunch follows each day window (Sat until 14:50, Sun until 13:50)', () => {
    const p = weeklyPattern('east')
    expect(p[5].slots.at(-1)!.time).toBe('14:50')
    expect(p[6].slots.at(-1)!.time).toBe('13:50')
    expect(p.map((r) => r.date)).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ])
  })

  it('deterministic', () => expect(weeklyPattern('new')).toEqual(weeklyPattern('new')))

  it('matches the queue model with that day menu popularity and labels levels by wait', () => {
    const wed = weeklyPattern('east')[2]
    const at = new Date('2026-10-14T12:20:00+09:00')
    const slot = wed.slots.find((s) => s.time === '12:20')!
    expect(slot.waitMinutes).toBe(
      simulateQueue('east', 'lunch', at, dayPopularity(at, 'east', 'lunch')).waitMinutes,
    )
    for (const s of wed.slots) expect(s.level).toBe(levelForWait(s.waitMinutes))
  })

  it('differs between days and has a midday peak', () => {
    const p = weeklyPattern('east')
    const waits = p.map((r) => r.slots.map((s) => s.waitMinutes).join(','))
    expect(new Set(waits).size).toBeGreaterThan(1)
    const mon = p[0].slots
    expect(mon[0].level).toBe('ok')
    expect(Math.max(...mon.map((s) => s.waitMinutes))).toBeGreaterThan(mon[0].waitMinutes)
  })

  it('supports other meals and step sizes', () => {
    const p = weeklyPattern('east', 'dinner', 30)
    expect(p).toHaveLength(7)
    expect(p[0].slots.map((s) => s.time)).toEqual(['17:30', '18:00', '18:30', '19:00', '19:30', '20:00'])
    expect(weeklyPattern('west', 'dinner')).toEqual([])
  })
})
