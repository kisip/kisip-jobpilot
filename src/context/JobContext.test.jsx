import { renderHook, act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { JobProvider, useJobs } from './JobContext'

const manual = { title: 'DevOps Engineer', company: 'Verified Company', location: 'Chennai', experience: '1 Year', skills: ['Linux'], jobType: 'Full-time', workMode: 'Hybrid', source: 'LinkedIn (manual)', url: 'https://www.linkedin.com/jobs/view/123456789' }
const placeholder = (...parts) => `https://${parts.join('.')}/jobs/1`
describe('job actions', () => {
  it('adds a real manual URL and updates application status', () => { const { result } = renderHook(() => useJobs(), { wrapper: JobProvider }); let added; act(() => { added = result.current.addJob(manual) }); expect(added.ok).toBe(true); const id = result.current.jobs[0].id; act(() => result.current.updateJob(id, { status: 'Applied' })); expect(result.current.jobs.find(job => job.id === id).status).toBe('Applied') })
  it('rejects duplicate jobs', () => { const { result } = renderHook(() => useJobs(), { wrapper: JobProvider }); act(() => result.current.addJob(manual)); let response; act(() => { response = result.current.addJob(manual) }); expect(response.ok).toBe(false) })
  it('rejects placeholder manual URLs', () => { const { result } = renderHook(() => useJobs(), { wrapper: JobProvider }); let response; act(() => { response = result.current.addJob({ ...manual, url: placeholder('example', 'org') }) }); expect(response.ok).toBe(false); expect(result.current.jobs).toHaveLength(0) })
  it('purges invalid cached jobs', () => { localStorage.setItem('jobpilot.jobs.v1', JSON.stringify([{ ...manual, url: placeholder('local', 'host') }])); const { result } = renderHook(() => useJobs(), { wrapper: JobProvider }); expect(result.current.jobs).toHaveLength(0) })
})
