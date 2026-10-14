import { useEffect, useRef } from 'react'

import { DINING_HALLS } from '@/data/restaurants'
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
  // 이 탭이 이미 보낸 키. 다른 탭이 저장소 기록을 지워도 같은 알림을 다시 보내지 않는다.
  const delivered = useRef(new Set<string>())

  useEffect(() => {
    const next: AlertSnapshot = {
      at: now,
      levels: Object.fromEntries(DINING_HALLS.map((h) => [h, level(h, now)])) as AlertSnapshot['levels'],
    }
    const today = seoulYmd(now)
    const sent = loadSent(today)
    delivered.current.forEach((k) => sent.add(k))
    const alerts = evaluateAlerts(prev.current, next, getSubscriptions(), getFavorites(), sent)
    for (const a of alerts) {
      deliverAlert(a)
      sent.add(a.key)
      delivered.current.add(a.key)
    }
    if (alerts.length > 0) saveSent(sent, today)
    prev.current = next
  }, [now])
}
