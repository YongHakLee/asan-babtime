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
  await expect(pins).toHaveCount(4)
  const names = ["동관 직원식당", "서관 직원식당", "신관 직원식당", "간편식 도시락"]
  for (let i = 0; i < 4; i++)
    await expect(pins.nth(i)).toHaveAccessibleName(`${names[i]} 위치`)
  const map = (await page.getByRole("figure").locator("svg").boundingBox())!
  const boxes = []
  for (let i = 0; i < 4; i++) {
    const b = (await pins.nth(i).boundingBox())!
    expect(b.width).toBeGreaterThanOrEqual(44)
    expect(b.height).toBeGreaterThanOrEqual(44)
    // 핀이 지도 밖으로 잘리지 않는다
    expect(b.x).toBeGreaterThanOrEqual(map.x)
    expect(b.y).toBeGreaterThanOrEqual(map.y)
    expect(b.x + b.width).toBeLessThanOrEqual(map.x + map.width)
    expect(b.y + b.height).toBeLessThanOrEqual(map.y + map.height)
    boxes.push(b)
  }
  for (let i = 0; i < 4; i++)
    for (let j = i + 1; j < 4; j++) {
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
