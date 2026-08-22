import { calculateMatchDetails } from './matchService.js'

const lower = value => String(value || '').toLowerCase()
const blockedHosts = [['example', 'com'], ['example', 'org'], ['test', 'com'], ['local', 'host']].map(parts => parts.join('.'))
const relatedRolePattern = /\b(devops|devsecops|cloud engineer|platform engineer|infrastructure engineer|production support engineer|technical support engineer|linux engineer|linux administrator|systems? administrator|sysadmin|server administrator|cloud support|cloud operations|operations engineer|infrastructure support|linux support|site reliability|sre)\b/i
const seniorTitlePattern = /\b(senior|sr\.?|lead|principal|staff|manager|director|head|architect|vp|vice president)\b/i
const mandatoryThreePlusPattern = /\b(?:minimum|required|requires?|at least|must have|need(?:ed)?)\s+(?:of\s+)?(?:3|three)\+?\s*years?\b|\b(?:3\+|3\s*[–-]\s*5|(?:[4-9]|10)\+?)\s*years?\s+(?:of\s+)?(?:professional|relevant|hands-on|industry|experience)\b/i

export function validateJobUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim())
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
    return parsed.protocol === 'https:' && host.includes('.') && !blockedHosts.some(item => host === item || host.endsWith(`.${item}`)) && !host.endsWith('.invalid') && !host.endsWith('.test')
  } catch { return false }
}

export function validateJob(job) {
  const missing = ['title', 'company', 'location', 'source', 'url'].filter(field => !String(job?.[field] || '').trim())
  if (missing.length) return { valid: false, reason: `Missing required fields: ${missing.join(', ')}` }
  if (!validateJobUrl(job.url)) return { valid: false, reason: 'Application URL must be a real HTTPS job URL.' }
  if (job.applyUrl && !validateJobUrl(job.applyUrl)) return { valid: false, reason: 'Apply URL must be a real HTTPS URL.' }
  return { valid: true, reason: '' }
}

export function duplicateKey(job) {
  const clean = value => lower(value).replace(/https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/$/, '').replace(/[^a-z0-9]/g, '')
  return [job.company, job.title, job.location, job.url].map(clean).join('|')
}

export function deduplicateJobs(jobs) {
  const seen = new Set()
  return jobs.filter(job => { const key = duplicateKey(job); if (seen.has(key)) return false; seen.add(key); return true })
}

export function normalizeJob(job) {
  const discovered = job.dateDiscovered || job.dateFound || new Date().toISOString().slice(0, 10)
  const normalized = {
    id: String(job.id || globalThis.crypto?.randomUUID?.() || `job-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    title: String(job.title || '').trim(), company: String(job.company || '').trim(), location: String(job.location || '').trim(),
    experience: String(job.experience || 'Not specified').trim(), salary: String(job.salary || 'Not provided').trim(),
    skills: Array.isArray(job.skills) ? job.skills : String(job.skills || '').split(',').map(value => value.trim()).filter(Boolean),
    jobType: job.jobType || 'Full-time', workMode: job.workMode || 'On-site', source: String(job.source || '').trim(),
    datePosted: job.datePosted || '', dateDiscovered: discovered, dateFound: discovered,
    url: String(job.url || '').trim(), applyUrl: String(job.applyUrl || job.url || '').trim(),
    descriptionSummary: String(job.descriptionSummary || job.notes || '').trim(), status: job.status || 'New', notes: job.notes || '',
    resumeVersion: job.resumeVersion || '', applicationDate: job.applicationDate || ''
  }
  const matchDetails = calculateMatchDetails(normalized)
  return { ...normalized, matchScore: matchDetails.overall, matchDetails }
}

export const isTargetRole = job => relatedRolePattern.test(job.title || '')
export const isClearlySenior = job => seniorTitlePattern.test(job.title || "") || /^(senior|lead|principal|staff|manager|director|executive|architect)$/i.test(job.experience || "")
export const hasMandatoryThreePlusYears = job => /^(?:3\+?|3\s*[–-]\s*5|(?:[4-9]|10)\+?)\s*years?$/i.test(job.experience || "") || mandatoryThreePlusPattern.test(`${job.experience || ""} ${job.descriptionSummary || ""}`)
export const rejectionReason = job => {
  const validation = validateJob(job)
  if (!validation.valid) return 'invalid'
  if (isClearlySenior(job)) return 'senior'
  if (hasMandatoryThreePlusYears(job)) return 'experience'
  if (!isTargetRole(job)) return 'unrelated'
  return null
}
export const isEligibleDiscoveredJob = job => rejectionReason(job) === null
export const isEligibleLocation = () => true
export const isEligibleExperience = job => !isClearlySenior(job) && !hasMandatoryThreePlusYears(job)
export const sortJobs = jobs => [...jobs].sort((a, b) => b.matchScore - a.matchScore || new Date(b.dateDiscovered || 0) - new Date(a.dateDiscovered || 0))
export function dashboardCounters(jobs, now = new Date()) {
  const today = now.toISOString().slice(0, 10); const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 7); const status = name => jobs.filter(job => job.status === name).length
  return { total: jobs.length, today: jobs.filter(job => job.dateDiscovered === today).length, week: jobs.filter(job => new Date(job.dateDiscovered) >= cutoff).length, new: status('New'), good: jobs.filter(job => job.matchScore >= 80).length, excellent: jobs.filter(job => job.matchScore >= 90).length, remote: jobs.filter(job => job.workMode === 'Remote' || /remote/i.test(job.location)).length, saved: status('Saved'), applied: status('Applied'), interviews: status('Interview'), rejected: status('Rejected'), offers: status('Offer') }
}
