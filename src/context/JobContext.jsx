import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import seedJobs from '../data/jobs.json'
import { deduplicateJobs, duplicateKey, normalizeJob } from '../lib/jobs'
import { load, save } from '../lib/storage'

const JobContext = createContext(null)
export function JobProvider({ children }) {
  const [jobs, setJobs] = useState(() => deduplicateJobs(load('jobs', seedJobs).map(normalizeJob)))
  const [resumes, setResumes] = useState(() => load('resumes', [{ id: 'resume-1', name: 'DevOps CV', version: 'v1', url: '', skills: ['Linux', 'AWS', 'Docker'] }]))
  useEffect(() => { save('jobs', jobs) }, [jobs])
  useEffect(() => { save('resumes', resumes) }, [resumes])
  const actions = useMemo(() => ({
    addJob(job) { const next = normalizeJob(job); if (jobs.some(item => duplicateKey(item) === duplicateKey(next))) return { ok: false, message: 'This job is already tracked.' }; setJobs(current => [next, ...current]); return { ok: true } },
    updateJob(id, updates) { setJobs(current => current.map(job => job.id === id ? normalizeJob({ ...job, ...updates, id }) : job)) },
    deleteJob(id) { setJobs(current => current.filter(job => job.id !== id)) }
  }), [jobs])
  return <JobContext.Provider value={{ jobs, resumes, setResumes, ...actions }}>{children}</JobContext.Provider>
}
export const useJobs = () => useContext(JobContext)
