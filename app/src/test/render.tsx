import { render } from "@testing-library/react"
import type { ReactElement } from "react"
import { MemoryRouter } from "react-router"

import { Toaster } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ClockProvider } from "@/providers/clock"
import { ThemeProvider } from "@/providers/theme"
import { t } from "@/test/time"

/** jsdom에는 matchMedia가 없다. 테마 제공자가 쓰므로 밝은 화면으로 대신한다. */
function ensureMatchMedia() {
  if (typeof window.matchMedia === "function") return
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

/**
 * main.tsx·App.tsx와 같은 제공자로 감싸고, 시계를 서울 시각 `isoSeoul`
 * ('YYYY-MM-DDTHH:MM')의 시연 시각으로 고정해 렌더한다.
 */
export function renderAt(
  isoSeoul: string,
  ui: ReactElement,
  { route = "/" }: { route?: string } = {}
) {
  ensureMatchMedia()
  return render(
    <ThemeProvider>
      <TooltipProvider>
        <Toaster>
          <ClockProvider initialDemo={t(isoSeoul)}>
            <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
          </ClockProvider>
        </Toaster>
      </TooltipProvider>
    </ThemeProvider>
  )
}
