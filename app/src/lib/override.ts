import { DINING_HALLS } from '@/data/restaurants'
import type { DiningHallId, MealKey } from '@/domain/types'
import { getActiveMeal, seoulYmd } from '@/lib/hours'
import { modelWait } from '@/lib/model'
import type { CongestionLevel } from '@/lib/queue'
import { storage } from '@/lib/storage'

export interface StaffEntry {
  /** 취소할 때 가리킬 식별자 */
  id: string
  hall: DiningHallId
  level: CongestionLevel
  /** 입력한 순간의 화면 시각(시연 시각일 수 있음), epoch ms. "HH:MM에 입력" 표기와 기간 집계에 쓴다. */
  at: number
  /** 입력한 순간의 실제 시각(Date.now()), epoch ms. 유효 시간(15분)과 정리(48시간)는 이것으로 잰다. */
  realAt: number
  /** 입력한 순간의 모델 예측(직원 입력을 덧씌우기 전) */
  model: { level: CongestionLevel; waitMinutes: number }
  /** 취소했으면 그 실제 시각 */
  cancelledAt?: number
}

export interface SoldOut {
  hall: DiningHallId
  meal: MealKey
  course?: string
  /** Seoul YYYY-MM-DD */
  date: string
  /** 입력한 순간의 화면 시각(시연 시각일 수 있음), epoch ms. 운영자 화면 품절 기록 표기에만 쓴다. */
  at?: number
}

const LOG_KEY = 'staffLog'
const SOLDOUT_KEY = 'soldout'
const CHANNEL = 'babttae'
const WATCHED_KEYS = [`babttae.${LOG_KEY}`, `babttae.${SOLDOUT_KEY}`]
export const OVERRIDE_TTL_MS = 15 * 60_000
const LOG_KEEP_MS = 48 * 3_600_000
const LEVELS: readonly CongestionLevel[] = ['ok', 'mid', 'queue', 'busy']

const channel: BroadcastChannel | null =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL)

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((fn) => fn())

if (channel) channel.onmessage = notify

const isHall = (h: unknown): h is DiningHallId => DINING_HALLS.includes(h as DiningHallId)

const isLevel = (l: unknown): l is CongestionLevel => LEVELS.includes(l as CongestionLevel)
const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

function isEntry(x: unknown): x is StaffEntry {
  if (!x || typeof x !== 'object') return false
  const e = x as Record<string, unknown>
  const m = e.model as Record<string, unknown> | null | undefined
  return (
    typeof e.id === 'string' &&
    isHall(e.hall) &&
    isLevel(e.level) &&
    isNum(e.at) &&
    isNum(e.realAt) &&
    !!m &&
    typeof m === 'object' &&
    isLevel(m.level) &&
    isNum(m.waitMinutes) &&
    (e.cancelledAt === undefined || isNum(e.cancelledAt))
  )
}

/** 저장된 직원 입력 기록. 형식이 다른 항목(예전 westNew 등)은 건너뛴다. */
function readLog(): StaffEntry[] {
  const raw = storage.get<unknown>(LOG_KEY, [])
  return Array.isArray(raw) ? raw.filter(isEntry) : []
}

function writeLog(log: StaffEntry[]) {
  const now = Date.now()
  storage.set(LOG_KEY, log.filter((e) => now - e.realAt <= LOG_KEEP_MS))
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

const newId = (realAt: number) =>
  globalThis.crypto?.randomUUID?.() ?? `${realAt}-${Math.random().toString(36).slice(2)}`

export function addStaffEntry(hall: DiningHallId, level: CongestionLevel, at: Date): StaffEntry {
  const meal = getActiveMeal(hall, at)
  const realAt = Date.now()
  const entry: StaffEntry = {
    id: newId(realAt),
    hall,
    level,
    at: at.getTime(),
    realAt,
    model: meal ? modelWait(hall, meal, at) : { level: 'ok', waitMinutes: 0 },
  }
  writeLog([...readLog(), entry])
  broadcast()
  return entry
}

export function cancelStaffEntry(id: string): void {
  const log = readLog()
  if (!log.some((e) => e.id === id)) return
  writeLog(log.map((e) => (e.id === id ? { ...e, cancelledAt: Date.now() } : e)))
  broadcast()
}

/** 남은 유효 시간(ms). 실제 시계 기준이라 탭마다 시연 시각이 달라도 같다. */
export function entryRemainingMs(e: StaffEntry): number {
  return OVERRIDE_TTL_MS - (Date.now() - e.realAt)
}

/**
 * 지금 유효한 직원 입력. 그 식당의 마지막 항목만 본다(취소하면 앞 입력을 되살리지 않고 예측으로 돌아간다).
 * 유효 여부는 실제 시계로만 판단한다(0 ≤ 경과 < 15분). 시연 시각은 탭마다 달라 쓰지 않는다.
 */
export function getActiveEntry(hall: DiningHallId): StaffEntry | null {
  const e = readLog().filter((x) => x.hall === hall).at(-1)
  if (!e || e.cancelledAt !== undefined) return null
  const age = Date.now() - e.realAt
  return age >= 0 && age < OVERRIDE_TTL_MS ? e : null
}

/** 그 날(서울 YYYY-MM-DD, 입력 화면 시각 기준) 입력. 취소 포함, 입력 순서. */
export function staffEntriesOn(ymd: string): StaffEntry[] {
  return readLog().filter((e) => seoulYmd(new Date(e.at)) === ymd)
}

/** 그 날 그 식당의 취소되지 않은 마지막 입력. */
export function lastEntryOn(hall: DiningHallId, ymd: string): StaffEntry | null {
  return staffEntriesOn(ymd).filter((e) => e.hall === hall && e.cancelledAt === undefined).at(-1) ?? null
}

export function allStaffEntries(): StaffEntry[] {
  return readLog()
}

const sameSoldOut = (a: SoldOut, b: SoldOut) =>
  a.hall === b.hall && a.meal === b.meal && a.course === b.course && a.date === b.date

export function setSoldOut(s: SoldOut, on: boolean): void {
  const rest = readSoldOut().filter((x) => !sameSoldOut(x, s))
  storage.set(SOLDOUT_KEY, on ? [...rest, s] : rest)
  broadcast()
}

/** 그 날(서울 YYYY-MM-DD) 품절 입력. 입력한 순서대로. */
export function soldOutOn(date: string): SoldOut[] {
  return readSoldOut().filter((x) => x.date === date)
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
