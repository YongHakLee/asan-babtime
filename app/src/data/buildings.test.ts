import { describe, expect, it } from 'vitest'

import { BUILDINGS } from '@/data/buildings'
import type { BuildingId } from '@/domain/types'

describe('buildings', () => {
  it('names the five buildings', () => {
    expect(Object.values(BUILDINGS).map((b) => b.name)).toEqual([
      '동관',
      '서관',
      '신관',
      '교육연구관',
      '아산생명과학연구원',
    ])
    for (const [id, b] of Object.entries(BUILDINGS)) expect(b.id).toBe(id)
  })

  it('keeps every block inside the 360x220 map without overlaps', () => {
    const blocks = Object.values(BUILDINGS).map((b) => b.block)
    for (const r of blocks) {
      expect(r.x).toBeGreaterThanOrEqual(0)
      expect(r.y).toBeGreaterThanOrEqual(0)
      expect(r.x + r.w).toBeLessThanOrEqual(360)
      expect(r.y + r.h).toBeLessThanOrEqual(220)
    }
    for (let i = 0; i < blocks.length; i++)
      for (let j = i + 1; j < blocks.length; j++) {
        const [a, b] = [blocks[i], blocks[j]]
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
        expect(overlap).toBe(false)
      }
  })

  it('places west and new on the west side, east on the east, the rest along the south', () => {
    const cx = (id: BuildingId) => BUILDINGS[id].block.x + BUILDINGS[id].block.w / 2
    const top = (id: BuildingId) => BUILDINGS[id].block.y
    const bottom = (id: BuildingId) => BUILDINGS[id].block.y + BUILDINGS[id].block.h
    expect(cx('west')).toBeLessThan(cx('east'))
    expect(cx('new')).toBeLessThan(cx('east'))
    expect(top('new')).toBeLessThan(top('west'))
    for (const id of ['eduResearch', 'asanLife'] as const)
      for (const other of ['east', 'west', 'new'] as const) expect(top(id)).toBeGreaterThanOrEqual(bottom(other))
  })
})
