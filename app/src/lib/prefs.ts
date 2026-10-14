import { BUILDINGS } from '@/data/buildings'
import { DINING_HALLS } from '@/data/restaurants'
import type { BuildingId, DiningHallId } from '@/domain/types'
import { storage } from '@/lib/storage'

export interface Subscriptions {
  queueCleared: DiningHallId[]
  favoriteDay: boolean
  boxLunchDeadline: boolean
  closingSoon: boolean
}

export interface Rating {
  stars: 1 | 2 | 3 | 4 | 5
  leftover: 'none' | 'some' | 'much'
}

const DEFAULT_SUBS: Subscriptions = {
  queueCleared: [],
  favoriteDay: false,
  boxLunchDeadline: false,
  closingSoon: false,
}

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((fn) => fn())

/** 설정이 바뀔 때마다 호출된다. 해제 함수를 돌려준다. */
export function subscribePrefs(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function getFavorites(): string[] {
  return storage.get<string[]>('favorites', [])
}

export function toggleFavorite(name: string): void {
  const cur = getFavorites()
  storage.set('favorites', cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name])
  emit()
}

/** 예전 값(westNew 등) 중 지금 식당이 아닌 것은 버린다. */
export function getSubscriptions(): Subscriptions {
  const s = { ...DEFAULT_SUBS, ...storage.get<Partial<Subscriptions>>('subscriptions', {}) }
  const halls: unknown[] = Array.isArray(s.queueCleared) ? s.queueCleared : []
  return {
    ...s,
    queueCleared: halls.filter((h): h is DiningHallId => DINING_HALLS.includes(h as DiningHallId)),
  }
}

export function setSubscriptions(s: Subscriptions): void {
  storage.set('subscriptions', s)
  emit()
}

/** 근무 건물. 저장된 값이 지금 건물 목록에 없으면 미설정으로 본다. */
export function getWorkBuilding(): BuildingId | null {
  const b = storage.get<unknown>('workBuilding', null)
  return typeof b === 'string' && Object.hasOwn(BUILDINGS, b) ? (b as BuildingId) : null
}

export function setWorkBuilding(b: BuildingId | null): void {
  storage.set('workBuilding', b)
  emit()
}

export function rateMeal(key: string, r: Rating): void {
  storage.set('ratings', { ...storage.get<Record<string, Rating>>('ratings', {}), [key]: r })
  emit()
}

export function getRating(key: string): Rating | null {
  return storage.get<Record<string, Rating>>('ratings', {})[key] ?? null
}

function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** 이름 해시 기반의 결정적 모의 평점 (3.8–4.8, 40–240건). */
export function mockRating(itemName: string): { avg: number; count: number } {
  const h = fnv1a(itemName)
  const avg = 3.8 + ((h % 101) / 100) * 1.0
  const count = 40 + (Math.floor(h / 101) % 201)
  return { avg: Math.round(avg * 10) / 10, count }
}

/** 이름 해시 기반의 결정적 모의 잔반 비율 (남기지 않음 55–70%, 많이 남김 5–12%, 나머지 조금 남김). */
export function mockLeftover(itemName: string): Record<Rating['leftover'], number> {
  const h = fnv1a(`${itemName}|leftover`)
  const none = 0.55 + ((h % 151) / 150) * 0.15
  const much = 0.05 + ((Math.floor(h / 151) % 71) / 70) * 0.07
  return { none, some: 1 - none - much, much }
}
