import { DINING_HALLS as HALLS, MENU_GROUPS, VENUES } from '@/data/restaurants'
import type { DiningHallId, MealKey, MenuGroupId } from '@/domain/types'
import { toast } from '@/components/ui/toast'
import { getActiveMeal, getServiceStatus, seoulYmd } from '@/lib/hours'
import { getCourses } from '@/lib/menu'
import type { Subscriptions } from '@/lib/prefs'
import type { CongestionLevel } from '@/lib/queue'
import { storage } from '@/lib/storage'

export type AlertKind = 'queueCleared' | 'favoriteDay' | 'boxLunchDeadline' | 'closingSoon'

export interface AppAlert {
  key: string
  kind: AlertKind
  title: string
  body: string
}

export interface AlertSnapshot {
  at: Date
  levels: Record<DiningHallId, CongestionLevel>
}

const GROUPS = Object.keys(MENU_GROUPS) as MenuGroupId[]
const MEALS: MealKey[] = ['breakfast', 'lunch', 'dinner', 'lateNight', 'mobile']
const MEAL_LABEL: Record<MealKey, string> = {
  breakfast: '조식',
  lunch: '중식',
  dinner: '석식',
  lateNight: '야식',
  mobile: '이동식',
}

const hmFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function seoulHm(d: Date): { h: number; m: number } {
  const p = Object.fromEntries(hmFmt.formatToParts(d).map((x) => [x.type, x.value]))
  return { h: Number(p.hour), m: Number(p.minute) }
}

function hm(d: Date): string {
  const { h, m } = seoulHm(d)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function seoulDow(d: Date): number {
  const [y, m, day] = seoulYmd(d).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day)).getUTCDay()
}

/** 메뉴 묶음마다 한 번만 찾는다(서관·신관은 같은 메뉴라 "서관·신관"으로 알린다). */
function findFavorite(at: Date, favorites: string[]): { place: string; meal: MealKey; item: string } | null {
  for (const group of GROUPS) {
    const { label, venues } = MENU_GROUPS[group]
    for (const meal of MEALS) {
      for (const course of getCourses(at, venues[0], meal)) {
        for (const item of course.items) {
          if (favorites.some((f) => item.name.includes(f))) return { place: label, meal, item: item.name }
        }
      }
    }
  }
  return null
}

