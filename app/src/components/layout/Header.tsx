import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ComputerIcon,
  Moon02Icon,
  Sun03Icon,
  Timer02Icon,
} from "@hugeicons/core-free-icons"
import { NavLink } from "react-router"
import { cn } from "cn"

import { DemoTimeSheet } from "@/components/layout/DemoTimeSheet"
import { NAV_ITEMS } from "@/components/layout/nav"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useClock } from "@/hooks/useClock"
import { seoulWeekdayTime } from "@/lib/format"
import { useTheme } from "@/providers/theme"

const THEMES = [
  { value: "light", label: "라이트", icon: Sun03Icon },
  { value: "dark", label: "다크", icon: Moon02Icon },
  { value: "system", label: "시스템", icon: ComputerIcon },
] as const

export function Header() {
  const { now, isDemo } = useClock()
  const { theme, setTheme } = useTheme()
  const [demoOpen, setDemoOpen] = useState(false)

  return (
    <header className="bg-deep text-deep-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <p className="text-base font-semibold">아산 밥때</p>

        <nav aria-label="주요 메뉴" className="hidden md:block">
          <ul className="flex gap-1">
            {NAV_ITEMS.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "rounded-4xl px-3 py-1.5 text-sm",
                      isActive
                        ? "bg-deep-foreground/15 font-semibold"
                        : "opacity-80 hover:opacity-100"
                    )
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <p className="ml-auto text-sm tabular-nums">
          {seoulWeekdayTime(now)}
          {isDemo && <span className="ml-2 font-semibold">시연 중</span>}
        </p>

        <div className="flex basis-full items-center justify-between gap-2 md:basis-auto">
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-deep-foreground/15 hover:text-deep-foreground"
            onClick={() => setDemoOpen(true)}
          >
            <HugeiconsIcon icon={Timer02Icon} data-icon="inline-start" />
            시연 시간
          </Button>
          <ToggleGroup
            value={[theme]}
            onValueChange={(v) => {
              if (v[0]) setTheme(v[0] as (typeof THEMES)[number]["value"])
            }}
            spacing={0}
            aria-label="화면 테마"
          >
            {THEMES.map(({ value, label, icon }) => (
              <ToggleGroupItem
                key={value}
                value={value}
                size="sm"
                className="text-deep-foreground hover:bg-deep-foreground/15 hover:text-deep-foreground aria-pressed:bg-deep-foreground/25"
              >
                <HugeiconsIcon icon={icon} strokeWidth={2} />
                <span className="sr-only">{label}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
      <DemoTimeSheet open={demoOpen} onOpenChange={setDemoOpen} />
    </header>
  )
}
