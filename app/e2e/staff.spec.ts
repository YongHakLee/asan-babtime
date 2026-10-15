import { expect, test } from "@playwright/test"

const AT = "2026-10-14T12:20"

test("staff input reflects on home in another tab", async ({ context }) => {
  const home = await context.newPage()
  const staff = await context.newPage()
  await home.goto(`/?at=${AT}`)
  await staff.goto(`/staff?at=${AT}`)
  // 모델은 12:20 서관을 '줄 있음'으로 보므로, 직원이 '여유'를 눌러야만 바뀐다
  await expect(
    home.getByRole("listitem", { name: "서관 직원식당" })
  ).toContainText("줄 있음")
  await staff.getByRole("button", { name: "서관", exact: true }).click()
  await staff.getByRole("button", { name: "여유" }).click()
  await expect(staff.getByRole("button", { name: "여유" })).toHaveAttribute(
    "aria-pressed",
    "true"
  )
  await expect(staff.getByText(/에 입력, \d+분 남음/)).toBeVisible()
  await expect(
    home.getByRole("listitem", { name: "서관 직원식당" })
  ).toContainText("여유")
})

test("staff opened first, home later still shows the input", async ({
  context,
}) => {
  const staff = await context.newPage()
  await staff.goto(`/staff?at=${AT}`)
  await staff.waitForTimeout(1500)
  const home = await context.newPage()
  await home.goto(`/?at=${AT}`)
  await staff.getByRole("button", { name: "서관", exact: true }).click()
  await staff.getByRole("button", { name: "여유" }).click()
  await expect(
    home.getByRole("listitem", { name: "서관 직원식당" })
  ).toContainText("여유", { timeout: 3000 })
})

test("home on a demo ?at= reflects staff input made on the real clock", async ({
  context,
}) => {
  const home = await context.newPage()
  await home.goto(`/?at=${AT}`)
  const staff = await context.newPage()
  await staff.goto("/staff")
  await staff.getByRole("button", { name: "서관", exact: true }).click()
  await staff.getByRole("button", { name: "여유" }).click()
  await expect(staff.getByText(/에 입력, 15분 남음/)).toBeVisible()
  await expect(
    home.getByRole("listitem", { name: "서관 직원식당" })
  ).toContainText("여유", { timeout: 3000 })
})

test("home set by the demo sheet reflects staff input from a new tab", async ({
  context,
}) => {
  const home = await context.newPage()
  await home.goto("/")
  await home.getByRole("button", { name: "시연 시간" }).click()
  const sheet = home.getByRole("dialog", { name: "시연 시간" })
  await sheet.getByRole("button", { name: "수요일" }).click()
  await sheet.getByRole("slider").focus()
  await home.keyboard.press("Home")
  for (let i = 0; i < 88; i++) await home.keyboard.press("ArrowRight")
  await sheet.getByRole("button", { name: "이 시각으로 보기" }).click()
  await expect(home.getByRole("banner")).toContainText("수요일 12:20")

  const staff = await context.newPage()
  await staff.goto("/staff")
  await staff.getByRole("button", { name: "서관", exact: true }).click()
  await staff.getByRole("button", { name: "여유" }).click()
  await expect(
    home.getByRole("listitem", { name: "서관 직원식당" })
  ).toContainText("여유", { timeout: 3000 })
})

test("busy input shows busy on home and cancel restores the model", async ({
  context,
}) => {
  const home = await context.newPage()
  const staff = await context.newPage()
  await home.goto(`/?at=${AT}`)
  await staff.goto(`/staff?at=${AT}`)
  const row = home.getByRole("listitem", { name: "동관 직원식당" })
  await staff.getByRole("button", { name: "줄 있음" }).click()
  await expect(row).toContainText("줄 있음", { timeout: 3000 })
  await staff.getByRole("button", { name: "혼잡" }).click()
  await expect(row).toContainText("혼잡", { timeout: 3000 })
  // 모델(혼잡)과 다른 값을 마지막으로 입력해야 취소가 홈에서 눈에 보인다
  await staff.getByRole("button", { name: "여유" }).click()
  await expect(row).toContainText("여유", { timeout: 3000 })
  await staff.getByRole("button", { name: "입력 취소" }).click()
  await expect(staff.getByText(/입력을 취소했어요/)).toBeVisible()
  await expect(row).toContainText("혼잡", { timeout: 3000 })
  await expect(row).not.toContainText("여유")
})

test("reopening ?at= starts at the given time again", async ({ page }) => {
  await page.goto(`/?at=${AT}`)
  await expect(page.getByRole("banner")).toContainText("수요일 12:20")
  // 예전 빌드가 남긴 시연 기준(30분 전에 연 것처럼)이 있어도 무시한다
  await page.evaluate(() =>
    localStorage.setItem(
      "babttae.demoAnchor",
      JSON.stringify({
        at: "2026-10-14T12:20",
        realStart: Date.now() - 30 * 60_000,
      })
    )
  )
  await page.reload()
  await expect(page.getByRole("banner")).toContainText("수요일 12:20")
})

test("big buttons are at least 96px tall", async ({ page }) => {
  await page.goto(`/staff?at=${AT}`)
  for (const name of ["여유", "보통", "줄 있음", "혼잡"]) {
    const box = await page.getByRole("button", { name }).boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(96)
  }
})
