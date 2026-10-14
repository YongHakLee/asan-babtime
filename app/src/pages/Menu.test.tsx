import { act, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { createClock } from "@/lib/clock"
import { setSoldOut } from "@/lib/override"
import { getFavorites, getSubscriptions } from "@/lib/prefs"
import Menu from "@/pages/Menu"
import { renderAt } from "@/test/render"
import { t } from "@/test/time"

/** "오늘 남은 수량" 문단(라벨과 큰 숫자가 나뉘어 있어 문단 전체 글로 찾는다) */
const leftCount = () =>
  screen.getByText(
    (_, el) =>
      el?.tagName === "P" && /^오늘 남은 수량 \d+개$/.test(el.textContent ?? "")
  )

describe("Menu", () => {
  it("compares halls at Wednesday lunch", () => {
    renderAt("2026-10-14T12:20", <Menu />)
    expect(screen.getByText("꽈리고추간장닭갈비")).toBeVisible()
    expect(screen.getByText("투움바파스타")).toBeVisible()
  })

  it("saturday shows live corner label for westNew", () => {
    renderAt("2026-10-17T12:20", <Menu />)
    expect(screen.getByText("라이브코너(서관)")).toBeInTheDocument()
    expect(screen.getByText("하프콤비네이션피자")).toBeInTheDocument()
  })

  it("holiday shows empty state for westNew", async () => {
    renderAt("2026-10-09T12:00", <Menu />)
    expect(
      screen.getByText("주말과 공휴일에는 서관·신관 식당을 운영하지 않아요")
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("button", { name: "동관 메뉴 보기" })
    )
    expect(screen.getByRole("heading", { name: /동관/ })).toHaveFocus()
  })

  it("favorite toggles and persists", async () => {
    renderAt("2026-10-14T12:20", <Menu />)
    const row = screen.getByRole("listitem", { name: "꽈리고추간장닭갈비" })
    const heart = within(row).getByRole("button", { name: "즐겨찾기" })
    expect(heart).toHaveAttribute("aria-pressed", "false")
    expect(heart).toHaveAccessibleDescription("꽈리고추간장닭갈비")
    await userEvent.click(heart)
    expect(heart).toHaveAttribute("aria-pressed", "true")
    expect(getFavorites()).toContain("꽈리고추간장닭갈비")
  })

  it("takeout shows three zones with pick counts", async () => {
    renderAt("2026-10-14T12:20", <Menu />)
    await userEvent.click(screen.getByRole("tab", { name: "테이크아웃" }))
    for (const text of [
      "그린존",
      "2가지 골라 담기",
      "오렌지존",
      "3가지 골라 담기",
      "퍼플존",
      "4가지 골라 담기",
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument()
    }
    expect(screen.getAllByText("동관 전용").length).toBeGreaterThan(0)
    expect(screen.getByText("매일 06:00–19:40")).toBeInTheDocument()
  })

  it("shows the menu week label", () => {
    renderAt("2026-10-14T12:20", <Menu />)
    expect(screen.getByText("10월 3주차 메뉴 기준")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { level: 1, name: "메뉴" })
    ).toBeInTheDocument()
  })

  it("defaults to today and the active meal, and switches day and meal", async () => {
    renderAt("2026-10-14T12:20", <Menu />)
    const days = screen.getByRole("group", { name: "날짜" })
    expect(
      within(days).getByRole("button", { name: /수요일/ })
    ).toHaveAttribute("aria-pressed", "true")
    const meals = screen.getByRole("group", { name: "끼니" })
    expect(within(meals).getByRole("button", { name: "중식" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    await userEvent.click(within(days).getByRole("button", { name: /목요일/ }))
    expect(screen.getByText("오징어떡고추장볶음")).toBeInTheDocument()
    await userEvent.click(within(meals).getByRole("button", { name: "석식" }))
    expect(screen.getByText("돈육간장불고기")).toBeInTheDocument()
    expect(screen.queryByText("믹스동(새우튀김, 가라아게)")).toBeNull()
  })

  it("defaults to the next meal outside service hours", () => {
    renderAt("2026-10-14T15:30", <Menu />)
    const meals = screen.getByRole("group", { name: "끼니" })
    expect(within(meals).getByRole("button", { name: "석식" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(screen.getByText("마늘칩카레라이스")).toBeInTheDocument()
  })

  it("shows allergy, calorie and rating examples under the main dish", () => {
    renderAt("2026-10-14T12:20", <Menu />)
    expect(
      screen.getByText("알레르기 예시: 닭고기, 대두, 달걀, 약 720 kcal 예시")
    ).toBeInTheDocument()
    expect(screen.getAllByText(/^★ \d\.\d \(\d+\)$/)).toHaveLength(2)
  })

  it("marks a sold-out course", () => {
    setSoldOut(
      { hall: "east", meal: "lunch", course: undefined, date: "2026-10-14" },
      true
    )
    renderAt("2026-10-14T12:20", <Menu />)
    expect(screen.getByText("품절")).toBeInTheDocument()
  })

  it("box lunch shows remaining count and reservation actions", async () => {
    renderAt("2026-10-14T12:20", <Menu />)
    await userEvent.click(screen.getByRole("tab", { name: "도시락" }))
    expect(screen.getByText("순살간장찜닭도시락")).toBeInTheDocument()
    expect(leftCount()).toBeInTheDocument()
    expect(screen.getByText("소불고기도시락")).toBeInTheDocument()
    expect(screen.getByText("우삼겹메밀면샐러드")).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole("button", { name: "AMIS3.0에서 예약하기" })
    )
    expect(
      await screen.findByText("AMIS3.0은 병원 내부망에서 열 수 있어요")
    ).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole("button", { name: "마감 알림 받기" })
    )
    expect(
      await screen.findByText("도시락 마감 알림을 켰어요")
    ).toBeInTheDocument()
    expect(getSubscriptions().boxLunchDeadline).toBe(true)
  })

  it("box lunch remaining count decreases over the morning", async () => {
    const read = async (at: string) => {
      const { unmount } = renderAt(at, <Menu />)
      await userEvent.click(screen.getByRole("tab", { name: "도시락" }))
      const n = Number(leftCount().textContent!.match(/\d+/)![0])
      unmount()
      return n
    }
    const early = await read("2026-10-14T08:00")
    const mid = await read("2026-10-14T11:00")
    const late = await read("2026-10-14T12:50")
    expect(early).toBe(500)
    expect(mid).toBeLessThan(early)
    expect(late).toBeLessThan(mid)
    expect(late).toBeGreaterThanOrEqual(0)
  })

  it("box lunch pickup closes after 13:00", async () => {
    renderAt("2026-10-14T13:30", <Menu />)
    await userEvent.click(screen.getByRole("tab", { name: "도시락" }))
    expect(screen.getByText("수령 마감")).toBeInTheDocument()
    expect(screen.queryByText(/오늘 남은 수량/)).toBeNull()
  })

  it("box lunch is empty on weekends", async () => {
    renderAt("2026-10-17T12:20", <Menu />)
    await userEvent.click(screen.getByRole("tab", { name: "도시락" }))
    expect(
      screen.getByText("주말에는 간편식 도시락이 없어요")
    ).toBeInTheDocument()
  })

  it("keeps the chosen day and meal when the live clock crosses a service boundary", async () => {
    let real = t("2026-10-14T14:59").getTime()
    const clock = createClock(() => real)
    renderAt("2026-10-14T14:59", <Menu />, { clock })
    const meals = () => screen.getByRole("group", { name: "끼니" })
    const days = () => screen.getByRole("group", { name: "날짜" })
    await userEvent.click(within(meals()).getByRole("button", { name: "조식" }))
    await userEvent.click(
      within(days()).getByRole("button", { name: /목요일/ })
    )

    real = t("2026-10-14T15:02").getTime()
    act(() => clock.tick())
    expect(
      within(meals()).getByRole("button", { name: "조식" })
    ).toHaveAttribute("aria-pressed", "true")
    expect(
      within(days()).getByRole("button", { name: /목요일/ })
    ).toHaveAttribute("aria-pressed", "true")

    // 시연 중에도 시간이 흐르는 것만으로는 선택이 바뀌지 않는다
    act(() => clock.setDemo(t("2026-10-15T07:00")))
    await userEvent.click(within(meals()).getByRole("button", { name: "야식" }))
    real += 2 * 3600_000
    act(() => clock.tick())
    expect(
      within(meals()).getByRole("button", { name: "야식" })
    ).toHaveAttribute("aria-pressed", "true")
  })

  it("resets the selection when the demo time is set explicitly", async () => {
    let real = t("2026-10-14T12:20").getTime()
    const clock = createClock(() => real)
    renderAt("2026-10-14T12:20", <Menu />, { clock })
    const meals = () => screen.getByRole("group", { name: "끼니" })
    await userEvent.click(within(meals()).getByRole("button", { name: "야식" }))
    real += 1000
    act(() => clock.setDemo(t("2026-10-14T12:40")))
    expect(
      within(meals()).getByRole("button", { name: "중식" })
    ).toHaveAttribute("aria-pressed", "true")
  })
})
