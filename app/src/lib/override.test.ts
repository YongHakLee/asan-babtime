import { describe, expect, it } from 'vitest'

import { t } from '@/test/time'
import { getActiveOverride, isSoldOut, setOverride, setSoldOut } from '@/lib/override'

describe('overrides', () => {
  it('override expires after 15 minutes', () => {
    setOverride('east', 'queue', t('2026-10-14T12:00'))
    expect(getActiveOverride('east', t('2026-10-14T12:14'))?.kind).toBe('queue')
    expect(getActiveOverride('east', t('2026-10-14T12:15'))).toBeNull()
  })
  it('sold out is per date', () => {
    setSoldOut({ hall: 'east', meal: 'dinner', course: 'B', date: '2026-10-14' }, true)
    expect(isSoldOut('east', 'dinner', 'B', t('2026-10-14T18:00'))).toBe(true)
    expect(isSoldOut('east', 'dinner', 'B', t('2026-10-15T18:00'))).toBe(false)
    setSoldOut({ hall: 'east', meal: 'dinner', course: 'B', date: '2026-10-14' }, false)
    expect(isSoldOut('east', 'dinner', 'B', t('2026-10-14T18:00'))).toBe(false)
  })
})
