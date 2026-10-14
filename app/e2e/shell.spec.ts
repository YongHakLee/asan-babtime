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
    await expect(page.getByRole("heading", { level: 1, name: label })).toBeVisible()
  }
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
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
  ).toBe(true)
})
