import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import seedJobs from '../data/jobs.json'
import { deduplicateJobs, duplicateKey, normalizeJob, validateJob } from '../lib/jobs'
import { load, save } from '../lib/storage'

const JobContext = createContext(null)
const sanitizeJobs = jobs => deduplicateJobs((Array.isArray(jobs) ? jobs : []).map(normalizeJob).filter(job => validateJob(job).valid))

export function JobProvider({ children }) {
  const [jobs, setJobs] = useState(() => sanitizeJobs(load('jobs', seedJobs)))
  const [resumes, setResumes] = useState(() => load('resumes', [{ id: 'resume-1', name: 'DevOps CV', version: 'v1', url: '', skills: ['Linux', 'AWS', 'Docker'] }]))
  useEffect(() => { save('jobs', jobs) }, [jobs])
  useEffect(() => { save('resumes', resumes) }, [resumes])
  const actions = useMemo(() => ({
    addJob(job) {
      const next = normalizeJob(job); const validation = validateJob(next)
      if (!validation.valid) return { ok: false, message: validation.reason }
      if (jobs.some(item => duplicateKey(item) === duplicateKey(next))) return { ok: false, message: 'This job is already tracked.' }
      setJobs(current => [next, ...current]); return { ok: true }
    },
    updateJob(id, updates) {
      const current = jobs.find(job => job.id === id); const next = normalizeJob({ ...current, ...updates, id }); const validation = validateJob(next)
      if (!validation.valid) return { ok: false, message: validation.reason }
      setJobs(items => items.map(job => job.id === id ? next : job)); return { ok: true }
    },
    deleteJob(id) { setJobs(current => current.filter(job => job.id !== id)) }
  }), [jobs])
  return <JobContext.Provider value={{ jobs, resumes, setResumes, ...actions }}>{children}</JobContext.Provider>
}
export const useJobs = () => useContext(JobContext)
