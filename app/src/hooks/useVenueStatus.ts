import { useEffect, useMemo, useReducer } from 'react'

import type { DiningHallId, MealKey, ServiceStatus } from '@/domain/types'
import { useClock } from '@/hooks/useClock'
import { getActiveMeal, getServiceStatus } from '@/lib/hours'
import { subscribeOverrides } from '@/lib/override'
import type { CongestionLevel } from '@/lib/queue'
import { effectiveWait } from '@/lib/status'

export interface VenueStatus {
  meal: MealKey | null
  status: ServiceStatus | null
  waitMinutes: number
  level: CongestionLevel
  source: 'model' | 'staff'
}

export function useVenueStatus(hall: DiningHallId): VenueStatus {
  const { now } = useClock()
  const [version, bump] = useReducer((n: number) => n + 1, 0)
  useEffect(() => subscribeOverrides(bump), [])

  return useMemo(() => {
    const meal = getActiveMeal(hall, now)
    if (!meal) return { meal: null, status: null, waitMinutes: 0, level: 'ok', source: 'model' }
    const status = getServiceStatus(hall, meal, now)
    return { meal, status, ...effectiveWait(hall, meal, now) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hall, now, version])
}
