import { describe, expect, it } from 'vitest'

import { t } from '@/test/time'
import { levelForWait, simulateQueue } from '@/lib/queue'

describe('queue model', () => {
  it('level boundaries', () => {
    expect(levelForWait(1.99)).toBe('ok')
    expect(levelForWait(2)).toBe('mid')
    expect(levelForWait(5)).toBe('queue')
    expect(levelForWait(10)).toBe('busy')
  })
  it('is deterministic', () =>
    expect(simulateQueue('east', 'lunch', t('2026-10-14T12:20'), 1.25)).toEqual(
      simulateQueue('east', 'lunch', t('2026-10-14T12:20'), 1.25),
    ))
  it('Wednesday 12:20: east queues, westNew is light', () => {
    const e = simulateQueue('east', 'lunch', t('2026-10-14T12:20'), 1.25)
    const w = simulateQueue('westNew', 'lunch', t('2026-10-14T12:20'), 1.05)
    expect(['queue', 'busy']).toContain(e.level)
    expect(['ok', 'mid']).toContain(w.level)
    expect(e.waitMinutes).toBeGreaterThan(w.waitMinutes)
  })
  it('zero when closed', () =>
    expect(simulateQueue('east', 'lunch', t('2026-10-14T16:00'), 1.25).waitMinutes).toBe(0))
})
