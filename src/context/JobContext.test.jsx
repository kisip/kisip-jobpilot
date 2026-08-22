import { renderHook, act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dashboardCounters } from '../services/jobService'
import { JobProvider, useJobs } from './JobContext'

const manual = { title: 'DevOps Engineer', company: 'Verified Company', location: 'Chennai', experience: '1 Year', skills: ['Linux'], jobType: 'Full-time', workMode: 'Hybrid', source: 'LinkedIn (manual)', url: 'https://www.linkedin.com/jobs/view/123456789' }
const placeholder = (...parts) => `https://${parts.join('.')}/jobs/1`
describe('job actions', () => {
  it('adds a real manual URL and updates application status', () => { const { result } = renderHook(() => useJobs(), { wrapper: JobProvider }); let added; act(() => { added = result.current.addJob(manual) }); expect(added.ok).toBe(true); const id = result.current.jobs[0].id; act(() => result.current.updateJob(id, { status: 'Applied' })); expect(result.current.jobs.find(job => job.id === id).status).toBe('Applied') })
  it('rejects duplicate jobs', () => { const { result } = renderHook(() => useJobs(), { wrapper: JobProvider }); act(() => result.current.addJob(manual)); let response; act(() => { response = result.current.addJob(manual) }); expect(response.ok).toBe(false) })
  it('rejects placeholder manual URLs', () => { const { result } = renderHook(() => useJobs(), { wrapper: JobProvider }); let response; act(() => { response = result.current.addJob({ ...manual, url: placeholder('example', 'org') }) }); expect(response.ok).toBe(false); expect(result.current.jobs.some(job => job.url.includes(placeholder('example', 'org')))).toBe(false) })
  it('purges invalid cached jobs', () => { localStorage.setItem('jobpilot.jobs.v1', JSON.stringify([{ ...manual, url: placeholder('local', 'host') }])); const { result } = renderHook(() => useJobs(), { wrapper: JobProvider }); expect(result.current.jobs.some(job => job.url.includes(placeholder('local', 'host')))).toBe(false) })
})

describe('application tracking automation', () => {
  it('associates the active resume and application date when marked applied', () => {
    const { result } = renderHook(() => useJobs(), { wrapper: JobProvider })
    act(() => result.current.addJob(manual))
    const job = result.current.jobs.find(item => item.url === manual.url)
    act(() => result.current.markApplied(job.id))
    const applied = result.current.jobs.find(item => item.id === job.id)
    expect(applied.status).toBe('Applied')
    expect(applied.applicationDate).toContain('T')
    expect(applied.resumeVersion).toBe('Anandha Krishnan DevOps CV v1')
    expect(dashboardCounters(result.current.jobs).applied).toBeGreaterThanOrEqual(1)
  })
})

describe('safe application start workflow', () => {
  it('records Application Started, exact click time, and active resume', () => {
    const { result } = renderHook(() => useJobs(), { wrapper: JobProvider })
    act(() => result.current.addJob(manual))
    const job = result.current.jobs.find(item => item.url === manual.url)
    let response
    act(() => { response = result.current.startApplication(job.id) })
    const started = result.current.jobs.find(item => item.id === job.id)
    expect(response).toMatchObject({ ok: true, url: manual.url })
    expect(started.status).toBe('Application Started')
    expect(started.applicationStartedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(started.resumeVersion).toBe('Anandha Krishnan DevOps CV v1')
  })
  it('prevents a second application after Applied', () => {
    const { result } = renderHook(() => useJobs(), { wrapper: JobProvider })
    act(() => result.current.addJob(manual))
    const job = result.current.jobs.find(item => item.url === manual.url)
    act(() => result.current.startApplication(job.id))
    act(() => result.current.markApplied(job.id))
    act(() => result.current.updateJob(job.id, { status: 'Saved' }))
    let duplicate
    act(() => { duplicate = result.current.startApplication(job.id) })
    expect(duplicate).toEqual({ ok: false, message: 'You already applied to this job.' })
    expect(result.current.jobs.filter(item => item.id === job.id)).toHaveLength(1)
  })
})
