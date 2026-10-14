import { expect, test } from "@playwright/test"

test("menu touch targets are at least 44px at 360px", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile")
  await page.setViewportSize({ width: 360, height: 780 })
  await page.goto("/menu")
  const targets = [
    page.getByRole("group", { name: "날짜" }).getByRole("button"),
    page.getByRole("group", { name: "끼니" }).getByRole("button"),
    page.getByRole("button", { name: "즐겨찾기" }),
  ]
  for (const group of targets) {
    const n = await group.count()
    expect(n).toBeGreaterThan(0)
    for (let i = 0; i < n; i++) {
      const box = await group.nth(i).boundingBox()
      expect(box!.width).toBeGreaterThanOrEqual(44)
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true)
})