export function evaluateAlerts(
  prev: AlertSnapshot | null,
  next: AlertSnapshot,
  subs: Subscriptions,
  favorites: string[],
  sent: ReadonlySet<string>,
): AppAlert[] {
  const out: AppAlert[] = []
  const push = (a: AppAlert) => {
    if (!sent.has(a.key) && !out.some((o) => o.key === a.key)) out.push(a)
  }
  const date = seoulYmd(next.at)
  const { h, m } = seoulHm(next.at)
  const minuteOfDay = h * 60 + m

  if (prev) {
    for (const hall of subs.queueCleared) {
      const was = prev.levels[hall]
      const now = next.levels[hall]
      // 배식 종료로 대기가 사라진 경우는 제외: 다음 시점에 같은 끼니가 열려 있어야 한다
      const mealNext = getActiveMeal(hall, next.at)
      const mealPrev = getActiveMeal(hall, prev.at)
      if (!mealNext || mealNext !== mealPrev) continue
      if ((was === 'queue' || was === 'busy') && now === 'ok') {
        push({
          key: `queueCleared:${hall}:${date}:${String(h).padStart(2, '0')}`,
          kind: 'queueCleared',
          title: `${VENUES[hall].label} 대기가 줄었어요`,
          body: '지금 가면 바로 드실 수 있어요',
        })
      }
    }
  }

  if (subs.favoriteDay && favorites.length > 0) {
    if (minuteOfDay >= 10 * 60 + 30) {
      const f = findFavorite(next.at, favorites)
      if (f) {
        push({
          key: `favoriteDay:${date}`,
          kind: 'favoriteDay',
          title: '즐겨찾는 메뉴가 나와요',
          body: `오늘 ${f.place} ${MEAL_LABEL[f.meal]}: ${f.item}`,
        })
      }
    }
    if (minuteOfDay >= 18 * 60) {
      const tomorrow = new Date(next.at.getTime() + 24 * 3600 * 1000)
      const f = findFavorite(tomorrow, favorites)
      if (f) {
        push({
          key: `favoriteDay:eve:${date}`,
          kind: 'favoriteDay',
          title: '즐겨찾는 메뉴가 나와요',
          body: `내일 ${f.place} ${MEAL_LABEL[f.meal]}: ${f.item}`,
        })
      }
    }
  }

  if (subs.boxLunchDeadline && seoulDow(next.at) === 4 && minuteOfDay >= 16 * 60 + 30 && minuteOfDay < 17 * 60 + 30) {
    push({
      key: `boxLunchDeadline:${date}`,
      kind: 'boxLunchDeadline',
      title: '도시락 예약이 오늘 17:30에 마감돼요',
      body: '다음 주 도시락은 AMIS3.0에서 신청할 수 있어요',
    })
  }

  if (subs.closingSoon) {
    const closing: { hall: DiningHallId; meal: MealKey; closesAt: Date }[] = []
    for (const hall of HALLS) {
      const meal = getActiveMeal(hall, next.at)
      if (!meal) continue
      const s = getServiceStatus(hall, meal, next.at)
      if (s.kind === 'open' && s.minutesLeft <= 30) closing.push({ hall, meal, closesAt: s.closesAt })
    }
    // 서관·신관은 같은 메뉴·같은 마감이라 같은 시각에 끝나면 한 번만 알린다
    const west = closing.find((c) => c.hall === 'west')
    const nw = closing.find((c) => c.hall === 'new')
    const merged = west && nw && west.meal === nw.meal && west.closesAt.getTime() === nw.closesAt.getTime()
    for (const c of closing) {
      if (merged && c.hall === 'new') continue
      const both = merged && c.hall === 'west'
      push({
        key: both ? `closingSoon:westNew:${date}:${c.meal}` : `closingSoon:${c.hall}:${date}:${c.meal}`,
        kind: 'closingSoon',
        title: `${both ? MENU_GROUPS.westNew.label : VENUES[c.hall].label} ${MEAL_LABEL[c.meal]} 배식이 30분 남았어요`,
        body: `${hm(c.closesAt)}에 배식이 끝나요`,
      })
    }
  }

  return out
}

interface ToastLike {
  add: (o: { title: string; description?: string }) => unknown
}

export function deliverAlert(
  a: AppAlert,
  deps: { Notification: typeof Notification | undefined; toast: ToastLike } = {
    Notification: globalThis.Notification,
    toast,
  },
): 'system' | 'toast' {
  const N = deps.Notification
  if (N && N.permission === 'granted') {
    try {
      new N(a.title, { body: a.body, tag: a.key })
      return 'system'
    } catch {
      // 일부 환경(모바일 등)에서는 생성자 호출이 막힌다 — 토스트로 대체
    }
  }
  deps.toast.add({ title: a.title, description: a.body })
  return 'toast'
}

export async function requestPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported'
  const r = await Notification.requestPermission()
  return r === 'granted' ? 'granted' : 'denied'
}

const SENT_KEY = 'alerts.sent'
const KEEP_DAYS = 2
const DATE_RE = /\d{4}-\d{2}-\d{2}/

function daysBefore(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10)
}

/**
 * 평가 시각 기준 최근 2일(그 이전 날짜는 버림)과 미래 날짜의 키를 남긴다.
 * 탭마다 시연 날짜가 달라도 서로의 기록을 지우지 않도록 '오늘'만 남기지 않는다.
 */
export function pruneSent(keys: string[], today: string): string[] {
  const oldest = daysBefore(today, KEEP_DAYS)
  return keys.filter((k) => {
    const date = k.match(DATE_RE)?.[0]
    return date !== undefined && date >= oldest
  })
}

export function loadSent(today: string): Set<string> {
  return new Set(pruneSent(storage.get<string[]>(SENT_KEY, []), today))
}

/** 남길 키 집합이 저장된 것과 같으면 쓰지 않는다(쓰기가 다른 탭을 깨우지 않게). */
export function saveSent(sent: ReadonlySet<string>, today: string): void {
  const next = pruneSent([...sent], today)
  const current = new Set(pruneSent(storage.get<string[]>(SENT_KEY, []), today))
  if (next.length === current.size && next.every((k) => current.has(k))) return
  storage.set(SENT_KEY, next)
}
