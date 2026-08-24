const KEYS = { jobs: 'jobpilot.jobs.v1', jobUserState: 'jobpilot.job-user-state.v2', manualJobs: 'jobpilot.manual-jobs.v2', resumes: 'jobpilot.resumes.v1', settings: 'jobpilot.settings.v1', applicationProfile: 'jobpilot.application-profile.v1', seen: 'jobpilot.seen.v1', readNotifications: 'jobpilot.read-notifications.v1' }
export const load = (key, fallback) => { try { const value = localStorage.getItem(KEYS[key]); return value ? JSON.parse(value) : fallback } catch { return fallback } }
export const save = (key, value) => { try { localStorage.setItem(KEYS[key], JSON.stringify(value)); return true } catch { return false } }
export const remove = key => { try { localStorage.removeItem(KEYS[key]); return true } catch { return false } }
export const storageKeys = KEYS
