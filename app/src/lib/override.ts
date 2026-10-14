import type { DiningHallId, MealKey } from '@/domain/types'
import { seoulYmd } from '@/lib/hours'
import { storage } from '@/lib/storage'

export type OverrideKind = 'queue' | 'clear'

export interface Override {
  hall: DiningHallId
  kind: OverrideKind
  /** epoch ms */
  at: number
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
export const OVERRIDE_TTL_MS = 15 * 60_000

type OverrideMap = Partial<Record<DiningHallId, Override>>

const channel: BroadcastChannel | null =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL)

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((fn) => fn())

if (channel) channel.onmessage = notify

function broadcast() {
  channel?.postMessage('changed')
  notify()
}

export function setOverride(hall: DiningHallId, kind: OverrideKind, at: Date): void {
  const map = storage.get<OverrideMap>(OVERRIDE_KEY, {})
  storage.set(OVERRIDE_KEY, { ...map, [hall]: { hall, kind, at: at.getTime() } })
  broadcast()
}

export function getActiveOverride(hall: DiningHallId, at: Date): Override | null {
  const o = storage.get<OverrideMap>(OVERRIDE_KEY, {})[hall]
  if (!o) return null
  const age = at.getTime() - o.at
  return age >= 0 && age < OVERRIDE_TTL_MS ? o : null
}

const sameSoldOut = (a: SoldOut, b: SoldOut) =>
  a.hall === b.hall && a.meal === b.meal && a.course === b.course && a.date === b.date

export function setSoldOut(s: SoldOut, on: boolean): void {
  const rest = storage.get<SoldOut[]>(SOLDOUT_KEY, []).filter((x) => !sameSoldOut(x, s))
  storage.set(SOLDOUT_KEY, on ? [...rest, s] : rest)
  broadcast()
}

export function isSoldOut(hall: DiningHallId, meal: MealKey, course: string | undefined, at: Date): boolean {
  const date = seoulYmd(at)
  return storage
    .get<SoldOut[]>(SOLDOUT_KEY, [])
    .some((x) => x.hall === hall && x.meal === meal && x.course === course && x.date === date)
}

export function subscribeOverrides(fn: () => void): () => void {
  listeners.add(fn)
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith('babttae.')) fn()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(fn)
    window.removeEventListener('storage', onStorage)
  }
}
