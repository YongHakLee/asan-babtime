import { useCallback, useSyncExternalStore } from 'react'

import type { BuildingId } from '@/domain/types'
import {
  getFavorites,
  getSubscriptions,
  getWorkBuilding,
  setSubscriptions,
  setWorkBuilding,
  subscribePrefs,
  toggleFavorite,
  type Subscriptions,
} from '@/lib/prefs'

// 스냅샷 참조를 안정적으로 유지하기 위해 직렬화한 문자열을 스냅샷으로 쓴다.
function useStored<T>(read: () => T): T {
  const get = useCallback(() => JSON.stringify(read()), [read])
  return JSON.parse(useSyncExternalStore(subscribePrefs, get)) as T
}

export function usePrefs(): {
  favorites: string[]
  subscriptions: Subscriptions
  workBuilding: BuildingId | null
  toggleFavorite: (name: string) => void
  setSubscriptions: (s: Subscriptions) => void
  setWorkBuilding: (b: BuildingId | null) => void
} {
  const favorites = useStored(getFavorites)
  const subscriptions = useStored(getSubscriptions)
  const workBuilding = useStored(getWorkBuilding)
  return { favorites, subscriptions, workBuilding, toggleFavorite, setSubscriptions, setWorkBuilding }
}
