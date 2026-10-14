import { describe, expect, it } from 'vitest'
import { t } from '@/test/time'
import { BOX_LUNCH_NOTICE, BOX_LUNCH_RESERVATION } from '@/data/menus/box-lunch-reservation'
import { MENU_WEEK_LABEL, dayPopularity, getCourses, getMenuForDate, summary } from './menu'

describe('menu', () => {
  it('maps any Wednesday to the stored Wednesday', () => {
    expect(getCourses(t('2026-11-04T12:00'), 'east', 'lunch')[0].items[0].name).toBe('꽈리고추간장닭갈비')
    expect(getCourses(t('2026-10-14T12:00'), 'westNew', 'lunch')[0].items[0].name).toBe('투움바파스타')
  })
  it('east lunch is more popular than westNew on Wednesday', () =>
    expect(dayPopularity(t('2026-10-14T12:00'), 'east', 'lunch')).toBeGreaterThan(
      dayPopularity(t('2026-10-14T12:00'), 'westNew', 'lunch'),
    ))
  it('no box lunch on Sunday', () => expect(getCourses(t('2026-10-18T12:00'), 'boxLunch', 'lunch')).toEqual([]))
  it('takeout has three zones with picks 2,3,4', () =>
    expect(getMenuForDate(t('2026-10-14T12:00')).takeout.zones.map((z) => z.pick)).toEqual([2, 3, 4]))
  it('summary joins first two items', () =>
    expect(summary(getCourses(t('2026-10-14T12:00'), 'east', 'lunch'))).toBe('꽈리고추간장닭갈비, 순두부찌개'))
  it('week label and stored dates', () => {
    expect(MENU_WEEK_LABEL).toBe('10월 3주차 메뉴 기준')
    expect(getMenuForDate(t('2026-10-12T09:00')).date).toBe('2026-10-12')
    expect(getMenuForDate(t('2026-10-18T09:00')).date).toBe('2026-10-18')
  })
  it('uses Seoul weekday near midnight', () => {
    // 2026-11-03T23:30Z is Wed 08:30 in Seoul
    expect(getMenuForDate(new Date('2026-11-03T23:30:00Z')).date).toBe('2026-10-14')
  })
  it('weekend westNew lunch is the live corner; dinner may be one merged course', () => {
    expect(getCourses(t('2026-10-17T12:00'), 'westNew', 'lunch')[0].label).toBe('라이브코너(서관)')
    expect(getCourses(t('2026-10-14T18:00'), 'east', 'dinner')).toHaveLength(1)
    expect(getCourses(t('2026-10-12T18:00'), 'east', 'dinner').map((c) => c.label)).toEqual(['A', 'B'])
  })
  it('popularity defaults to 1.0 when no menu', () =>
    expect(dayPopularity(t('2026-10-18T12:00'), 'boxLunch', 'lunch')).toBe(1))
  it('box lunch reservation covers 10/19-23', () => {
    expect(BOX_LUNCH_RESERVATION.map((r) => r.date)).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
    ])
    expect(BOX_LUNCH_NOTICE).toBe('AMIS3.0 도시락신청, 월 08:30 ~ 목 17:30, 하루 500개 한정')
  })
})
