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
  it('Wednesday 12:20: east queues, west has a line, new is light', () => {
    const e = simulateQueue('east', 'lunch', t('2026-10-14T12:20'), 1.25)
    const w = simulateQueue('west', 'lunch', t('2026-10-14T12:20'), 1.05)
    const n = simulateQueue('new', 'lunch', t('2026-10-14T12:20'), 1.05)
    expect(['queue', 'busy']).toContain(e.level)
    expect(w.level).toBe('queue')
    expect(n.level).toBe('ok')
    expect(e.waitMinutes).toBeGreaterThan(w.waitMinutes)
  })
  it('Wednesday 12:45: west has eased, new stays light', () => {
    expect(['ok', 'mid']).toContain(simulateQueue('west', 'lunch', t('2026-10-14T12:45'), 1.05).level)
    expect(simulateQueue('new', 'lunch', t('2026-10-14T12:45'), 1.05).level).toBe('ok')
  })
  it('zero when closed', () =>
    expect(simulateQueue('east', 'lunch', t('2026-10-14T16:00'), 1.25).waitMinutes).toBe(0))
})
