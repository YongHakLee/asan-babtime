import { Outlet } from "react-router"

import { Header } from "@/components/layout/Header"
import { TabBar } from "@/components/layout/TabBar"
import { useAlertsEngine } from "@/hooks/useAlertsEngine"

export function AppShell() {
  useAlertsEngine()
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <Header />
      <div className="flex flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </div>
      <TabBar />
    </div>
  )
}
