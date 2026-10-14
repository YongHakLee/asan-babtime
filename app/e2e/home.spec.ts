import { expect, test } from "@playwright/test"

test("work building changes the headline and survives a reload", async ({
  page,
}) => {
  await page.goto("/?at=2026-10-14T12:20")
  const h1 = page.getByRole("heading", { level: 1 })
  await expect(h1).toHaveText("지금은 신관이 바로 드실 수 있어요")

  await page.getByRole("button", { name: "근무 건물: 미설정" }).click()
  const sheet = page.getByRole("dialog", { name: "근무 건물" })
  const west = sheet.getByRole("button", { name: "서관" })
  const box = (await west.boundingBox())!
  expect(box.height).toBeGreaterThanOrEqual(44)
  await west.click()
  await expect(page.getByRole("dialog")).toHaveCount(0)

  await expect(h1).toHaveText("지금 출발하면 신관이 가장 빨라요")
  await expect(
    page.getByText("걸어서 4분, 도착하면 바로 드실 수 있어요")
  ).toBeVisible()
  await expect(
    page.getByRole("listitem", { name: "신관 직원식당" }).getByText("걸어서 4분(추정)")
  ).toBeVisible()

  await page.reload()
  await expect(h1).toHaveText("지금 출발하면 신관이 가장 빨라요")
  const chip = page.getByRole("button", { name: "근무 건물: 서관" })
  await expect(chip).toBeVisible()
  expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true)
})

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
