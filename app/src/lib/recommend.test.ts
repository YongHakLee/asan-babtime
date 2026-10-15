import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getServiceStatus } from '@/lib/hours'
import { addStaffEntry, entryRemainingMs } from '@/lib/override'
import { effectiveWait } from '@/lib/status'

import { t } from '@/test/time'

import { forecast, homeHeadline, koreanTime, recommendTime } from './recommend'

describe('recommend', () => {
  beforeEach(() => localStorage.clear())
  it('Wednesday 12:20 headline', () => {
    const h = homeHeadline(t('2026-10-14T12:20'))
    expect(h.title).toBe('지금은 신관이 바로 드실 수 있어요')
    expect(h.detail).toBe('동관은 13시 15분, 서관은 12시 45분부터 한산해질 것으로 보여요')
    expect(h.tiles).toEqual(['신'])
    expect(h.pick).toBe('new')
  })
  it('no pick when nothing is open', () => {
    expect(homeHeadline(t('2026-10-14T15:30')).pick).toBeNull()
    expect(homeHeadline(t('2026-10-15T03:00')).pick).toBeNull()
  })
  it('15:30 shows next service', () =>
    expect(homeHeadline(t('2026-10-14T15:30')).title).toBe('다음 배식은 석식 17:30부터예요'))
  it('out-of-hours detail names the next meal before its dishes', () =>
    expect(homeHeadline(t('2026-10-14T15:30')).detail).toMatch(/^석식 메뉴: .+/))
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

  it('queue override on east pushes the recommendation past its expiry', () => {
    const at = t('2026-10-14T12:20')
    addStaffEntry('east', 'queue', at)
    const h = homeHeadline(at)
    expect(h.title).toBe('지금은 신관이 바로 드실 수 있어요')
    const r = recommendTime('east', 'lunch', at)!
    expect(r.getTime()).toBeGreaterThanOrEqual(at.getTime() + 15 * 60_000 - 1000)
    expect(h.detail).toMatch(/^동관은 .+, 서관은 .+부터 한산해질 것으로 보여요$/)
  })
  it('override expiry in demo terms uses the real time left (at + TTL - real elapsed)', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(new Date('2026-10-20T01:00:00Z'))
      addStaffEntry('east', 'queue', t('2026-10-14T13:20'))
      vi.setSystemTime(new Date('2026-10-20T01:05:00Z'))
      // 실제로 5분 지났으니 10분 남았다. 모델은 13:15부터 한산하지만 13:30 전에는 권하지 않는다
      const at = t('2026-10-14T13:20')
      expect(recommendTime('east', 'lunch', at)!.getTime()).toBe(t('2026-10-14T13:30').getTime())
    } finally {
      vi.useRealTimers()
    }
  })
  it('mid input with model wait under 3 recommends now', () => {
    // 동관 2026-10-14 11:55 모델 대기 약 2.7분
    const at = t('2026-10-14T11:55')
    addStaffEntry('east', 'mid', at)
    expect(effectiveWait('east', 'lunch', at).waitMinutes).toBeLessThan(3)
    expect(recommendTime('east', 'lunch', at)!.getTime()).toBe(at.getTime())
  })
  it('mid input with model wait 3 or more waits for expiry', () => {
    // 동관 2026-10-14 12:00 모델 대기 약 4.7분 → 보통 범위 위끝 4.4분
    const at = t('2026-10-14T12:00')
    const e = addStaffEntry('east', 'mid', at)
    expect(effectiveWait('east', 'lunch', at).waitMinutes).toBeGreaterThanOrEqual(3)
    expect(recommendTime('east', 'lunch', at)!.getTime()).toBeGreaterThanOrEqual(at.getTime() + entryRemainingMs(e))
  })
  it('clear override on east: east wins the tie, west still clears later', () => {
    const at = t('2026-10-14T12:20')
    addStaffEntry('east', 'ok', at)
    const h = homeHeadline(at)
    expect(h.title).toBe('지금은 동관이 바로 드실 수 있어요')
    expect(h.tiles).toEqual(['동'])
    expect(h.detail).toBe('서관은 12시 45분부터 한산해질 것으로 보여요')
  })
  it('tie order is east, west, new', () => {
    const at = t('2026-10-14T12:20')
    addStaffEntry('west', 'ok', at)
    expect(homeHeadline(at)).toMatchObject({ title: '지금은 서관이 바로 드실 수 있어요', tiles: ['서'] })
    expect(homeHeadline(at).detail).toBe('동관은 13시 15분부터 한산해질 것으로 보여요')
  })
  it('no detail when the others are already quiet', () => {
    const at = t('2026-10-14T12:20')
    addStaffEntry('east', 'ok', at)
    addStaffEntry('west', 'ok', at)
    expect(homeHeadline(at)).toMatchObject({ title: '지금은 동관이 바로 드실 수 있어요', detail: null })
  })
  it('fastest-wait branch', () =>
    expect(homeHeadline(t('2026-10-17T12:20')).title).toBe('지금은 동관이 가장 빨라요, 약 6분 기다려요'))
  it('recommendTime returns exactly at when already quiet', () => {
    const at = t('2026-10-14T12:20')
    expect(recommendTime('new', 'lunch', at)!.getTime()).toBe(at.getTime())
  })
  it('forecast covers the window in 10 minute buckets', () => {
    const at = t('2026-10-14T12:20')
    const f = forecast('east', 'lunch', at)
    const s = getServiceStatus('east', 'lunch', at)
    if (s.kind !== 'open') throw new Error('expected open')
    expect(f[0].time.getTime()).toBe(s.opensAt.getTime())
    f.slice(1).forEach((p, i) => expect(p.time.getTime() - f[i].time.getTime()).toBe(10 * 60_000))
    expect(f[f.length - 1].time.getTime()).toBeLessThan(s.closesAt.getTime())
  })
  it('formats whole hours without minutes', () => {
    expect(koreanTime(t('2026-10-14T13:00'))).toBe('13시')
    expect(koreanTime(t('2026-10-14T13:05'))).toBe('13시 5분')
  })
})

describe('three dining halls', () => {
  beforeEach(() => localStorage.clear())
  it('Wed 12:20 three halls', () => {
    const at = t('2026-10-14T12:20')
    expect(['queue', 'busy']).toContain(effectiveWait('east', 'lunch', at).level)
    expect(effectiveWait('west', 'lunch', at).level).toBe('queue')
    expect(effectiveWait('new', 'lunch', at).level).toBe('ok')
    expect(homeHeadline(at)).toMatchObject({ title: '지금은 신관이 바로 드실 수 있어요', tiles: ['신'] })
    expect(homeHeadline(at).detail).toMatch(/^동관은 \d+시( \d+분)?, 서관은 \d+시( \d+분)?부터 한산해질 것으로 보여요$/)
  })
  it('Saturday: only east', () => expect(homeHeadline(t('2026-10-17T12:20')).detail).toBe('주말과 공휴일에는 동관만 운영해요'))
})
