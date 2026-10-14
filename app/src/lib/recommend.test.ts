import { describe, expect, it } from 'vitest'

import { t } from '@/test/time'

import { forecast, homeHeadline, recommendTime } from './recommend'

describe('recommend', () => {
  it('Wednesday 12:20 headline', () => {
    const h = homeHeadline(t('2026-10-14T12:20'))
    expect(h.title).toBe('지금은 서관·신관이 바로 드실 수 있어요')
    expect(h.detail).toMatch(/^동관은 \d+시( \d+분)?부터 한산해질 것으로 보여요$/)
    expect(h.tiles).toEqual(['서', '신'])
  })
  it('15:30 shows next service', () =>
    expect(homeHeadline(t('2026-10-14T15:30')).title).toBe('다음 배식은 석식 17:30부터예요'))
  it('03:00 shows breakfast', () =>
    expect(homeHeadline(t('2026-10-15T03:00')).title).toBe('다음 배식은 조식 06:00부터예요'))
  it('Saturday lunch mentions east only', () =>
    expect(homeHeadline(t('2026-10-17T12:20')).detail).toBe('주말과 공휴일에는 동관만 운영해요'))
  it('recommendTime is before closing and under 3 min', () => {
    const r = recommendTime('east', 'lunch', t('2026-10-14T12:20'))!
    expect(r.getTime()).toBeLessThan(t('2026-10-14T15:00').getTime())
  })
  it('forecast marks exactly one now bucket', () =>
    expect(forecast('east', 'lunch', t('2026-10-14T12:20')).filter((p) => p.isNow)).toHaveLength(1))
})
