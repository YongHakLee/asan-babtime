import { describe, expect, it, vi } from 'vitest'

import { deliverAlert, evaluateAlerts, loadSent, pruneSent, saveSent, type AppAlert } from '@/lib/alerts'
import { getCourses } from '@/lib/menu'
import type { Subscriptions } from '@/lib/prefs'
import type { CongestionLevel } from '@/lib/queue'
import { t } from '@/test/time'

const snap = (s: string, east: CongestionLevel, westNew: CongestionLevel = 'ok') => ({ at: t(s), levels: { east, westNew } })
const subs = { queueCleared: ['east'], favoriteDay: true, boxLunchDeadline: true, closingSoon: true } as Subscriptions

describe('evaluateAlerts', () => {
  it('fires queueCleared once', () => {
    const a = evaluateAlerts(snap('2026-10-14T12:40', 'busy'), snap('2026-10-14T12:41', 'ok'), subs, [], new Set())
    expect(a.map((x) => x.kind)).toContain('queueCleared')
    expect(
      evaluateAlerts(snap('2026-10-14T12:40', 'busy'), snap('2026-10-14T12:41', 'ok'), subs, [], new Set(a.map((x) => x.key))).filter((x) => x.kind === 'queueCleared'),
    ).toHaveLength(0)
  })
  it('favoriteDay at 10:30 when favorite appears', () =>
    expect(evaluateAlerts(null, snap('2026-10-14T10:31', 'ok'), subs, ['닭갈비'], new Set()).some((x) => x.kind === 'favoriteDay')).toBe(true))
  it('favoriteDay body names venue, meal and item', () => {
    const a = evaluateAlerts(null, snap('2026-10-14T10:31', 'ok'), subs, ['닭갈비'], new Set()).find((x) => x.key === 'favoriteDay:2026-10-14')
    expect(a?.body).toMatch(/^오늘 .+ (조식|중식|석식|야식|이동식): .*닭갈비/)
  })
  it('boxLunchDeadline only Thursday 16:30–17:30', () => {
    expect(evaluateAlerts(null, snap('2026-10-15T16:45', 'ok'), subs, [], new Set()).some((x) => x.kind === 'boxLunchDeadline')).toBe(true)
    expect(evaluateAlerts(null, snap('2026-10-14T16:45', 'ok'), subs, [], new Set()).some((x) => x.kind === 'boxLunchDeadline')).toBe(false)
  })
  it('closingSoon for westNew at 13:35', () =>
    expect(evaluateAlerts(null, snap('2026-10-14T13:35', 'ok'), subs, [], new Set()).some((x) => x.key.startsWith('closingSoon:westNew'))).toBe(true))
  it('no queueCleared when the hall merely closed (westNew Wed 13:59 busy -> 14:00)', () => {
    const s2 = { ...subs, queueCleared: ['westNew'] } as Subscriptions
    const a = evaluateAlerts(snap('2026-10-14T13:59', 'ok', 'busy'), snap('2026-10-14T14:00', 'ok', 'ok'), s2, [], new Set())
    expect(a.some((x) => x.kind === 'queueCleared')).toBe(false)
  })
  it('favoriteDay eve: tomorrow favorite after 18:00', () => {
    const fav = getCourses(t('2026-10-14T12:00'), 'east', 'lunch').flatMap((c) => c.items).find((i) => i.name.includes('닭갈비'))!.name
    const a = evaluateAlerts(null, snap('2026-10-13T18:00', 'ok'), subs, ['닭갈비'], new Set()).find((x) => x.key === 'favoriteDay:eve:2026-10-13')
    expect(a?.body).toBe(`내일 동관 중식: ${fav}`)
    expect(evaluateAlerts(null, snap('2026-10-13T17:59', 'ok'), subs, ['닭갈비'], new Set()).some((x) => x.key.startsWith('favoriteDay:eve'))).toBe(false)
  })
  it('favoriteDay names the matching item for today', () => {
    const a = evaluateAlerts(null, snap('2026-10-14T10:31', 'ok'), subs, ['닭갈비'], new Set()).find((x) => x.key === 'favoriteDay:2026-10-14')
    expect(a?.body).toBe('오늘 동관 중식: 꽈리고추간장닭갈비')
    expect(evaluateAlerts(null, snap('2026-10-14T10:29', 'ok'), subs, ['닭갈비'], new Set()).some((x) => x.key === 'favoriteDay:2026-10-14')).toBe(false)
  })
  it('boxLunchDeadline edges on Thursday', () => {
    for (const [at, want] of [['2026-10-15T16:29', false], ['2026-10-15T16:30', true], ['2026-10-15T17:29', true], ['2026-10-15T17:30', false]] as const) {
      expect(evaluateAlerts(null, snap(at, 'ok'), subs, [], new Set()).some((x) => x.kind === 'boxLunchDeadline')).toBe(want)
    }
  })
  it('closingSoon body shows closing time; none when >30 min left or closed', () => {
    const a = evaluateAlerts(null, snap('2026-10-14T13:35', 'ok'), subs, [], new Set()).find((x) => x.key.startsWith('closingSoon:westNew'))
    expect(a?.body).toBe('14:00에 배식이 끝나요')
    expect(evaluateAlerts(null, snap('2026-10-14T13:29', 'ok'), subs, [], new Set()).some((x) => x.kind === 'closingSoon')).toBe(false)
    expect(evaluateAlerts(null, snap('2026-10-14T14:30', 'ok'), subs, [], new Set()).some((x) => x.key.startsWith('closingSoon:westNew'))).toBe(false)
  })
  it('sent round-trips and drops older days', () => {
    saveSent(new Set(['closingSoon:east:2026-10-13:lunch', 'favoriteDay:2026-10-14']), '2026-10-14')
    expect([...loadSent('2026-10-14')]).toEqual(['favoriteDay:2026-10-14'])
    expect([...loadSent('2026-10-15')]).toEqual([])
  })
  it('prunes sent keys of other days', () =>
    expect(pruneSent(['closingSoon:east:2026-10-13:lunch', 'favoriteDay:2026-10-14'], '2026-10-14')).toEqual(['favoriteDay:2026-10-14']))
})

describe('deliverAlert', () => {
  const alert: AppAlert = { key: 'k', kind: 'closingSoon', title: 't', body: 'b' }
  it('delivers as toast when permission denied or unsupported', () => {
    const toast = { add: vi.fn() }
    expect(deliverAlert(alert, { Notification: { permission: 'denied' } as never, toast })).toBe('toast')
    expect(deliverAlert(alert, { Notification: undefined, toast })).toBe('toast')
    expect(toast.add).toHaveBeenCalledTimes(2)
  })
  it('uses system notification when granted', () => {
    const ctor = vi.fn()
    const N = Object.assign(ctor, { permission: 'granted' }) as never
    expect(deliverAlert(alert, { Notification: N, toast: { add: vi.fn() } })).toBe('system')
    expect(ctor).toHaveBeenCalled()
  })
})
