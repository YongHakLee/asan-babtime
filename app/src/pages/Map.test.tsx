import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import MapPage from "@/pages/Map"
import { renderAt } from "@/test/render"

const user = userEvent.setup()

describe("Map", () => {
  it("draws the five buildings, no annex, and four pins in east-west-new-boxLunch order", () => {
    renderAt("2026-10-14T12:20", <MapPage />)
    const map = within(screen.getByRole("figure"))
    for (const name of [
      "동관",
      "서관",
      "신관",
      "교육연구관",
      "아산생명과학연구원",
    ])
      expect(map.getByText(name)).toBeInTheDocument()
    expect(screen.queryByText(/별관/)).not.toBeInTheDocument()
    const pins = within(
      screen.getByRole("group", { name: "식당 위치" })
    ).getAllByRole("button")
    expect(pins.map((p) => p.getAttribute("aria-label"))).toEqual([
      "동관 직원식당 위치",
      "서관 직원식당 위치",
      "신관 직원식당 위치",
      "간편식 도시락 위치",
    ])
  })

  it("selecting west or new pin shows estimated notice and its directions", async () => {
    renderAt("2026-10-14T12:20", <MapPage />)
    await user.click(
      screen.getByRole("button", { name: "서관 직원식당 위치" })
    )
    expect(
      screen.getByText("추정 위치예요. 현장 안내와 다를 수 있어요")
    ).toBeInTheDocument()
    expect(screen.getByText("서관 지하 1층(추정)")).toBeInTheDocument()
    await user.click(
      screen.getByRole("button", { name: "신관 직원식당 위치" })
    )
    expect(screen.getByText("신관 지하 1층(추정)")).toBeInTheDocument()
  })

  it("hours table lists east lunch weekday and holiday hours", () => {
    renderAt("2026-10-14T12:20", <MapPage />)
    const east = within(
      screen.getByRole("table", { name: "동관 직원식당 운영시간" })
    )
    expect(east.getAllByText("11:00–15:00").length).toBeGreaterThan(0)
    expect(east.getByText("11:00–14:00")).toBeInTheDocument()
  })

  it("marks open row", () => {
    renderAt("2026-10-14T12:20", <MapPage />)
    expect(screen.getAllByText("운영 중").length).toBeGreaterThan(0)
  })

  it("selects east by default and shows its directions without the notice", () => {
    renderAt("2026-10-14T12:20", <MapPage />)
    expect(
      screen.getByRole("button", { name: "동관 직원식당 위치" })
    ).toHaveAttribute("aria-pressed", "true")
    for (const name of ["서관 직원식당 위치", "신관 직원식당 위치"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute(
        "aria-pressed",
        "false"
      )
    }
    expect(
      screen.getByText("동관 지하 1층, 보호자식당과 같은 공간")
    ).toBeInTheDocument()
    expect(
      screen.queryByText("추정 위치예요. 현장 안내와 다를 수 있어요")
    ).not.toBeInTheDocument()
    expect(
      screen.getByText("단순화한 배치도예요. 건물 배치는 추정이에요")
    ).toBeInTheDocument()
  })

  it("moves selection to the pressed pin", async () => {
    renderAt("2026-10-14T12:20", <MapPage />)
    const box = screen.getByRole("button", { name: "간편식 도시락 위치" })
    await user.click(box)
    expect(box).toHaveAttribute("aria-pressed", "true")
    expect(
      screen.getByRole("button", { name: "동관 직원식당 위치" })
    ).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByText("동관 B1F 직원식당 앞")).toBeInTheDocument()
  })

  it("shows closed days and display notes", () => {
    renderAt("2026-10-14T12:20", <MapPage />)
    for (const name of ["서관 직원식당 운영시간", "신관 직원식당 운영시간"]) {
      const table = within(screen.getByRole("table", { name }))
      expect(table.getAllByText("운영 안 함")).toHaveLength(2)
      expect(table.getByText("주말·공휴일 운영하지 않음")).toBeInTheDocument()
    }
    const east = within(
      screen.getByRole("table", { name: "동관 직원식당 운영시간" })
    )
    expect(east.getByText("조식 A·B")).toBeInTheDocument()
    expect(east.getAllByText("23:30–01:00")).toHaveLength(3)
  })

  it("marks only the open meal row in each table", () => {
    renderAt("2026-10-14T12:20", <MapPage />)
    const east = screen.getByRole("table", { name: "동관 직원식당 운영시간" })
    const open = within(east).getByText("운영 중").closest("tr")!
    expect(within(open).getByRole("rowheader")).toHaveTextContent(/^중식/)
    expect(screen.getAllByText("운영 중")).toHaveLength(4)
  })

  it("marks nothing between lunch and dinner", () => {
    renderAt("2026-10-14T16:00", <MapPage />)
    expect(screen.queryByText("운영 중")).not.toBeInTheDocument()
  })

  it("marks late night after midnight", () => {
    renderAt("2026-10-15T00:30", <MapPage />)
    const east = screen.getByRole("table", { name: "동관 직원식당 운영시간" })
    const open = within(east).getByText("운영 중").closest("tr")!
    expect(within(open).getByRole("rowheader")).toHaveTextContent(/^야식/)
  })

  it("lists takeout hours", () => {
    renderAt("2026-10-14T12:20", <MapPage />)
    expect(screen.getByText("매일 06:00–19:40")).toBeInTheDocument()
    expect(screen.getByText("평일 조식 07:00–08:30")).toBeInTheDocument()
  })
})
