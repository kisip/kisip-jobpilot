import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { JobProvider, useJobs } from './JobContext'
import Dashboard from '../pages/Dashboard'
import Automation from '../pages/Automation'
import { normalizeJob } from '../services/jobService'

const fixture = normalizeJob({ title: 'Junior DevOps Engineer', company: 'Fixture', location: 'India', source: 'Remotive', url: 'https://careers.fixture.dev/1', discoveredAt: '2026-09-27T00:00:00Z', skills: ['Linux'] })
const scan = { status: 'Partial failure', lastScan: '2026-09-27T12:20:00.000Z', nextScan: '2099-09-27T18:17:00.000Z', errors: ['Remotive: offline'] }
function feed(jobs = [fixture], health = scan) {
  vi.stubGlobal('fetch', vi.fn(async url => ({ ok: true, json: async () => url.includes('scan-status') ? health : jobs })))
}
afterEach(() => vi.unstubAllGlobals())
it.each(['Saved', 'Applied', 'Interview'])('preserves browser-local %s records after feed removal and reload', async status => {
  feed()
  const first = renderHook(() => useJobs(), { wrapper: JobProvider })
  await waitFor(() => expect(first.result.current.jobs.some(j => j.id === fixture.id)).toBe(true))
  act(() => first.result.current.updateJob(fixture.id, { status, notes: 'Private note', resumeVersion: 'v2', applicationDate: status === 'Applied' ? '2026-09-26' : '' }))
  feed([])
  await act(async () => { await first.result.current.refreshDataset() })
  expect(first.result.current.jobs.find(j => j.id === fixture.id)).toMatchObject({ status, notes: 'Private note', resumeVersion: 'v2' })
  first.unmount()
  const reloaded = renderHook(() => useJobs(), { wrapper: JobProvider })
  await waitFor(() => expect(reloaded.result.current.lastRefresh).not.toBe(''))
  expect(reloaded.result.current.jobs.find(j => j.id === fixture.id)).toMatchObject({ status, notes: 'Private note', resumeVersion: 'v2' })
  act(() => reloaded.result.current.deleteJob(fixture.id))
  expect(reloaded.result.current.jobs.some(j => j.id === fixture.id)).toBe(false)
})
it('renders the delivered scan timestamp and partial failure on dashboard and automation', async () => {
  feed()
  render(<MemoryRouter><JobProvider><Dashboard/><Automation/></JobProvider></MemoryRouter>)
  await waitFor(() => expect(screen.getAllByText('Partial failure')).toHaveLength(2))
  expect(screen.getByText(`Last scan: ${new Date(scan.lastScan).toLocaleString()}`)).toBeInTheDocument()
  expect(screen.getByText(new Date(scan.lastScan).toLocaleString())).toBeInTheDocument()
  expect(screen.getByText('Remotive: offline')).toBeInTheDocument()
})
it('keeps the last dataset and reports an error when scan metadata cannot be fetched', async () => {
  feed()
  const { result } = renderHook(() => useJobs(), { wrapper: JobProvider })
  await waitFor(() => expect(result.current.lastRefresh).not.toBe(''))
  vi.stubGlobal('fetch', vi.fn(async url => ({ ok: !url.includes('scan-status'), status: 503, json: async () => [] })))
  await act(async () => { await result.current.refreshDataset() })
  expect(result.current.error).toContain('Scan status returned HTTP 503')
  expect(result.current.jobs.some(j => j.id === fixture.id)).toBe(true)
  expect(result.current.scanStatus.lastScan).toBe(scan.lastScan)
})
it('keeps a saved snapshot and its user state when another source supplies the same listing', async () => {
  const applyUrl = 'https://careers.fixture.dev/positions/123'
  const saved = normalizeJob({ ...fixture, id: 'saved-cross-source', source: 'Himalayas', url: 'https://himalayas.app/jobs/123', applyUrl, status: 'Saved', notes: 'Do not lose this note' })
  localStorage.setItem('jobpilot.tracked-jobs.v1', JSON.stringify([saved]))
  localStorage.setItem('jobpilot.job-user-state.v2', JSON.stringify({ [saved.id]: { status: 'Saved', notes: saved.notes } }))
  feed([{ ...fixture, applyUrl }])
  const { result } = renderHook(() => useJobs(), { wrapper: JobProvider })
  await waitFor(() => expect(result.current.lastRefresh).not.toBe(''))
  const matching = result.current.jobs.filter(job => job.applyUrl === applyUrl)
  expect(matching).toHaveLength(1)
  expect(matching[0]).toMatchObject({ id: saved.id, status: 'Saved', notes: saved.notes })
})
