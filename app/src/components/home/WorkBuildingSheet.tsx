import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Building03Icon } from "@hugeicons/core-free-icons"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { BUILDINGS } from "@/data/buildings"
import type { BuildingId } from "@/domain/types"
import { usePrefs } from "@/hooks/usePrefs"

const IDS = Object.keys(BUILDINGS) as BuildingId[]

/**
 * 홈 시트 맨 위의 조용한 칩 "근무 건물: {이름|미설정}"과 고르는 시트.
 * 고르면 바로 저장하고 닫는다.
 */
export function WorkBuildingChip() {
  const { workBuilding, setWorkBuilding } = usePrefs()
  const [open, setOpen] = useState(false)
  const choose = (b: BuildingId | null) => {
    setWorkBuilding(b)
    setOpen(false)
  }

  return (
    <>
      <Button
        variant="ghost"
        className="-my-1.5 -ml-3 h-11 self-start px-3 font-normal text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <HugeiconsIcon icon={Building03Icon} data-icon="inline-start" />
        근무 건물:{" "}
        <span className={cn(workBuilding && "font-medium text-foreground")}>
          {workBuilding ? BUILDINGS[workBuilding].name : "미설정"}
        </span>
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>근무 건물</SheetTitle>
            <SheetDescription>
              고른 건물에서 걸어가는 시간과 도착했을 때 기다림을 더해 가장 빨리
              드실 식당을 알려 드려요. 도보 시간은 추정이에요.
            </SheetDescription>
          </SheetHeader>
          <ToggleGroup
            value={workBuilding ? [workBuilding] : []}
            onValueChange={(v) => {
              const b = v[0] as BuildingId | undefined
              // 이미 고른 건물을 다시 누르면 그대로 둔다(지우기는 아래 버튼으로)
              if (b) choose(b)
              else setOpen(false)
            }}
            orientation="vertical"
            spacing={1}
            aria-label="근무 건물"
            className="w-full px-3"
          >
            {IDS.map((id) => (
              <ToggleGroupItem
                key={id}
                value={id}
                className="h-11 justify-start px-3 text-[0.9375rem]"
              >
                {BUILDINGS[id].name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <SheetFooter>
            <Button
              variant="secondary"
              disabled={!workBuilding}
              className="h-11"
              onClick={() => choose(null)}
            >
              설정 지우기
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
