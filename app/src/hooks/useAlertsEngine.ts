import { useEffect, useRef } from 'react'

import type { DiningHallId } from '@/domain/types'
import { useClock } from '@/hooks/useClock'
import { deliverAlert, evaluateAlerts, loadSent, saveSent, type AlertSnapshot } from '@/lib/alerts'
import { getActiveMeal, seoulYmd } from '@/lib/hours'
import { getFavorites, getSubscriptions } from '@/lib/prefs'
import type { CongestionLevel } from '@/lib/queue'
import { effectiveWait } from '@/lib/status'

function level(hall: DiningHallId, at: Date): CongestionLevel {
  const meal = getActiveMeal(hall, at)
  return meal ? effectiveWait(hall, meal, at).level : 'ok'
}

/** App 루트에서 한 번만 마운트. 시계가 바뀔 때마다 알림 규칙을 평가해 전달한다. */
export function useAlertsEngine(): void {
  const { now } = useClock()
  const prev = useRef<AlertSnapshot | null>(null)

  useEffect(() => {
    const next: AlertSnapshot = {
      at: now,
      levels: { east: level('east', now), westNew: level('westNew', now) },
    }
    const today = seoulYmd(now)
    const sent = loadSent(today)
    const alerts = evaluateAlerts(prev.current, next, getSubscriptions(), getFavorites(), sent)
    for (const a of alerts) {
      deliverAlert(a)
      sent.add(a.key)
    }
    saveSent(sent, today)
    prev.current = next
  }, [now])
}
