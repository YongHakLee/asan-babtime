import { expect, test } from "@playwright/test"

test("alert switch rows are at least 44px tall and tappable", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile")
  await page.setViewportSize({ width: 360, height: 780 })
  await page.goto("/alerts")
  const switches = page.getByRole("switch")
  expect(await switches.count()).toBe(5)
  for (let i = 0; i < 5; i++) {
    const row = switches.nth(i).locator("xpath=ancestor::label[1]")
    const box = await row.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
  }
  await page.getByText("목요일 16:30에 알려드려요").click()
  await expect(
    page.getByRole("switch", { name: "도시락 예약 마감 전" })
  ).toBeChecked()
})
