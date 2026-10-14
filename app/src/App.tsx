import { BrowserRouter, Route, Routes } from "react-router"

import { AppShell } from "@/components/layout/AppShell"
import { ClockProvider } from "@/providers/clock"
import AlertsPage from "@/pages/Alerts"
import HomePage from "@/pages/Home"
import MapPage from "@/pages/Map"
import MenuPage from "@/pages/Menu"
import StaffPage from "@/pages/Staff"

export function App() {
  return (
    <ClockProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="staff" element={<StaffPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ClockProvider>
  )
}

export default App
