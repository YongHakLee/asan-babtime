import { act, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createClock } from "@/lib/clock"
import { formatMinutes, seoulMinutes } from "@/lib/format"
import { getActiveEntry, isSoldOut, OVERRIDE_TTL_MS } from "@/lib/override"
import MenuPage from "@/pages/Menu"
import StaffPage from "@/pages/Staff"
import { renderAt } from "@/test/render"
import { t } from "@/test/time"

beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

const pickHall = (name: string) =>
  userEvent.click(
    within(screen.getByRole("group", { name: "식당" })).getByRole("button", {
      name,
    })
  )
const switchNames = () =>
  screen.getAllByRole("switch").map((s) => s.getAttribute("aria-labelledby"))
    .map((id) => document.getElementById(id!)!.textContent)

describe("Staff sold-out switches (R21)", () => {
  it("east lists every course of the current meal", () => {
    renderAt("2026-10-12T18:00", <StaffPage />)
    expect(switchNames()).toEqual(["석식 A 품절", "석식 B 품절"])
    expect(
      screen.queryByText("품절 입력은 동관 석식에만 있어요")
    ).toBeNull()
  })

  it("east at lunch lists the lunch course, not dinner", () => {
    renderAt("2026-10-14T12:20", <StaffPage />)
    expect(switchNames()).toEqual(["중식 품절"])
  })

  it("east falls back to the next meal today", () => {
    renderAt("2026-10-14T15:30", <StaffPage />)
    expect(switchNames()).toEqual(["석식 품절"])
  })

  it("east after midnight marks the late-night meal of the day it started", async () => {
    renderAt("2026-10-15T00:30", <StaffPage />)
    expect(switchNames()).toEqual(["야식 품절"])
    await userEvent.click(screen.getByRole("switch", { name: "야식 품절" }))
    expect(isSoldOut("east", "lateNight", undefined, t("2026-10-14T23:40"))).toBe(true)
  })

  it("offers the three dining halls", () => {
    renderAt("2026-10-14T12:20", <StaffPage />)
    const group = screen.getByRole("group", { name: "식당" })
    expect(
      within(group)
        .getAllByRole("button")
        .map((b) => b.textContent)
    ).toEqual(["동관", "서관", "신관"])
  })

  it("west lists its lunch and the shared menu names the sold-out hall", async () => {
    renderAt(
      "2026-10-14T12:20",
      <>
        <StaffPage />
        <MenuPage />
      </>
    )
    await pickHall("서관")
    expect(switchNames()).toEqual(["중식 품절"])
    const shared = screen.getByRole("region", { name: /^서관·신관 공통/ })
    expect(within(shared).queryByText(/품절/)).toBeNull()
    await userEvent.click(screen.getByRole("switch", { name: "중식 품절" }))
    expect(isSoldOut("west", "lunch", undefined, t("2026-10-14T12:20"))).toBe(true)
    expect(isSoldOut("new", "lunch", undefined, t("2026-10-14T12:20"))).toBe(false)
    expect(within(shared).getByText("서관 품절")).toBeInTheDocument()
    expect(
      within(screen.getByRole("region", { name: /^동관/ })).queryByText(/품절/)
    ).toBeNull()

    // 신관도 품절이면 공통 열은 그냥 "품절"
    await pickHall("신관")
    await userEvent.click(screen.getByRole("switch", { name: "중식 품절" }))
    expect(within(shared).getByText("품절")).toBeInTheDocument()
  })

  it("west with nothing left today says so", async () => {
    renderAt("2026-10-14T15:30", <StaffPage />)
    await pickHall("서관")
    expect(screen.queryAllByRole("switch")).toHaveLength(0)
    expect(
      screen.getByText("오늘은 서관에 남은 배식이 없어요")
    ).toBeInTheDocument()
  })
})

