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

  it("sets a work building from the chip and recommends by walk + wait", async () => {
    const user = userEvent.setup()
    renderAt("2026-10-14T12:20", <Home />)
    // 미설정이면 줄에 도보 표기가 없다
    expect(screen.queryByText(/걸어서/)).toBeNull()
    await user.click(screen.getByRole("button", { name: "근무 건물: 미설정" }))
    const sheet = screen.getByRole("dialog", { name: "근무 건물" })
    const options = within(sheet).getAllByRole("button", { pressed: false })
    expect(options.map((b) => b.textContent)).toEqual([
      "동관",
      "서관",
      "신관",
      "교육연구관",
      "아산생명과학연구원",
    ])
    await user.click(within(sheet).getByRole("button", { name: "서관" }))

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "지금 출발하면 신관이 가장 빨라요"
    )
    expect(
      screen.getByText("걸어서 4분, 도착하면 바로 드실 수 있어요")
    ).toBeInTheDocument()
    const nw = screen.getByRole("listitem", { name: "신관 직원식당" })
    expect(within(nw).getByText(/걸어서 4분/)).toHaveTextContent("추정")
    expect(
      within(screen.getByRole("listitem", { name: "동관 직원식당" })).getByText(
        /걸어서 7분/
      )
    ).toBeInTheDocument()
    // 도시락 줄에는 도보 표기를 붙이지 않는다
    expect(
      within(
        screen.getByRole("listitem", { name: "간편식 도시락" })
      ).queryByText(/걸어서/)
    ).toBeNull()
    expect(
      screen.getByRole("button", { name: "근무 건물: 서관" })
    ).toBeInTheDocument()
  })

  it("clears the work building back to the default rule", async () => {
    const user = userEvent.setup()
    localStorage.setItem("babttae.workBuilding", '"west"')
    renderAt("2026-10-14T12:20", <Home />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "지금 출발하면 신관이 가장 빨라요"
    )
    await user.click(screen.getByRole("button", { name: "근무 건물: 서관" }))
    const sheet = screen.getByRole("dialog", { name: "근무 건물" })
    expect(within(sheet).getByRole("button", { name: "서관" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    await user.click(within(sheet).getByRole("button", { name: "설정 지우기" }))
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "지금은 신관이 바로 드실 수 있어요"
    )
    expect(
      screen.getByRole("button", { name: "근무 건물: 미설정" })
    ).toBeInTheDocument()
    expect(screen.queryByText(/걸어서/)).toBeNull()
  })

  it("opens the east detail sheet from its row with pattern and map link", async () => {
    const user = userEvent.setup()
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
    // 근무 건물을 정하지 않았으면 도보 줄이 없다
    expect(within(sheet).queryByText(/걸어서/)).toBeNull()
    expect(within(sheet).getByText(/모의 데이터/)).toBeInTheDocument()
  })

  it("opens the row sheet from the keyboard and shows walk time when set", async () => {
    const user = userEvent.setup()
    localStorage.setItem("babttae.workBuilding", '"west"')
    renderAt("2026-10-14T12:20", <Home />)
    const nw = within(screen.getByRole("listitem", { name: "신관 직원식당" }))
    nw.getByRole("button", { name: "신관 직원식당" }).focus()
    await user.keyboard("{Enter}")
    const sheet = screen.getByRole("dialog", { name: "신관 직원식당" })
    expect(within(sheet).getByText("근무 건물에서 걸어서 4분(추정)")).toBeInTheDocument()
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

  it("shows no building tile in the hero when nothing is reachable before closing", () => {
    localStorage.setItem("babttae.workBuilding", '"asanLife"')
    renderAt("2026-10-14T14:55", <Home />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "지금 출발하면 마감 전에 도착하기 어려워요"
    )
    const hero = screen.getByRole("heading", { level: 1 }).closest("section")!
    expect(hero.querySelector("[data-slot=building-tile]")).toBeNull()
    expect(hero.querySelector("[data-slot=hero-tiles]")).toBeNull()
  })

  it("keeps the small forecast bars above the row-wide click target", () => {
    renderAt("2026-10-14T12:20", <Home />)
    const east = screen.getByRole("listitem", { name: "동관 직원식당" })
    // 줄 버튼의 ::after가 줄을 덮으므로 막대가 그 위에 있어야 툴팁이 뜬다
    expect(east.querySelector("[data-slot=forecast-bars]")).toHaveClass(
      "relative",
      "z-10"
    )
  })

  it("hides the walk time on halls that do not serve today", () => {
    localStorage.setItem("babttae.workBuilding", '"west"')
    renderAt("2026-10-17T12:20", <Home />)
    for (const name of ["서관 직원식당", "신관 직원식당"]) {
      const row = screen.getByRole("listitem", { name })
      expect(within(row).getByText("주말 휴무")).toBeInTheDocument()
      expect(within(row).queryByText(/걸어서/)).toBeNull()
    }
    expect(
      within(screen.getByRole("listitem", { name: "동관 직원식당" })).getByText(
        "걸어서 7분(추정)"
      )
    ).toBeInTheDocument()
  })

  it("has a single h1", () => {
    renderAt("2026-10-14T12:20", <Home />)
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })
})
