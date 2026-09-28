import { describe, expect, it } from 'vitest'
import { formatRelativeDate, isNewlyPosted, isNewlyDiscovered, postedDisplay } from './dateService'
import { freshnessCounts, quickMatch, newestFirst } from './jobFilterService'
const now = new Date('2026-08-23T12:00:00Z')
describe('separate posting and discovery freshness', () => {
  it('uses useful relative time', () => expect(formatRelativeDate('2026-08-23T10:00:00Z', now)).toBe('2 hours ago'))
  it('does not call an old posting newly posted when discovered today', () => {
    const job = { postedAt: '2026-01-01T00:00:00Z', discoveredAt: '2026-08-23T11:00:00Z' }
    expect(isNewlyPosted(job, 24, now)).toBe(false)
    expect(isNewlyDiscovered(job, 24, now)).toBe(true)
    expect(quickMatch(job, 'Newly posted · 24h', now)).toBe(false)
    expect(quickMatch(job, 'Newly discovered · 24h', now)).toBe(true)
    expect(freshnessCounts([job], now)).toMatchObject({ day: 0, week: 0, discoveredDay: 1, discoveredWeek: 1 })
  })
  it('labels missing posting dates unknown without a discovery fallback', () => {
    const job = { discoveredAt: '2026-08-23T11:00:00Z' }
    expect(isNewlyPosted(job, 24, now)).toBe(false)
    expect(isNewlyDiscovered(job, 24, now)).toBe(true)
    expect(postedDisplay(job, now)).toEqual({ value: 'Not specified', fallbackUsed: false })
  })
  it.each(['invalid', '2026-08-24T00:00:00Z'])('excludes invalid/future date %s from both windows', date => {
    expect(isNewlyPosted({ postedAt: date }, 24, now)).toBe(false)
    expect(isNewlyDiscovered({ discoveredAt: date }, 24, now)).toBe(false)
  })
  it('sorts independently by posting or discovery date', () => {
    const a = { id: 'a', postedAt: '2026-08-23', discoveredAt: '2026-08-23' }, b = { id: 'b', postedAt: '2026-01-01', discoveredAt: '2026-08-24' }
    expect(newestFirst([a, b]).map(j => j.id)).toEqual(['a', 'b'])
    expect(newestFirst([a, b], 'discovered').map(j => j.id)).toEqual(['b', 'a'])
  })
})
it('keeps unknown posting dates last when sorting by posted date', () => {
  const dated = { id: 'dated', postedAt: '2026-01-01' }, unknown = { id: 'unknown', discoveredAt: '2026-08-23' }
  expect(newestFirst([unknown, dated]).map(job => job.id)).toEqual(['dated', 'unknown'])
})
