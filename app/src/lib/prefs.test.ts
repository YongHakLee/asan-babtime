import { describe, expect, it } from 'vitest'

import { getFavorites, getRating, getSubscriptions, mockRating, rateMeal, setSubscriptions, toggleFavorite } from '@/lib/prefs'

describe('prefs', () => {
  it('toggles favorites', () => {
    toggleFavorite('닭갈비')
    expect(getFavorites()).toContain('닭갈비')
    toggleFavorite('닭갈비')
    expect(getFavorites()).not.toContain('닭갈비')
  })
  it('defaults subscriptions off and persists changes', () => {
    expect(getSubscriptions()).toEqual({ queueCleared: [], favoriteDay: false, boxLunchDeadline: false, closingSoon: false })
    setSubscriptions({ queueCleared: ['east'], favoriteDay: true, boxLunchDeadline: false, closingSoon: false })
    expect(getSubscriptions().queueCleared).toEqual(['east'])
  })
  it('stores ratings', () => {
    expect(getRating('k')).toBeNull()
    rateMeal('k', { stars: 4, leftover: 'some' })
    expect(getRating('k')).toEqual({ stars: 4, leftover: 'some' })
  })
  it('mockRating is deterministic and in range', () => {
    for (const n of ['닭갈비', '김치찌개', '돈까스', 'a']) {
      const r = mockRating(n)
      expect(r).toEqual(mockRating(n))
      expect(r.avg).toBeGreaterThanOrEqual(3.8)
      expect(r.avg).toBeLessThanOrEqual(4.8)
      expect(r.count).toBeGreaterThanOrEqual(40)
      expect(r.count).toBeLessThanOrEqual(240)
    }
  })
})
