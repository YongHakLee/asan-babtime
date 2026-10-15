import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { useVenueStatus } from '@/hooks/useVenueStatus'
import { addStaffEntry } from '@/lib/override'
import { ClockProvider } from '@/providers/clock'
import { t } from '@/test/time'

describe('useVenueStatus', () => {
  it('staff clear override flips level to ok', () => {
    const now = t('2026-10-14T12:20')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ClockProvider initialDemo={now}>{children}</ClockProvider>
    )
    const { result } = renderHook(() => useVenueStatus('east'), { wrapper })
    expect(result.current.source).toBe('model')
    expect(['queue', 'busy']).toContain(result.current.level)
    act(() => addStaffEntry('east', 'ok', now))
    expect(result.current.level).toBe('ok')
    expect(result.current.source).toBe('staff')
    expect(result.current.waitMinutes).toBe(0)
  })
})
