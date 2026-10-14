import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ThemeProvider, useTheme } from "./theme"

function mockMatchMedia(dark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: dark,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
}

function Probe() {
  const { theme, resolved, setTheme } = useTheme()
  return (
    <>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolved}</span>
      <button onClick={() => setTheme("dark")}>dark</button>
      <button onClick={() => setTheme("light")}>light</button>
    </>
  )
}

describe("ThemeProvider", () => {
  beforeEach(() => mockMatchMedia(false))
  afterEach(() => vi.unstubAllGlobals())

  it("adds dark class when theme is dark", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    )
    act(() => screen.getByText("dark").click())
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark")
    act(() => screen.getByText("light").click())
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("follows system preference when theme is system", () => {
    mockMatchMedia(true)
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    )
    expect(screen.getByTestId("theme")).toHaveTextContent("system")
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("persists the choice under the babttae. prefix", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    )
    act(() => screen.getByText("dark").click())
    expect(localStorage.getItem("babttae.theme")).toBe('"dark"')
  })
})
