import { expect, test } from "@playwright/test"

test("tabs navigate", async ({ page }) => {
  await page.goto("/")
  for (const [label, path] of [
    ["메뉴", "/menu"],
    ["지도", "/map"],
    ["알림", "/alerts"],
    ["지금", "/"],
  ]) {
    await page.getByRole("link", { name: label, exact: true }).click()
    await expect(page).toHaveURL(path)
    // 지금(홈)의 h1은 결론 문장이라 탭 이름과 다르다
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: path === "/" ? /지금은|다음 배식은|오늘은/ : label,
      })
    ).toBeVisible()
  }
})

test("demo sheet opens the staff screen and keeps ?at=", async ({ page }) => {
  await page.goto("/?at=2026-10-14T12:20")
  await page.getByRole("button", { name: "시연 시간" }).click()
  await page
    .getByRole("dialog", { name: "시연 시간" })
    .getByRole("link", { name: "검수 직원 화면 열기" })
    .click()
  await expect(page).toHaveURL("/staff?at=2026-10-14T12:20")
  await expect(
    page.getByRole("heading", { level: 1, name: "검수 직원 화면" })
  ).toBeVisible()
  await expect(page.getByRole("dialog")).toHaveCount(0)
})

test("unknown routes redirect home", async ({ page }) => {
  await page.goto("/no-such-page")
  await expect(page).toHaveURL("/")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
})

test("no console errors on any route", async ({ page }) => {
  const errors: string[] = []
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text())
  })
  page.on("pageerror", (e) => errors.push(e.message))
  for (const path of ["/", "/menu", "/map", "/alerts", "/staff"]) {
    await page.goto(`${path}?at=2026-10-14T12:20`)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  }
  expect(errors).toEqual([])
})

test("saved or system dark theme applies before the app script runs", async ({
  page,
}) => {
  // 앱 스크립트를 막아도 index.html의 인라인 스크립트가 dark를 먼저 붙인다
  await page.route("**/src/main.tsx", (r) => r.abort())
  await page.addInitScript(() =>
    localStorage.setItem("babttae.theme", JSON.stringify("dark"))
  )
  await page.goto("/")
  await expect(page.locator("html")).toHaveClass(/dark/)

  await page.addInitScript(() =>
    localStorage.setItem("babttae.theme", JSON.stringify("light"))
  )
  await page.emulateMedia({ colorScheme: "dark" })
  await page.reload()
  await expect(page.locator("html")).not.toHaveClass(/dark/)

  await page.addInitScript(() =>
    localStorage.setItem("babttae.theme", JSON.stringify("system"))
  )
  await page.reload()
  await expect(page.locator("html")).toHaveClass(/dark/)
})

test("toasts sit above the mobile tab bar", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile")
  await page.goto("/menu?at=2026-10-14T12:20")
  await page.getByRole("tab", { name: "도시락" }).click()
  await page.getByRole("button", { name: "AMIS3.0에서 예약하기" }).click()
  const toast = page.locator("[data-slot=toast]").first()
  await expect(toast).toBeVisible()
  await page.waitForTimeout(600) // 등장 전환이 끝난 자리
  const t = (await toast.boundingBox())!
  const bar = (await page
    .getByRole("navigation", { name: "주요 메뉴" })
    .last()
    .boundingBox())!
  expect(t.y + t.height).toBeLessThanOrEqual(bar.y)
})

test("home lists every venue at demo Wed 12:20", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "시연 시간" }).click()
  const sheet = page.getByRole("dialog", { name: "시연 시간" })
  await sheet.getByRole("button", { name: "수요일" }).click()
  await sheet.getByRole("slider").focus()
  await page.keyboard.press("Home")
  for (let i = 0; i < 88; i++) await page.keyboard.press("ArrowRight")
  await sheet.getByRole("button", { name: "이 시각으로 보기" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "지금은 서관·신관이 바로 드실 수 있어요"
  )
  for (const name of ["동관 직원식당", "서관·신관 직원식당", "간편식 도시락"]) {
    await expect(page.getByRole("listitem", { name })).toBeVisible()
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true)
})

test("dark mode toggles html class", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "다크", exact: true }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.getByRole("button", { name: "라이트", exact: true }).click()
  await expect(page.locator("html")).not.toHaveClass(/dark/)
})

test("demo time sets clock label", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "시연 시간" }).click()
  const sheet = page.getByRole("dialog", { name: "시연 시간" })
  await sheet.getByRole("button", { name: "수요일" }).click()
  await sheet.getByRole("slider").focus()
  await page.keyboard.press("Home")
  for (let i = 0; i < 88; i++) await page.keyboard.press("ArrowRight")
  await expect(sheet.getByText("12:20", { exact: true })).toBeVisible()
  await sheet.getByRole("button", { name: "이 시각으로 보기" }).click()
  const header = page.getByRole("banner")
  await expect(header).toContainText("수요일 12:20")
  await expect(header).toContainText("시연 중")

  await page.getByRole("button", { name: "시연 시간" }).click()
  await page.getByRole("button", { name: "실시간으로 돌아가기" }).click()
  await expect(header).not.toContainText("시연 중")
})

test("no horizontal overflow", async ({ page }) => {
  await page.goto("/")
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true)
})

test("header controls are at least 44px tall", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile")
  await page.goto("/")
  const boxes = [
    page.getByRole("button", { name: "시연 시간" }),
    ...["라이트", "다크", "시스템"].map((n) =>
      page.getByRole("button", { name: n, exact: true })
    ),
  ]
  for (const b of boxes) {
    const box = await b.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
    expect(box!.width).toBeGreaterThanOrEqual(44)
  }
})

test("demo sheet reseeds from the clock on reopen", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "시연 시간" }).click()
  const sheet = page.getByRole("dialog", { name: "시연 시간" })
  await sheet.getByRole("button", { name: "수요일" }).click()
  await sheet.getByRole("slider").focus()
  await page.keyboard.press("Home")
  for (let i = 0; i < 88; i++) await page.keyboard.press("ArrowRight")
  await sheet.getByRole("button", { name: "이 시각으로 보기" }).click()
  await page.getByRole("button", { name: "시연 시간" }).click()
  await page.getByRole("button", { name: "실시간으로 돌아가기" }).click()
  await expect(page.getByRole("banner")).not.toContainText("시연 중")
  const headerText = await page.getByRole("banner").innerText()
  const hhmm = headerText.match(/\d\d:\d\d/)![0]
  const [h, m] = hhmm.split(":").map(Number)
  await page.getByRole("button", { name: "시연 시간" }).click()
  const again = page.getByRole("dialog", { name: "시연 시간" })
  const clamped = Math.min(
    1500,
    Math.max(300, Math.round((h * 60 + m) / 5) * 5)
  )
  const expected = `${String(Math.floor(clamped / 60) % 24).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`
  await expect(again.getByText(expected, { exact: true })).toBeVisible()
  await expect(again.getByText("12:20", { exact: true })).toHaveCount(
    expected === "12:20" ? 1 : 0
  )
})
