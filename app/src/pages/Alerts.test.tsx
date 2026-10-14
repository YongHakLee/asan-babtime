import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { requestPermission } from "@/lib/alerts"
import { storage } from "@/lib/storage"
import { getRating, getSubscriptions, rateMeal } from "@/lib/prefs"
import AlertsPage from "@/pages/Alerts"
import { renderAt } from "@/test/render"

vi.mock("@/lib/alerts", async (orig) => ({
  ...(await orig<typeof import("@/lib/alerts")>()),
  requestPermission: vi.fn(async () => "granted" as const),
}))

const mockPerm = vi.mocked(requestPermission)
const user = userEvent.setup()

beforeEach(() => {
  localStorage.clear()
  mockPerm.mockReset()
  mockPerm.mockResolvedValue("granted")
})

describe("Alerts", () => {
  it("clicking the row description toggles the switch", async () => {
    renderAt("2026-10-14T12:20", <AlertsPage />)
    await user.click(screen.getByText("목요일 16:30에 알려드려요"))
    expect(getSubscriptions().boxLunchDeadline).toBe(true)
    expect(
      screen.getByRole("switch", { name: "도시락 예약 마감 전" })
    ).toBeChecked()
  })

  it("notes when storage is not persistent", () => {
    vi.spyOn(storage, "isPersistent").mockReturnValue(false)
    renderAt("2026-10-14T12:20", <AlertsPage />)
    expect(
      screen.getByText("이 브라우저에서는 설정이 저장되지 않아요")
    ).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it("switch persists subscription", async () => {
    renderAt("2026-10-14T12:20", <AlertsPage />)
    await user.click(
      screen.getByRole("switch", { name: "동관 대기가 줄면 알려주기" })
    )
    expect(getSubscriptions().queueCleared).toContain("east")
    await user.click(
      screen.getByRole("switch", { name: "서관·신관 대기가 줄면 알려주기" })
    )
    expect(getSubscriptions().queueCleared).toContain("westNew")
    await user.click(screen.getByRole("switch", { name: "배식 마감 30분 전" }))
    expect(getSubscriptions().closingSoon).toBe(true)
    await user.click(
      screen.getByRole("switch", { name: "동관 대기가 줄면 알려주기" })
    )
    expect(getSubscriptions().queueCleared).not.toContain("east")
  })

  it("asks permission only once per session", async () => {
    renderAt("2026-10-14T12:20", <AlertsPage />)
    await user.click(screen.getByRole("switch", { name: "도시락 예약 마감 전" }))
    await user.click(screen.getByRole("switch", { name: "배식 마감 30분 전" }))
    expect(mockPerm).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/앱 안에서만 알려드려요/)).toBeNull()
  })

  it("denied permission shows in-app notice", async () => {
    mockPerm.mockResolvedValue("denied")
    renderAt("2026-10-14T12:20", <AlertsPage />)
    await user.click(
      screen.getByRole("switch", { name: "동관 대기가 줄면 알려주기" })
    )
    expect(await screen.findByText(/앱 안에서만 알려드려요/)).toBeInTheDocument()
    expect(getSubscriptions().queueCleared).toContain("east")
  })

  it("rating saves", async () => {
    renderAt("2026-10-14T12:20", <AlertsPage />)
    const send = screen.getByRole("button", { name: "평가 보내기" })
    expect(send).toBeDisabled()
    await user.click(screen.getByRole("button", { name: "별 4개" }))
    expect(send).toBeDisabled()
    await user.click(screen.getByRole("button", { name: "조금 남겼어요" }))
    expect(send).toBeEnabled()
    await user.click(send)
    expect(getRating("2026-10-14:east:lunch")).toEqual({
      stars: 4,
      leftover: "some",
    })
    expect(await screen.findByText("평가를 보냈어요")).toBeInTheDocument()
  })

  it("shows saved rating as pressed", () => {
    rateMeal("2026-10-14:east:lunch", { stars: 2, leftover: "much" })
    renderAt("2026-10-14T12:20", <AlertsPage />)
    expect(screen.getByRole("button", { name: "별 2개" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(
      screen.getByRole("button", { name: "많이 남겼어요" })
    ).toHaveAttribute("aria-pressed", "true")
  })

  it("hides rating before any meal today", () => {
    renderAt("2026-10-14T03:00", <AlertsPage />)
    expect(
      screen.getByText("오늘 평가할 식사가 아직 없어요")
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "평가 보내기" })).toBeNull()
  })
})
