/** 다음 주(10/19~23) 도시락 사전 예약 메뉴. A=한식, B=샐러드. kcal 빈칸은 생략. */
export const BOX_LUNCH_RESERVATION: {
  date: string
  a: { name: string; kcal?: number }
  b: { name: string; kcal?: number }
}[] = [
  { date: '2026-10-19', a: { name: '소불고기도시락', kcal: 876 }, b: { name: '리코타치즈샐러드', kcal: 675 } },
  { date: '2026-10-20', a: { name: '치킨마요덮밥도시락', kcal: 992 }, b: { name: '프로틴샐러드', kcal: 543 } },
  { date: '2026-10-21', a: { name: '제육볶음도시락' }, b: { name: '구운두부샐러드', kcal: 548 } },
  { date: '2026-10-22', a: { name: '모둠까스도시락', kcal: 897 }, b: { name: '분짜샐러드', kcal: 538 } },
  { date: '2026-10-23', a: { name: '매콤닭갈비도시락' }, b: { name: '우삼겹메밀면샐러드', kcal: 554 } },
]

export const BOX_LUNCH_NOTICE = 'AMIS3.0 도시락신청, 월 08:30 ~ 목 17:30, 하루 500개 한정'
