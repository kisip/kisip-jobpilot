import { expect, it } from 'vitest'
import { nextScheduledScan, scanHealth } from './scanStatusService'
it('calculates the next UTC cron slot across day boundaries', () => {
  expect(nextScheduledScan(new Date('2026-09-27T06:16:00Z'))).toBe('2026-09-27T06:17:00.000Z')
  expect(nextScheduledScan(new Date('2026-09-27T18:17:00Z'))).toBe('2026-09-28T00:17:00.000Z')
})
it('clearly labels partial failures and overdue scans without hiding failure', () => {
  const scan = { status: 'Partial failure', nextScan: '2026-09-27T06:17:00Z' }
  expect(scanHealth(scan, new Date('2026-09-27T06:30:00Z'))).toEqual({ label: 'Partial failure', warning: true })
  expect(scanHealth(scan, new Date('2026-09-27T07:18:00Z'))).toEqual({ label: 'Overdue · Partial failure', warning: true })
})

// Regression evidence from the September 28 production scan. Deployment time
// must not replace scan time or shift the next slot by another six hours.
const september28 = {
  status: 'Active', automationStatus: 'Active',
  lastScan: '2026-09-28T05:33:11.674Z',
  lastSuccessfulScan: '2026-09-28T05:33:11.674Z',
  nextScan: '2026-09-28T06:17:00.000Z'
}
it('uses the next UTC cron slot for the actual scan, not six hours after completion', () => {
  expect(nextScheduledScan(new Date(september28.lastScan))).toBe(september28.nextScan)
  expect(nextScheduledScan(new Date('2026-09-28T11:03:11.674+05:30'))).toBe(september28.nextScan)
})
it.each([
  ['2026-09-28T07:16:59.999Z', 'Active', false],
  ['2026-09-28T07:17:00.000Z', 'Active', false],
  ['2026-09-28T07:17:00.001Z', 'Overdue · Active', true],
  ['2026-09-28T12:47:00.001+05:30', 'Overdue · Active', true]
])('applies the one-hour grace period at %s', (time, label, warning) => {
  expect(scanHealth(september28, new Date(time))).toEqual({ label, warning })
})
it('keeps an old successful scan overdue after a later app deployment', () => {
  expect(scanHealth(september28, new Date('2026-09-28T09:11:30Z'))).toEqual({ label: 'Overdue · Active', warning: true })
})
it('clears overdue only when a new scan advances the expected slot', () => {
  const lastScan = '2026-09-28T12:20:00Z'
  const fresh = { ...september28, lastScan, lastSuccessfulScan: lastScan, nextScan: nextScheduledScan(new Date(lastScan)) }
  expect(scanHealth(fresh, new Date('2026-09-28T13:05:00Z'))).toEqual({ label: 'Active', warning: false })
})
it.each(['00', '06', '12', '18'])('keeps all configured UTC slots at minute 17: %s', hour => {
  expect(nextScheduledScan(new Date(`2026-09-28T${hour}:16:59Z`))).toBe(`2026-09-28T${hour}:17:00.000Z`)
})
