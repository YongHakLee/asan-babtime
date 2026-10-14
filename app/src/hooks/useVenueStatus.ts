import { useEffect, useMemo, useReducer } from 'react'

import type { DiningHallId, MealKey, ServiceStatus } from '@/domain/types'
import { useClock } from '@/hooks/useClock'
import { getActiveMeal, getServiceStatus } from '@/lib/hours'
import { dayPopularity } from '@/lib/menu'
import { getActiveOverride, subscribeOverrides } from '@/lib/override'
import { simulateQueue, type CongestionLevel } from '@/lib/queue'

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
    const sim = simulateQueue(hall, meal, now, dayPopularity(now, hall, meal))
    const o = getActiveOverride(hall, now)
    if (o?.kind === 'queue')
      return { meal, status, waitMinutes: Math.max(sim.waitMinutes, 5), level: 'queue', source: 'staff' }
    if (o?.kind === 'clear') return { meal, status, waitMinutes: 0, level: 'ok', source: 'staff' }
    return { meal, status, waitMinutes: sim.waitMinutes, level: sim.level, source: 'model' }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hall, now, version])
}
