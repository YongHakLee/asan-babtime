import { expect, test } from "@playwright/test"

test("map pins are 44px and do not overlap at 360px", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile")
  await page.setViewportSize({ width: 360, height: 780 })
  await page.goto("/map")
  const pins = page
    .getByRole("group", { name: "식당 위치" })
    .getByRole("button")
  await expect(pins).toHaveCount(3)
  const boxes = []
  for (let i = 0; i < 3; i++) {
    const b = (await pins.nth(i).boundingBox())!
    expect(b.width).toBeGreaterThanOrEqual(44)
    expect(b.height).toBeGreaterThanOrEqual(44)
    boxes.push(b)
  }
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++) {
      const [a, b] = [boxes[i], boxes[j]]
      const overlap =
        a.x < b.x + b.width &&
        b.x < a.x + a.width &&
        a.y < b.y + b.height &&
        b.y < a.y + a.height
      expect(overlap).toBe(false)
    }
  await pins.first().click()
  await expect(pins.first()).toHaveAttribute("aria-pressed", "true")
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true)
})
