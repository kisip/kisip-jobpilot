import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import seedJobs from '../data/jobs.json'
import sources from '../data/sources.json'
import { applicationStatuses, deduplicateJobs, duplicateKey, normalizeJob, validateJob, validateJobUrl } from '../services/jobService'
import { storageService } from '../services/storageService'
import { activeResume, resumeLabel } from '../services/resumeService'
import { defaultResume, migrateResumes } from '../config/resumeProfile'
const JobContext = createContext(null)
const sanitize = jobs => deduplicateJobs((Array.isArray(jobs) ? jobs : []).map(normalizeJob).filter(job => validateJob(job).valid))
const hydrateJobs = () => {
  const deployed = sanitize(seedJobs), cached = sanitize(storageService.load('jobs', [])), cachedByKey = new Map(cached.map(job => [duplicateKey(job), job])), automaticSources = new Set(sources.map(source => source.name))
  const refreshed = deployed.map(job => { const previous = cachedByKey.get(duplicateKey(job)); return previous ? normalizeJob({ ...job, status: previous.status, notes: previous.notes || job.notes, resumeVersion: previous.resumeVersion, applicationStartedAt: previous.applicationStartedAt, applicationDate: previous.applicationDate, followUpDate: previous.followUpDate }) : job })
  return deduplicateJobs([...refreshed, ...cached.filter(job => !automaticSources.has(job.source))])
}
export function JobProvider({ children }) {
  const [jobs, setJobs] = useState(hydrateJobs)
  const [resumes, setResumes] = useState(() => migrateResumes(storageService.load('resumes', [defaultResume])))
  useEffect(() => { storageService.save('jobs', jobs) }, [jobs])
  useEffect(() => { storageService.save('resumes', resumes) }, [resumes])
  const actions = useMemo(() => ({
    addJob(job) { const next = normalizeJob(job), validation = validateJob(next); if (!validation.valid) return { ok: false, message: validation.reason }; if (jobs.some(item => duplicateKey(item) === duplicateKey(next))) return { ok: false, message: 'This job is already tracked.' }; setJobs(current => [next, ...current]); return { ok: true } },
    updateJob(id, updates) { const current = jobs.find(job => job.id === id), next = normalizeJob({ ...current, ...updates, id }), validation = validateJob(next); if (!validation.valid) return { ok: false, message: validation.reason }; setJobs(items => items.map(job => job.id === id ? next : job)); return { ok: true } },
    startApplication(id) {
      const job = jobs.find(item => item.id === id), url = job?.applyUrl || job?.url
      if (!job || !validateJobUrl(url)) return { ok: false, message: 'Application URL unavailable.' }
      if (job.applicationDate || applicationStatuses.filter(status => status !== 'Application Started').includes(job.status)) return { ok: false, message: 'You already applied to this job.' }
      if (job.status !== 'Application Started') {
        const resume = activeResume(resumes)
        setJobs(items => items.map(item => item.id === id ? normalizeJob({ ...item, status: 'Application Started', applicationStartedAt: new Date().toISOString(), resumeVersion: resumeLabel(resume) }) : item))
      }
      return { ok: true, url, alreadyStarted: job.status === 'Application Started' }
    },
    markApplied(id) {
      const job = jobs.find(item => item.id === id)
      if (!job) return { ok: false, message: 'Job not found.' }
      if (job.applicationDate || job.status === 'Applied') return { ok: false, message: 'You already applied to this job.' }
      const resume = activeResume(resumes)
      setJobs(items => items.map(item => item.id === id ? normalizeJob({ ...item, status: 'Applied', applicationDate: new Date().toISOString(), resumeVersion: item.resumeVersion || resumeLabel(resume) }) : item))
      return { ok: true }
    },
    deleteJob(id) { setJobs(current => current.filter(job => job.id !== id)) }
  }), [jobs, resumes])
  return <JobContext.Provider value={{ jobs, resumes, setResumes, ...actions }}>{children}</JobContext.Provider>
}
export const useJobs = () => useContext(JobContext)
