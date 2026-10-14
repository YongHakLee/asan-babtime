import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { storage } from "@/lib/storage"

type Theme = "light" | "dark" | "system"
type Resolved = "light" | "dark"

type ThemeContextValue = {
  theme: Theme
  resolved: Resolved
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = "theme"
const DARK_QUERY = "(prefers-color-scheme: dark)"

const ThemeContext = createContext<ThemeContextValue | null>(null)

function systemPrefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches
}

function readTheme(): Theme {
  const stored = storage.get<string>(STORAGE_KEY, "system")
  return stored === "light" || stored === "dark" ? stored : "system"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readTheme)
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark)

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY)
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])

  const resolved: Resolved =
    theme === "system" ? (systemDark ? "dark" : "light") : theme

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark")
  }, [resolved])

  const setTheme = useCallback((next: Theme) => {
    storage.set(STORAGE_KEY, next)
    setThemeState(next)
  }, [])

  const value = useMemo(
    () => ({ theme, resolved, setTheme }),
    [theme, resolved, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within ThemeProvider")
  return context
}
