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
