import { act, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createClock } from "@/lib/clock"
import { getActiveEntry, isSoldOut } from "@/lib/override"
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

describe("Staff", () => {
  it("shows the muted fallback when no override is active", () => {
    renderAt("2026-10-14T12:20", <StaffPage />)
    expect(
      screen.getByText("지금은 예측값을 보여주고 있어요")
    ).toBeInTheDocument()
  })

  it("counts down the remaining minutes on the real clock", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-10-20T01:00:00Z"))
    const clock = createClock()
    clock.setDemo(t("2026-10-14T12:20"))
    renderAt("2026-10-14T12:20", <StaffPage />, { clock })

    await userEvent.click(screen.getByRole("button", { name: /^줄 있음/ }))
    expect(screen.getByText("12:20에 입력, 15분 남음")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^줄 있음/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    )

    vi.setSystemTime(new Date("2026-10-20T01:01:00Z"))
    act(() => clock.tick())
    expect(screen.getByText("12:20에 입력, 14분 남음")).toBeInTheDocument()

    // 시연 시각을 크게 옮겨도 남은 시간은 실제 시간으로만 줄어든다
    act(() => clock.setDemo(t("2026-10-16T18:00")))
    expect(screen.getByText("12:20에 입력, 14분 남음")).toBeInTheDocument()

    // 남은 분은 라이브 영역 밖이라 매분 다시 읽지 않고, 라이브 영역은 입력 상태만 알린다
    const entrance = screen.getByRole("region", { name: "입구 상황" })
    expect(within(entrance).getByRole("status")).toHaveTextContent(
      /^줄 있음 입력됨$/
    )
    expect(
      screen.getByText("12:20에 입력, 14분 남음").closest("[aria-live]")
    ).toBeNull()

    vi.setSystemTime(new Date("2026-10-20T01:15:00Z"))
    act(() => clock.tick())
    expect(
      screen.getByText("지금은 예측값을 보여주고 있어요")
    ).toBeInTheDocument()
  })
})

describe("Staff entrance input", () => {
  const entrance = () => screen.getByRole("region", { name: "입구 상황" })
  const btn = (name: string) =>
    within(entrance()).getByRole("button", { name: new RegExp(`^${name}`) })

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

  it("hides the model before input", () => {
    renderAt("2026-10-14T12:20", <StaffPage />)
    expect(
      screen.getByText("지금은 예측값을 보여주고 있어요")
    ).toBeInTheDocument()
    expect(screen.queryByText(/모델/)).toBeNull()
  })

  it("after input shows the stored model with a neutral sentence", async () => {
    renderAt("2026-10-14T12:20", <StaffPage />)
    await userEvent.click(btn("혼잡"))
    expect(btn("혼잡")).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByText(/12:20에 입력, 15분 남음/)).toBeInTheDocument()
    expect(
      screen.getByText(/^모델도 혼잡\(약 \d+분\)으로 봤어요$/)
    ).toBeInTheDocument()
    expect(within(entrance()).getByRole("status")).toHaveTextContent(
      "혼잡 입력됨"
    )
  })

  it("different level says 모델은", async () => {
    renderAt("2026-10-14T12:20", <StaffPage />)
    await userEvent.click(btn("여유"))
    expect(
      screen.getByText(/^모델은 혼잡\(약 \d+분\)으로 봤어요$/)
    ).toBeInTheDocument()
  })

  it("uses 로 after 여유", async () => {
    renderAt("2026-10-14T15:30", <StaffPage />)
    await pickHall("서관")
    await userEvent.click(btn("혼잡"))
    expect(
      screen.getByText("모델은 여유(대기 없음)로 봤어요")
    ).toBeInTheDocument()
  })

  it("cancel returns to the model", async () => {
    renderAt("2026-10-14T12:20", <StaffPage />)
    await userEvent.click(btn("혼잡"))
    await userEvent.click(screen.getByRole("button", { name: "입력 취소" }))
    for (const b of within(entrance()).getAllByRole("button")) {
      expect(b).not.toHaveAttribute("aria-pressed", "true")
    }
    expect(
      screen.getByText("입력을 취소했어요. 지금은 예측값을 보여주고 있어요")
    ).toBeInTheDocument()
    expect(within(entrance()).getByRole("status")).toHaveTextContent(
      "입력 취소됨"
    )
    expect(getActiveEntry("east")).toBeNull()
    await pickHall("서관")
    expect(screen.queryByText(/입력을 취소했어요/)).toBeNull()
  })
})
