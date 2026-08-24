import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import seedJobs from '../data/jobs.json'
import initialScan from '../data/scan-status.json'
import sources from '../data/sources.json'
import { applicationStatuses, deduplicateJobs, duplicateKey, normalizeJob, validateJob, validateJobUrl } from '../services/jobService'
import { storageService } from '../services/storageService'
import { activeResume, resumeLabel } from '../services/resumeService'
import { defaultResume, migrateResumes } from '../config/resumeProfile'

const JobContext = createContext(null)
const sanitize = jobs => deduplicateJobs((Array.isArray(jobs) ? jobs : []).map(normalizeJob).filter(job => validateJob(job).valid))
const userFields = ['status','notes','resumeVersion','applicationStartedAt','applicationDate','followUpDate','hidden']
const pickUserState = job => Object.fromEntries(userFields.filter(key => job?.[key]).map(key => [key, job[key]]))
const defaults = { notifications: true, threshold: 80, dailyGoal: 5, archiveDays: 30 }

function migrateLegacy() {
  const legacy = storageService.load('jobs', [])
  const automaticSources = new Set(sources.map(source => source.name))
  const state = { ...storageService.load('jobUserState', {}) }
  const manual = [...storageService.load('manualJobs', [])]
  for (const old of sanitize(legacy)) {
    state[old.id] = { ...state[old.id], ...pickUserState(old) }
    if (!automaticSources.has(old.source) && !manual.some(item => duplicateKey(item) === duplicateKey(old))) manual.push(old)
  }
  if (legacy.length) {
    storageService.save('jobUserState', state)
    storageService.save('manualJobs', manual)
    storageService.remove('jobs')
  }
  return { state, manual: sanitize(manual) }
}

export function JobProvider({ children }) {
  const migrated = useMemo(migrateLegacy, [])
  const [discoveredJobs, setDiscoveredJobs] = useState(() => sanitize(seedJobs))
  const [manualJobs, setManualJobs] = useState(migrated.manual)
  const [userState, setUserState] = useState(migrated.state)
  const [resumes, setResumes] = useState(() => migrateResumes(storageService.load('resumes', [defaultResume])))
  const [settings, setSettings] = useState(() => ({ ...defaults, ...storageService.load('settings', {}) }))
  const [scanStatus, setScanStatus] = useState(initialScan)
  const [refreshState, setRefreshState] = useState({ refreshing: false, lastRefresh: '', error: '' })
  useEffect(() => { storageService.save('jobUserState', userState) }, [userState])
  useEffect(() => { storageService.save('manualJobs', manualJobs) }, [manualJobs])
  useEffect(() => { storageService.save('resumes', resumes) }, [resumes])
  useEffect(() => { storageService.save('settings', settings) }, [settings])

  const jobs = useMemo(() => {
    const archiveDays = Number(settings.archiveDays) || 30
    const cutoff = Date.now() - archiveDays * 86400000
    return deduplicateJobs([...discoveredJobs, ...manualJobs]).map(job => {
      const merged = normalizeJob({ ...job, ...(userState[job.id] || {}) })
      const activity = new Date(merged.postedAt || merged.discoveredAt || 0).getTime()
      const protectedStatus = applicationStatuses.includes(merged.status) || merged.status === 'Saved'
      return !protectedStatus && activity && activity < cutoff ? { ...merged, status: 'Stale' } : merged
    }).filter(job => !job.hidden)
  }, [discoveredJobs, manualJobs, userState, settings.archiveDays])

  const refreshDataset = async () => {
    if (typeof fetch !== 'function') return { ok: false, message: 'Refresh is unavailable in this browser.' }
    setRefreshState(current => ({ ...current, refreshing: true, error: '' }))
    try {
      const base = import.meta.env.BASE_URL || '/'
      const version = Date.now()
      const [jobResponse, scanResponse] = await Promise.all([
        fetch(`${base}data/jobs.json?v=${version}`, { cache: 'no-store' }),
        fetch(`${base}data/scan-status.json?v=${version}`, { cache: 'no-store' })
      ])
      if (!jobResponse.ok) throw new Error(`Jobs feed returned HTTP ${jobResponse.status}`)
      const fresh = sanitize(await jobResponse.json())
      setDiscoveredJobs(fresh)
      if (scanResponse.ok) setScanStatus(await scanResponse.json())
      const lastRefresh = new Date().toISOString()
      setRefreshState({ refreshing: false, lastRefresh, error: '' })
      return { ok: true, count: fresh.length }
    } catch (error) {
      setRefreshState({ refreshing: false, lastRefresh: '', error: error.message })
      return { ok: false, message: error.message }
    }
  }
  useEffect(() => { refreshDataset() }, [])

  const patchState = (id, updates) => setUserState(current => ({ ...current, [id]: { ...(current[id] || {}), ...updates } }))
  const actions = useMemo(() => ({
    addJob(job) {
      const next = normalizeJob(job), validation = validateJob(next)
      if (!validation.valid) return { ok: false, message: validation.reason }
      if (jobs.some(item => duplicateKey(item) === duplicateKey(next))) return { ok: false, message: 'This job is already tracked.' }
      setManualJobs(current => [next, ...current]); return { ok: true }
    },
    updateJob(id, updates) {
      const current = jobs.find(job => job.id === id)
      if (!current) return { ok: false, message: 'Job not found.' }
      const next = normalizeJob({ ...current, ...updates })
      const validation = validateJob(next)
      if (!validation.valid) return { ok: false, message: validation.reason }
      if (manualJobs.some(job => job.id === id)) setManualJobs(items => items.map(job => job.id === id ? next : job))
      patchState(id, pickUserState(next)); return { ok: true }
    },
    startApplication(id) {
      const job = jobs.find(item => item.id === id), url = job?.applyUrl || job?.url
      if (!job || !validateJobUrl(url)) return { ok: false, message: 'Application URL unavailable.' }
      if (job.applicationDate || applicationStatuses.filter(status => status !== 'Application Started').includes(job.status)) return { ok: false, message: 'You already applied to this job.' }
      if (job.status !== 'Application Started') {
        patchState(id, { status: 'Application Started', applicationStartedAt: new Date().toISOString(), resumeVersion: resumeLabel(activeResume(resumes)) })
      }
      return { ok: true, url, alreadyStarted: job.status === 'Application Started' }
    },
    markApplied(id) {
      const job = jobs.find(item => item.id === id)
      if (!job) return { ok: false, message: 'Job not found.' }
      if (job.applicationDate || job.status === 'Applied') return { ok: false, message: 'You already applied to this job.' }
      const applicationDate = new Date()
      const followUp = new Date(applicationDate); followUp.setDate(followUp.getDate() + 7)
      patchState(id, { status: 'Applied', applicationDate: applicationDate.toISOString(), followUpDate: followUp.toISOString().slice(0, 10), resumeVersion: job.resumeVersion || resumeLabel(activeResume(resumes)) })
      return { ok: true }
    },
    deleteJob(id) {
      if (manualJobs.some(job => job.id === id)) setManualJobs(current => current.filter(job => job.id !== id))
      else patchState(id, { hidden: true })
    },
    updateSettings(updates) { setSettings(current => ({ ...current, ...updates })) }
  }), [jobs, manualJobs, resumes])
  return <JobContext.Provider value={{ jobs, resumes, setResumes, settings, scanStatus, refreshDataset, ...refreshState, ...actions }}>{children}</JobContext.Provider>
}
export const useJobs = () => useContext(JobContext)
