import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { LEVEL_LABEL, type CongestionLevel } from "@/lib/queue"

const LEVEL_TEXT: Record<CongestionLevel, string> = {
  ok: "text-status-ok",
  mid: "text-status-mid",
  queue: "text-status-queue",
  busy: "text-status-busy",
}

/** "약 16분" / 1분 미만은 "대기 없음" */
export function waitText(waitMinutes: number): string {
  const m = Math.round(waitMinutes)
  return m < 1 ? "대기 없음" : `약 ${m}분`
}

/** 오른쪽 정렬 두 줄 상태. 윗줄은 강조, 아랫줄은 보조. 색 없이 쓰면 일반 글자색. */
export function StatusLines({
  primary,
  secondary,
  className,
}: {
  primary: ReactNode
  secondary?: ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        "flex flex-col items-end text-right text-[0.8125rem] leading-tight font-bold whitespace-nowrap",
        className
      )}
    >
      <span>{primary}</span>
      {secondary && (
        <span className="mt-1 text-xs font-medium text-muted-foreground">
          {secondary}
        </span>
      )}
    </p>
  )
}

/** 혼잡도 라벨과 예상 대기. 상태는 늘 글자로 쓰고 색은 보조로만 쓴다. */
export function StatusText({
  level,
  waitMinutes,
}: {
  level: CongestionLevel
  waitMinutes: number
}) {
  return (
    <StatusLines
      className={LEVEL_TEXT[level]}
      primary={LEVEL_LABEL[level]}
      secondary={waitText(waitMinutes)}
    />
  )
}
