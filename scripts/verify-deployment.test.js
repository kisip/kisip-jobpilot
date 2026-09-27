// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { verifyDeployment } from './verify-deployment.js'
const expectedScan = { lastScan: '2026-09-27T12:20:00Z', status: 'Active' }
const expectedJobs = [{ id: 'new-job' }]
const options = { baseUrl: 'https://dashboard.invalid/kisip-jobpilot/', expectedScan, expectedJobs, attempts: 2, delay: async () => {} }
it('verifies the published timestamp and exact job dataset, retrying stale CDN data', async () => {
  let calls = 0
  const fetchImpl = vi.fn(async url => ({ ok: true, json: async () => {
    calls += 1
    return url.includes('scan-status') ? (calls <= 2 ? { ...expectedScan, lastScan: 'old' } : expectedScan) : expectedJobs
  } }))
  expect(await verifyDeployment({ ...options, fetchImpl })).toBe(expectedScan.lastScan)
  expect(fetchImpl).toHaveBeenCalledTimes(4)
  expect(fetchImpl.mock.calls[0][0]).toContain('/kisip-jobpilot/data/scan-status.json?v=')
})
it('fails verification if jobs do not match despite a new timestamp', async () => {
  await expect(verifyDeployment({ ...options, fetchImpl: async url => ({ ok: true, json: async () => url.includes('scan-status') ? expectedScan : [] }) })).rejects.toThrow('stale or inconsistent')
})
it('fails on HTTP errors instead of reporting deployment success', async () => {
  await expect(verifyDeployment({ ...options, fetchImpl: async () => ({ ok: false, status: 404 }) })).rejects.toThrow('HTTP 404')
})
