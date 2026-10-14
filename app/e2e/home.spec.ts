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
