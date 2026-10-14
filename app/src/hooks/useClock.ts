import { useContext } from "react"

import { ClockContext, type ClockValue } from "@/providers/clock"

export function useClock(): ClockValue {
  const context = useContext(ClockContext)
  if (!context) throw new Error("useClock must be used within ClockProvider")
  return context
}
