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

describe('headline with a work building', () => {
  beforeEach(() => localStorage.clear())
  it('headline with building', () =>
    expect(homeHeadline(t('2026-10-14T12:20'), 'west')).toMatchObject({
      title: '지금 출발하면 신관이 가장 빨라요',
      detail: '걸어서 4분, 도착하면 바로 드실 수 있어요',
      tiles: ['신'],
    }))
  it('says the wait on arrival when there is one', () => {
    // 동관에서 12:00 출발: 동관은 기다려도 걸어서 8분인 신관보다 빠르다
    const h = homeHeadline(t('2026-10-14T12:00'), 'east')
    expect(h.title).toBe('지금 출발하면 동관이 가장 빨라요')
    expect(h.detail).toBe('걸어서 2분, 도착하면 약 6분 기다려요')
  })
  it('falls back when nothing open', () =>
    expect(homeHeadline(t('2026-10-14T15:30'), 'west').title).toBe('다음 배식은 석식 17:30부터예요'))
  it('nothing reachable before closing: says so and names the next service (아산생명과학연구원, Wed 14:55)', () =>
    expect(homeHeadline(t('2026-10-14T14:55'), 'asanLife')).toMatchObject({
      title: '지금 출발하면 마감 전에 도착하기 어려워요',
      detail: '다음 배식은 석식 17:30부터예요',
      tiles: [],
    }))
  it('just before opening says when serving starts (Wed 10:55 from 동관)', () => {
    const h = homeHeadline(t('2026-10-14T10:55'), 'east')
    expect(h).toMatchObject({ title: '지금 출발하면 동관이 가장 빨라요', tiles: ['동'] })
    expect(h.detail).toMatch(/^걸어서 2분, 11:00 배식 시작까지 3분/)
  })
  it('opens well after arrival: counts minutes until opening (Wed 10:31 from 서관)', () =>
    expect(homeHeadline(t('2026-10-14T10:31'), 'west')).toMatchObject({
      title: '지금 출발하면 서관이 가장 빨라요',
      detail: '걸어서 2분, 11:00 배식 시작까지 27분',
    }))
  it('dinner opening (Wed 17:05 from 동관)', () =>
    expect(homeHeadline(t('2026-10-14T17:05'), 'east').detail).toMatch(/^걸어서 2분, 17:30 배식 시작까지 23분/))
  it('adds the expected wait right after opening when it is 2 minutes or more', () => {
    // 개시 직후 대기는 직원 입력 '줄 있음'(최소 5분)으로 만든다. 세 식당 모두 표시해 동관이 그대로 가장 빠르게
    const at = t('2026-10-14T10:55')
    for (const hall of ['east', 'west', 'new'] as const) addStaffEntry(hall, 'queue', at)
    const m = Math.round(effectiveWait('east', 'lunch', t('2026-10-14T11:00')).waitMinutes)
    expect(m).toBeGreaterThanOrEqual(2)
    expect(homeHeadline(at, 'east')).toMatchObject({
      title: '지금 출발하면 동관이 가장 빨라요',
      detail: `걸어서 2분, 11:00 배식 시작까지 3분 (시작 직후 약 ${m}분 대기)`,
    })
  })
  it('the same moment without a work building still recommends the open hall', () =>
    expect(homeHeadline(t('2026-10-14T14:55')).title).toMatch(/^지금은 동관이/))
  it('a nearby building still reaches east before closing at 14:55', () =>
    expect(homeHeadline(t('2026-10-14T14:55'), 'east').title).toBe('지금 출발하면 동관이 가장 빨라요'))
  it('null building keeps the existing rule', () =>
    expect(homeHeadline(t('2026-10-14T12:20'), null).title).toBe('지금은 신관이 바로 드실 수 있어요'))
})