describe("Staff entrance status", () => {
  const entrance = () => screen.getByRole("region", { name: "입구 상황" })
  const btn = (name: string) =>
    within(entrance()).getByRole("button", { name: new RegExp(`^${name}`) })
  const PROMPT = "지금 입구 상황을 골라 주세요"
  const realClock = (iso: string) => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(iso))
  }

  it("shows four level buttons with wait ranges", () => {
    renderAt("2026-10-14T12:20", <StaffPage />)
    const labels = within(entrance())
      .getAllByRole("button")
      .filter((b) => b.hasAttribute("aria-pressed"))
      .map((b) => b.textContent)
    expect(labels).toEqual([
      "여유2분 미만",
      "보통2–5분",
      "줄 있음5–10분",
      "혼잡10분 이상",
    ])
  })

  it("asks to choose before input", () => {
    renderAt("2026-10-14T12:20", <StaffPage />)
    expect(screen.getByText(PROMPT)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "선택 취소" })).toBeNull()
  })

  it("shows the status box after input", async () => {
    renderAt("2026-10-14T12:20", <StaffPage />)
    await userEvent.click(btn("혼잡"))
    expect(btn("혼잡")).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByText("직원들 화면에 '혼잡'으로 보여요")).toBeInTheDocument()
    expect(screen.getByText("12:35까지 유지돼요(15분 남음)")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "선택 취소" })).toBeInTheDocument()
    expect(screen.queryByText(PROMPT)).toBeNull()
  })

  it("uses 로 after 여유", async () => {
    renderAt("2026-10-14T12:20", <StaffPage />)
    await userEvent.click(btn("여유"))
    expect(screen.getByText("직원들 화면에 '여유'로 보여요")).toBeInTheDocument()
  })

  it("shows the end time as at + 15 minutes and counts down on the real clock", async () => {
    realClock("2026-10-20T01:00:00Z")
    const clock = createClock()
    clock.setDemo(t("2026-10-14T12:20"))
    renderAt("2026-10-14T12:20", <StaffPage />, { clock })
    await userEvent.click(btn("줄 있음"))
    expect(screen.getByText("12:35까지 유지돼요(15분 남음)")).toBeInTheDocument()

    vi.setSystemTime(new Date("2026-10-20T01:05:30Z"))
    act(() => clock.tick())
    expect(screen.getByText("12:35까지 유지돼요(10분 남음)")).toBeInTheDocument()

    // 시연 시각을 크게 옮겨도 남은 시간은 실제 시간으로만 줄어든다
    act(() => clock.setDemo(t("2026-10-16T18:00")))
    expect(screen.getByText("12:35까지 유지돼요(10분 남음)")).toBeInTheDocument()
    expect(
      screen.getByText("12:35까지 유지돼요(10분 남음)").closest("[aria-live]")
    ).toBeNull()
  })

  it("cancel brings back the prompt", async () => {
    renderAt("2026-10-14T12:20", <StaffPage />)
    await userEvent.click(btn("혼잡"))
    await userEvent.click(screen.getByRole("button", { name: "선택 취소" }))
    expect(screen.queryByText(/직원들 화면에 '/)).toBeNull()
    expect(screen.getByText(PROMPT)).toBeInTheDocument()
    for (const b of within(entrance()).getAllByRole("button")) {
      expect(b).not.toHaveAttribute("aria-pressed", "true")
    }
    expect(getActiveEntry("east")).toBeNull()
    expect(within(entrance()).getByRole("status")).toHaveTextContent(
      "선택 취소됨"
    )
  })

  it("expiry brings back the prompt", async () => {
    realClock("2026-10-20T01:00:00Z")
    const clock = createClock()
    clock.setDemo(t("2026-10-14T12:20"))
    renderAt("2026-10-14T12:20", <StaffPage />, { clock })
    await userEvent.click(btn("혼잡"))
    vi.setSystemTime(new Date("2026-10-20T01:15:00Z"))
    act(() => clock.tick())
    expect(screen.queryByText(/직원들 화면에 '/)).toBeNull()
    expect(screen.getByText(PROMPT)).toBeInTheDocument()
  })

  it("re-press re-announces and refreshes the end time", async () => {
    realClock("2026-10-20T01:00:00Z")
    const clock = createClock()
    clock.setDemo(t("2026-10-14T12:20"))
    renderAt("2026-10-14T12:20", <StaffPage />, { clock })
    await userEvent.click(btn("혼잡"))
    const status = within(entrance()).getByRole("status")
    const firstText = status.firstChild
    expect(status).toHaveTextContent("혼잡 선택됨")

    vi.setSystemTime(new Date("2026-10-20T01:02:00Z"))
    await userEvent.click(btn("혼잡"))
    expect(within(entrance()).getByRole("status")).toBe(status)
    expect(firstText!.isConnected).toBe(false)
    expect(status).toHaveTextContent("혼잡 선택됨")
    const end = formatMinutes(
      seoulMinutes(new Date(getActiveEntry("east")!.at + OVERRIDE_TTL_MS))
    )
    expect(screen.getByText(`${end}까지 유지돼요(15분 남음)`)).toBeInTheDocument()
  })

  it("never mentions the model or prediction", async () => {
    renderAt("2026-10-14T12:20", <StaffPage />)
    const clean = () => {
      expect(document.body.textContent).not.toContain("예측값")
      expect(document.body.textContent).not.toContain("모델")
    }
    clean()
    await userEvent.click(btn("혼잡"))
    clean()
    await userEvent.click(screen.getByRole("button", { name: "선택 취소" }))
    clean()
  })
})
