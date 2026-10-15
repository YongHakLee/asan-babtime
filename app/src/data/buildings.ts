import type { BuildingId } from '@/domain/types'

export interface Building {
  id: BuildingId
  name: string
  /** 지도 viewBox(360×220) 기준 단순화한 블록. 실제 배치를 추정해 줄였다. */
  block: { x: number; y: number; w: number; h: number }
}

/**
 * 건물 5개. 서관·신관은 서쪽(신관이 북쪽), 동관은 동쪽,
 * 교육연구관·아산생명과학연구원은 남쪽에 둔다(배치는 추정).
 */
export const BUILDINGS: Record<BuildingId, Building> = {
  east: { id: 'east', name: '동관', block: { x: 160, y: 14, w: 186, h: 146 } },
  west: { id: 'west', name: '서관', block: { x: 14, y: 92, w: 132, h: 68 } },
  new: { id: 'new', name: '신관', block: { x: 14, y: 14, w: 132, h: 68 } },
  eduResearch: { id: 'eduResearch', name: '교육연구관', block: { x: 14, y: 172, w: 160, h: 36 } },
  asanLife: { id: 'asanLife', name: '아산생명과학연구원', block: { x: 186, y: 172, w: 160, h: 36 } },
}
