import preferences from '../config/jobPreferences.js'

const text = value => String(value || '').toLowerCase()
const includesAny = (value, items) => items.some(item => text(value).includes(text(item)))
const hasExcludedExperience = value => /\b(?:senior|lead|principal|manager|architect|staff engineer)\b|\b(?:3\s*[–-]\s*5|[3-5]|10)\s*\+?\s*years?\b/i.test(value)
const blockedHosts = [['example', 'com'], ['example', 'org'], ['test', 'com'], ['local', 'host']].map(parts => parts.join('.'))

export function validateJobUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim())
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')
    return parsed.protocol === 'https:' && hostname.includes('.') && !blockedHosts.some(host => hostname === host || hostname.endsWith(`.${host}`)) && !hostname.endsWith('.invalid') && !hostname.endsWith('.test')
  } catch { return false }
}

export function validateJob(job) {
  const missing = ['title', 'company', 'location', 'source', 'url'].filter(field => !String(job?.[field] || '').trim())
  if (missing.length) return { valid: false, reason: `Missing required fields: ${missing.join(', ')}` }
  if (!validateJobUrl(job.url)) return { valid: false, reason: 'Application URL must be a real HTTPS job URL.' }
  if (job.applyUrl && !validateJobUrl(job.applyUrl)) return { valid: false, reason: 'Apply URL must be a real HTTPS URL.' }
  return { valid: true, reason: '' }
}

export function calculateMatchDetails(job, prefs = preferences) {
  const weights = { role: 25, skills: 30, experience: 20, location: 15, remote: 5, type: 5 }
  const haystack = `${job.title || ''} ${job.experience || ''} ${job.notes || ''}`
  const excluded = hasExcludedExperience(haystack)
  const roleScore = includesAny(job.title, prefs.roles) ? weights.role : 0
  const skillList = Array.isArray(job.skills) ? job.skills : String(job.skills || '').split(',')
  const matchingSkills = prefs.skills.filter(skill => includesAny(skillList.join(' '), [skill])).length
  const skillScore = Math.round(weights.skills * Math.min(matchingSkills / 4, 1))
  const experienceText = text(`${job.experience || ''} ${job.title || ''}`)
  const preferred = /\b(?:junior|entry.?level)\b|\b0\s*[–-]\s*[12]\s*years?\b|\b1\s*(?:\+|[–-]\s*2)?\s*years?\b/.test(experienceText)
  const twoYears = /\b2\s*\+?\s*years?\b/.test(experienceText)
  const experienceScore = preferred ? weights.experience : twoYears && skillScore >= 23 ? 14 : twoYears ? 7 : 0
  const locationScore = includesAny(job.location, prefs.locations) ? weights.location : 0
  const remoteScore = text(job.workMode) === 'remote' || text(job.location).includes('remote') ? weights.remote : 0
  const typeScore = includesAny(job.jobType, prefs.jobTypes) ? weights.type : 0
  const overall = excluded ? 0 : Math.min(100, roleScore + skillScore + experienceScore + locationScore + remoteScore + typeScore)
  return { role: Math.round(roleScore / weights.role * 100), skills: Math.round(skillScore / weights.skills * 100), experience: Math.round(experienceScore / weights.experience * 100), location: Math.round(locationScore / weights.location * 100), overall, excluded }
}

export function calculateMatchScore(job, prefs = preferences) { return calculateMatchDetails(job, prefs).overall }

export function duplicateKey(job) {
  const normalize = value => text(value).replace(/https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/$/, '').replace(/[^a-z0-9]/g, '')
  return [job.company, job.title, job.location, job.url].map(normalize).join('|')
}

export function deduplicateJobs(jobs) {
  const seen = new Set()
  return jobs.filter(job => { const key = duplicateKey(job); if (seen.has(key)) return false; seen.add(key); return true })
}

export function normalizeJob(job) {
  const discovered = job.dateDiscovered || job.dateFound || new Date().toISOString().slice(0, 10)
  const normalized = {
    id: String(job.id || globalThis.crypto?.randomUUID?.() || `job-${Date.now()}`),
    title: job.title?.trim() || '', company: job.company?.trim() || '', location: job.location?.trim() || '', experience: job.experience?.trim() || 'Not specified',
    skills: Array.isArray(job.skills) ? job.skills : String(job.skills || '').split(',').map(s => s.trim()).filter(Boolean), jobType: job.jobType || 'Full-time', workMode: job.workMode || 'On-site',
    source: job.source?.trim() || '', datePosted: job.datePosted || '', dateDiscovered: discovered, dateFound: discovered, url: job.url?.trim() || '', applyUrl: (job.applyUrl || job.url || '').trim(),
    status: job.status || 'New', notes: job.notes || '', resumeVersion: job.resumeVersion || ''
  }
  const matchDetails = calculateMatchDetails(normalized)
  return { ...normalized, matchScore: matchDetails.overall, matchDetails }
}
