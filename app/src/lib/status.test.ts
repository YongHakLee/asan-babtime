import { describe, expect, it, vi } from 'vitest'

import { seoulYmd } from '@/lib/hours'
import * as menu from '@/lib/menu'
import { effectiveWait } from '@/lib/status'
import { t } from '@/test/time'

vi.mock('@/lib/menu', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/lib/menu')>()
  return { ...orig, dayPopularity: vi.fn(orig.dayPopularity) }
})

describe('effectiveWait', () => {
  it('after midnight uses the popularity of the day the late-night window started', () => {
    effectiveWait('east', 'lateNight', t('2026-10-17T00:30'))
    const day = vi.mocked(menu.dayPopularity).mock.calls.at(-1)![0]
    expect(seoulYmd(day)).toBe('2026-10-16')
  })
})
