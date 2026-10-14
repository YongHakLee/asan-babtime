import { DINING_HALLS } from '@/data/restaurants'
import type { DiningHallId, MealKey } from '@/domain/types'
import { seoulYmd } from '@/lib/hours'
import { storage } from '@/lib/storage'

export type OverrideKind = 'queue' | 'clear'

export interface Override {
  hall: DiningHallId
  kind: OverrideKind
  /** 입력한 순간의 화면 시각(시연 시각일 수 있음), epoch ms. "HH:MM에 입력" 표기에만 쓴다. */
  at: number
  /** 입력한 순간의 실제 시각(Date.now()), epoch ms. 유효 시간(15분)은 이것으로 잰다. */
  realAt: number
}

export interface SoldOut {
  hall: DiningHallId
  meal: MealKey
  course?: string
  /** Seoul YYYY-MM-DD */
  date: string
}

const OVERRIDE_KEY = 'overrides'
const SOLDOUT_KEY = 'soldout'
const CHANNEL = 'babttae'
const WATCHED_KEYS = [`babttae.${OVERRIDE_KEY}`, `babttae.${SOLDOUT_KEY}`]
export const OVERRIDE_TTL_MS = 15 * 60_000

type OverrideMap = Partial<Record<DiningHallId, Override>>

const channel: BroadcastChannel | null =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL)

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((fn) => fn())

if (channel) channel.onmessage = notify

const isHall = (h: unknown): h is DiningHallId => DINING_HALLS.includes(h as DiningHallId)

/** 저장된 직원 입력. 지금 식당이 아닌 항목(예전 westNew 등)과 형식이 다른 값은 건너뛴다. */
function readOverrides(): OverrideMap {
  const raw = storage.get<unknown>(OVERRIDE_KEY, {})
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: OverrideMap = {}
  for (const [k, o] of Object.entries(raw as Record<string, Override | undefined>)) {
    if (isHall(k) && o && o.hall === k) out[k] = o
  }
  return out
}

/** 저장된 품절 표시. 지금 식당이 아닌 항목은 건너뛴다. */
function readSoldOut(): SoldOut[] {
  const raw = storage.get<unknown>(SOLDOUT_KEY, [])
  return Array.isArray(raw) ? raw.filter((x): x is SoldOut => !!x && isHall((x as SoldOut).hall)) : []
}

function broadcast() {
  channel?.postMessage('changed')
  notify()
}

export function setOverride(hall: DiningHallId, kind: OverrideKind, at: Date): void {
  storage.set(OVERRIDE_KEY, { ...readOverrides(), [hall]: { hall, kind, at: at.getTime(), realAt: Date.now() } })
  broadcast()
}

/** 남은 유효 시간(ms). 실제 시계 기준이라 탭마다 시연 시각이 달라도 같다. */
export function overrideRemainingMs(o: Override): number {
  return OVERRIDE_TTL_MS - (Date.now() - o.realAt)
}

/**
 * 지금 유효한 직원 입력. 유효 여부는 실제 시계로만 판단한다(0 ≤ 경과 < 15분).
 * 시연 시각은 탭마다 다를 수 있어 쓰지 않는다.
 */
export function getActiveOverride(hall: DiningHallId): Override | null {
  const o = readOverrides()[hall]
  if (!o || typeof o.realAt !== 'number') return null
  const age = Date.now() - o.realAt
  return age >= 0 && age < OVERRIDE_TTL_MS ? o : null
}

const sameSoldOut = (a: SoldOut, b: SoldOut) =>
  a.hall === b.hall && a.meal === b.meal && a.course === b.course && a.date === b.date

export function setSoldOut(s: SoldOut, on: boolean): void {
  const rest = readSoldOut().filter((x) => !sameSoldOut(x, s))
  storage.set(SOLDOUT_KEY, on ? [...rest, s] : rest)
  broadcast()
}

export function isSoldOut(hall: DiningHallId, meal: MealKey, course: string | undefined, at: Date): boolean {
  const date = seoulYmd(at)
  return readSoldOut().some((x) => x.hall === hall && x.meal === meal && x.course === course && x.date === date)
}

export function subscribeOverrides(fn: () => void): () => void {
  listeners.add(fn)
  // 직원 입력·품절 키만 본다. 알림 기록 같은 다른 키에 반응하면 탭끼리 서로 깨우며 끝없이 돈다.
  // key가 null이면 저장소 전체가 비워진 것(clear)이라 입력도 사라졌다.
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || WATCHED_KEYS.includes(e.key)) fn()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(fn)
    window.removeEventListener('storage', onStorage)
  }
}
