import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import Home from "@/pages/Home"
import { renderAt } from "@/test/render"

describe("Home", () => {
  it("shows headline and statuses at Wed 12:20", () => {
    renderAt("2026-10-14T12:20", <Home />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "지금은 신관이 바로 드실 수 있어요"
    )
    const hero = screen.getByRole("heading", { level: 1 }).closest("section")!
    expect(
      hero.querySelector("[data-slot=hero-tiles]")?.textContent
    ).toBe("신")
    // 결론이 고른 식당은 위 타일과 목록의 타일이 함께 오렌지다
    expect(hero.querySelector("[data-slot=building-tile]")).toHaveClass(
      "bg-brand-orange"
    )
    const picked = [
      ...screen
        .getByRole("region", { name: "식당별 상황" })
        .querySelectorAll("[data-slot=building-tile].bg-brand-orange"),
    ].map((el) => el.textContent)
    expect(picked).toEqual(["신"])
    expect(
      screen.getByText(/^동관은 .+, 서관은 .+부터 한산해질 것으로 보여요$/)
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole("listitem", { name: /동관 직원식당/ })).getByText(
        /줄 있음|혼잡/
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText("꽈리고추간장닭갈비, 순두부찌개")
    ).toBeInTheDocument()
  })

  it("keeps the hero tile white when no hall is open", () => {
    renderAt("2026-10-14T15:30", <Home />)
    const hero = screen.getByRole("heading", { level: 1 }).closest("section")!
    expect(hero.querySelector("[data-slot=building-tile]")).not.toHaveClass(
      "bg-brand-orange"
    )
    expect(document.querySelectorAll(".bg-brand-orange")).toHaveLength(0)
  })

  it("lists the three dining halls in order, then box lunch", () => {
    renderAt("2026-10-14T12:20", <Home />)
    const list = screen.getByRole("region", { name: "식당별 상황" })
    expect(
      within(list)
        .getAllByRole("listitem")
        .filter((li) => li.parentElement?.parentElement === list)
        .map((li) => li.getAttribute("aria-label"))
    ).toEqual(["동관 직원식당", "서관 직원식당", "신관 직원식당", "간편식 도시락"])
    // 서관·신관은 같은 메뉴를 보여 준다
    const west = screen.getByRole("listitem", { name: "서관 직원식당" })
    const nw = screen.getByRole("listitem", { name: "신관 직원식당" })
    expect(within(west).getByText(/^투움바파스타/)).toBeInTheDocument()
    expect(within(nw).getByText(/^투움바파스타/)).toBeInTheDocument()
  })

  it("shows wait, forecast only on the busy halls, and box lunch pickup", () => {
    renderAt("2026-10-14T12:20", <Home />)
    const east = screen.getByRole("listitem", { name: "동관 직원식당" })
    const west = screen.getByRole("listitem", { name: "서관 직원식당" })
    const nw = screen.getByRole("listitem", { name: "신관 직원식당" })
    const box = screen.getByRole("listitem", { name: "간편식 도시락" })
    expect(within(east).getByText(/^약 \d+분$/)).toBeInTheDocument()
    expect(
      within(east).getByRole("list", { name: /예상 대기/ })
    ).toBeInTheDocument()
    expect(within(west).getByText("줄 있음")).toBeInTheDocument()
    expect(
      within(west).getByRole("list", { name: /예상 대기/ })
    ).toBeInTheDocument()
    expect(within(nw).getByText("여유")).toBeInTheDocument()
    expect(within(nw).getByText("대기 없음")).toBeInTheDocument()
    expect(within(nw).queryByRole("list", { name: /예상 대기/ })).toBeNull()
    expect(within(box).getByText("13:00까지")).toBeInTheDocument()
    expect(within(box).getByText("수령")).toBeInTheDocument()
  })

  it("outside service hours shows next service and no empty list", () => {
    renderAt("2026-10-14T15:30", <Home />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "다음 배식은 석식 17:30부터예요"
    )
    expect(screen.getByText(/^석식 메뉴: /)).toBeInTheDocument()
    const east = screen.getByRole("listitem", { name: "동관 직원식당" })
    const box = screen.getByRole("listitem", { name: "간편식 도시락" })
    expect(within(east).getByText("17:30 시작")).toBeInTheDocument()
    for (const name of ["서관 직원식당", "신관 직원식당"]) {
      expect(
        within(screen.getByRole("listitem", { name })).getByText(
          "오늘 운영 종료"
        )
      ).toBeInTheDocument()
    }
    expect(within(box).getByText("오늘 마감")).toBeInTheDocument()
    expect(within(east).queryByText(/줄 있음|혼잡|여유|보통/)).toBeNull()
  })

  it("after midnight shows the late-night menu of the day it started", () => {
    // 목 00:30은 수요일 23:30에 시작한 야식이 진행 중이다
    renderAt("2026-10-15T00:30", <Home />)
    const east = screen.getByRole("listitem", { name: "동관 직원식당" })
    expect(within(east).getByText("감자수제비(뚝), 너비아니조림")).toBeInTheDocument()
  })

  it("shows weekend closure in words", () => {
    renderAt("2026-10-17T12:20", <Home />)
    for (const name of ["서관 직원식당", "신관 직원식당"]) {
      expect(
        within(screen.getByRole("listitem", { name })).getByText("주말 휴무")
      ).toBeInTheDocument()
    }
    expect(screen.getByText("주말과 공휴일에는 동관만 운영해요")).toBeInTheDocument()
  })

  it("shows a weekday holiday closure in words", () => {
    renderAt("2026-10-09T12:20", <Home />)
    for (const name of ["서관 직원식당", "신관 직원식당"]) {
      expect(
        within(screen.getByRole("listitem", { name })).getByText("공휴일 휴무")
      ).toBeInTheDocument()
    }
  })

  it("labels prediction as simulation", () => {
    renderAt("2026-10-14T12:20", <Home />)
    expect(screen.getByText("모의 데이터로 대기를 예측한 시연이에요.")).toBeInTheDocument()
    expect(screen.getByText("10월 3주차 메뉴 기준이에요.")).toBeInTheDocument()
  })

  it("ignores a stored work building", () => {
    localStorage.setItem("babttae.workBuilding", '"west"')
    renderAt("2026-10-14T12:20", <Home />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "지금은 신관이 바로 드실 수 있어요"
    )
    expect(screen.queryByText(/걸어서/)).toBeNull()
    expect(screen.queryByText(/근무 건물/)).toBeNull()
    expect(screen.queryByText(/도보/)).toBeNull()
  })

  it("hall rows show no walking time", () => {
    renderAt("2026-10-14T12:20", <Home />)
    for (const name of ["동관 직원식당", "서관 직원식당", "신관 직원식당"]) {
      expect(
        within(screen.getByRole("listitem", { name })).queryByText(/걸어서/)
      ).toBeNull()
    }
  })

  it("opens the east detail sheet from its row with pattern and map link", async () => {
    const user = userEvent.setup()
    localStorage.setItem("babttae.workBuilding", '"west"')
    renderAt("2026-10-14T12:20", <Home />)
    const east = screen.getByRole("listitem", { name: "동관 직원식당" })
    await user.click(within(east).getByRole("button", { name: "동관 직원식당" }))

    const sheet = screen.getByRole("dialog", { name: "동관 직원식당" })
    const table = within(sheet).getByRole("table", {
      name: "동관 직원식당 평소 혼잡 패턴",
    })
    // 동관 중식은 월~일 7줄, 정시 열 머리만 보인다
    expect(within(table).getAllByRole("rowheader").map((th) => th.textContent)).toEqual([
      "월",
      "화",
      "수(오늘)",
      "목",
      "금",
      "토",
      "일",
    ])
    expect(within(table).getAllByText(/^\d+시$/).map((n) => n.textContent)).toEqual([
      "11시",
      "12시",
      "13시",
      "14시",
    ])
    expect(within(table).getAllByText(/^혼잡, 약 \d+분$/).length).toBeGreaterThan(0)
    expect(within(table).getAllByText("운영 안 함")).toHaveLength(6)
    // 오늘 예측 막대(크게)와 메뉴, 지도 링크
    expect(within(sheet).getByRole("list", { name: /예상 대기/ })).toBeInTheDocument()
    expect(within(sheet).getByText("꽈리고추간장닭갈비, 순두부찌개, 미니새송이볶음")).toBeInTheDocument()
    expect(within(sheet).getByRole("link", { name: "지도에서 보기" })).toHaveAttribute(
      "href",
      "/map?venue=east"
    )
    // 남아 있는 근무 건물 값이 있어도 도보 문구가 시트에 없다
    for (const word of [/걸어서/, /근무 건물/, /도보/])
      expect(within(sheet).queryByText(word)).toBeNull()
    expect(within(sheet).getByText(/모의 데이터/)).toBeInTheDocument()
  })

  it("opens the row sheet from the keyboard", async () => {
    const user = userEvent.setup()
    renderAt("2026-10-14T12:20", <Home />)
    const nw = within(screen.getByRole("listitem", { name: "신관 직원식당" }))
    nw.getByRole("button", { name: "신관 직원식당" }).focus()
    await user.keyboard("{Enter}")
    const sheet = screen.getByRole("dialog", { name: "신관 직원식당" })
    const table = within(sheet).getByRole("table", {
      name: "신관 직원식당 평소 혼잡 패턴",
    })
    expect(within(table).getAllByRole("rowheader")).toHaveLength(5)
    expect(within(sheet).getByRole("link", { name: "지도에서 보기" })).toHaveAttribute(
      "href",
      "/map?venue=new"
    )
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("detail sheet on a closed day says so instead of empty bars", async () => {
    const user = userEvent.setup()
    renderAt("2026-10-17T12:20", <Home />)
    await user.click(
      within(screen.getByRole("listitem", { name: "서관 직원식당" })).getByRole(
        "button",
        { name: "서관 직원식당" }
      )
    )
    const sheet = screen.getByRole("dialog", { name: "서관 직원식당" })
    expect(within(sheet).getByText("오늘은 운영하지 않아요")).toBeInTheDocument()
    expect(within(sheet).queryByRole("list", { name: /예상 대기/ })).toBeNull()
    expect(
      within(sheet).getByRole("table", { name: "서관 직원식당 평소 혼잡 패턴" })
    ).toBeInTheDocument()
  })

  it("raises the small forecast bars above the row-wide click target only on hover devices", () => {
    renderAt("2026-10-14T12:20", <Home />)
    const east = screen.getByRole("listitem", { name: "동관 직원식당" })
    const bars = east.querySelector("[data-slot=forecast-bars]")!
    // 마우스에서는 막대가 줄 버튼(::after) 위에 있어야 툴팁이 뜨고,
    // 터치에서는 아래에 있어야 막대를 눌러도 상세 시트가 열린다
    expect(bars).toHaveClass(
      "[@media(hover:hover)]:relative",
      "[@media(hover:hover)]:z-10"
    )
    expect(bars).not.toHaveClass("z-10")
  })

  it("has a single h1", () => {
    renderAt("2026-10-14T12:20", <Home />)
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })
})
