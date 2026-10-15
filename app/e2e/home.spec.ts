import { expect, test } from "@playwright/test"

test("hall row opens the detail sheet with the usual pattern, also in dark at 360px", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile")
  await page.setViewportSize({ width: 360, height: 780 })
  await page.emulateMedia({ colorScheme: "dark" })
  await page.goto("/?at=2026-10-14T12:20")
  await expect(page.locator("html")).toHaveClass(/dark/)

  const item = page.getByRole("listitem", { name: "동관 직원식당" })
  const row = item.getByRole("button", { name: "동관 직원식당" })
  // 이름 버튼이 줄 전체를 덮는다: 줄 오른쪽 상태 글자 자리를 눌러도 열린다
  const li = (await item.boundingBox())!
  expect(li.height).toBeGreaterThanOrEqual(44)
  await page.mouse.click(li.x + li.width - 20, li.y + 24)
  const sheet = page.getByRole("dialog", { name: "동관 직원식당" })
  await expect(sheet).toBeVisible()
  await expect(
    sheet.getByRole("table", { name: "동관 직원식당 평소 혼잡 패턴" })
  ).toBeVisible()
  const link = sheet.getByRole("link", { name: "지도에서 보기" })
  expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true)

  // 닫으면 줄 버튼으로 초점이 돌아오고, 키보드로 다시 연다
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(row).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(sheet).toBeVisible()

  await link.click()
  await expect(page).toHaveURL("/map?venue=east")
  await expect(
    page.getByRole("button", { name: "동관 직원식당 위치" })
  ).toHaveAttribute("aria-pressed", "true")
})

test("small forecast bars on a home row show their tooltip on hover", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop")
  await page.goto("/?at=2026-10-14T12:20")
  const bars = page
    .getByRole("listitem", { name: "동관 직원식당" })
    .locator("[data-slot=forecast-bars] [data-slot=tooltip-trigger]")
  // 줄 전체를 덮는 버튼(::after)이 막대를 가리면 hover가 버튼으로 가 툴팁이 뜨지 않는다
  await bars.first().hover()
  const tip = page.locator("[data-slot=tooltip-content]")
  await expect(tip).toBeVisible()
  await expect(tip).toContainText("11:00")
  await expect(page.getByRole("dialog")).toHaveCount(0)
})

test.describe("on a touch phone", () => {
  test.use({ hasTouch: true, isMobile: true })

  test("tapping the small forecast bars opens the hall sheet", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "mobile")
    await page.goto("/?at=2026-10-14T12:20")
    expect(
      await page.evaluate(() => matchMedia("(hover: hover)").matches)
    ).toBe(false)
    const strip = page
      .getByRole("listitem", { name: "동관 직원식당" })
      .locator("[data-slot=forecast-bars]")
    // 호버가 없는 기기에서는 막대가 줄 버튼(::after) 아래에 있어 탭이 줄 버튼으로 간다
    const box = (await strip.boundingBox())!
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
    await expect(
      page.getByRole("dialog", { name: "동관 직원식당" })
    ).toBeVisible()
  })
})
