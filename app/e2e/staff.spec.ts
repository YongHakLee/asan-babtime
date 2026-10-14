import { expect, test } from "@playwright/test"

const AT = "2026-10-14T12:20"

test("staff input reflects on home in another tab", async ({ context }) => {
  const home = await context.newPage()
  const staff = await context.newPage()
  await home.goto(`/?at=${AT}`)
  await staff.goto(`/staff?at=${AT}`)
  await staff.getByRole("button", { name: "서관·신관" }).click()
  await staff.getByRole("button", { name: "줄 있음" }).click()
  await expect(staff.getByRole("button", { name: "줄 있음" })).toHaveAttribute(
    "aria-pressed",
    "true"
  )
  await expect(staff.getByText(/에 입력, \d+분 남음/)).toBeVisible()
  await expect(
    home.getByRole("listitem", { name: /서관·신관 직원식당/ })
  ).toContainText("줄 있음")
})

test("staff opened first, home later still shows the input", async ({
  context,
}) => {
  const staff = await context.newPage()
  await staff.goto(`/staff?at=${AT}`)
  await staff.waitForTimeout(1500)
  const home = await context.newPage()
  await home.goto(`/?at=${AT}`)
  await staff.getByRole("button", { name: "서관·신관" }).click()
  await staff.getByRole("button", { name: "줄 있음" }).click()
  await expect(
    home.getByRole("listitem", { name: /서관·신관 직원식당/ })
  ).toContainText("줄 있음", { timeout: 3000 })
})

test("big buttons are at least 96px tall", async ({ page }) => {
  await page.goto(`/staff?at=${AT}`)
  for (const name of ["줄 있음", "여유"]) {
    const box = await page.getByRole("button", { name }).boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(96)
  }
})
