import { HugeiconsIcon } from "@hugeicons/react"
import { NavLink } from "react-router"
import { cn } from "cn"

import { NAV_ITEMS } from "@/components/layout/nav"

export function TabBar() {
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-xs",
                  isActive
                    ? "font-semibold text-primary"
                    : "text-muted-foreground"
                )
              }
            >
              <HugeiconsIcon icon={icon} className="size-5" strokeWidth={2} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
