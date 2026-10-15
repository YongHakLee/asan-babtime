import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CongestionLevel } from '@/lib/queue'
import { modelWait } from '@/lib/model'
import { effectiveWait } from '@/lib/status'
import { t } from '@/test/time'

vi.mock('@/lib/model')

const at = t('2026-10-14T12:20')

function put(level: CongestionLevel) {
  const now = Date.now()
  localStorage.setItem(
    'babttae.staffLog',
    JSON.stringify([{ id: 'x', hall: 'east', level, at: at.getTime(), realAt: now, model: { level: 'ok', waitMinutes: 0 } }]),
  )
}

function wait(level: CongestionLevel, model: number) {
  vi.mocked(modelWait).mockReturnValue({ waitMinutes: model, level: 'ok' })
  put(level)
  return effectiveWait('east', 'lunch', at)
}

describe('effectiveWait with staff input', () => {
  beforeEach(() => vi.mocked(modelWait).mockReset())
  afterEach(() => vi.useRealTimers())

  it.each([
    ['ok', 7, 0],
    ['mid', 1, 2],
    ['mid', 3, 3],
    ['mid', 8, 4.4],
    ['queue', 2, 5],
    ['queue', 6, 6],
    ['queue', 16, 9.4],
    ['busy', 4, 10],
    ['busy', 16, 16],
  ] as const)('%s input with model wait %d gives %d', (level, model, expected) => {
    const r = wait(level, model)
    expect(r.waitMinutes).toBe(expected)
    expect(r.level).toBe(level)
    expect(r.source).toBe('staff')
  })

  it('returns the model as is without input', () => {
    vi.mocked(modelWait).mockReturnValue({ waitMinutes: 7, level: 'queue' })
    expect(effectiveWait('east', 'lunch', at)).toEqual({ waitMinutes: 7, level: 'queue', source: 'model' })
  })
})
