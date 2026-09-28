import { experienceRequirements } from './experienceService.js'
import { isClearlySenior } from './jobService.js'
import { remoteEligibility } from './locationService.js'
import { isWithinHours, isNewlyDiscovered, postedDate, discoveredDate } from './dateService.js'
export const quickGroups = { 'Newly posted · 24h':'time','Newly posted · 7d':'time','Newly discovered · 24h':'discovery','Newly discovered · 7d':'discovery','Last 24 Hours':'time','Last 7 Days':'time','Excellent Match':'match','80%+':'match',Remote:'mode','0–2 Years':'experience','1–2 Years':'experience',DevOps:'role','Linux Admin':'role',SysAdmin:'role',SRE:'role' }
export function toggleQuickFilter(active, value) {
  if (value === 'All') return []
  const group = quickGroups[value]
  const withoutGroup = active.filter(item => quickGroups[item] !== group)
  return active.includes(value) ? withoutGroup : [...withoutGroup, value]
}
export const quickMatch = (job, quick, now = new Date()) => {
  if (quick === 'Newly discovered · 24h') return isNewlyDiscovered(job, 24, now)
  if (quick === 'Newly discovered · 7d') return isNewlyDiscovered(job, 168, now)
  if (quick === 'Newly posted · 24h' || quick === 'Last 24 Hours') return isWithinHours(job, 24, now)
  if (quick === 'Newly posted · 7d' || quick === 'Last 7 Days') return isWithinHours(job, 24 * 7, now)
  if (quick === 'Excellent Match') return job.matchScore >= 90
  if (quick === '80%+') return job.matchScore >= 80
  if (quick === 'Remote') return job.workMode === 'Remote' || /remote/i.test(job.location)
  if (quick === '0–2 Years' || quick === '1–2 Years') {
    const { minimum } = experienceRequirements(job)
    if (isClearlySenior(job)) return false
    if (minimum !== null) return minimum >= (quick === '1–2 Years' ? 1 : 0) && minimum <= 2
    return quick === '0–2 Years' && /\bjunior\b|\bentry[ -]level\b/i.test(`${job.experience || ''} ${job.title || ''}`)
  }
  if (quick === 'DevOps') return /devops/i.test(job.title)
  if (quick === 'Linux Admin') return /linux administrator|linux admin|linux engineer/i.test(job.title)
  if (quick === 'SysAdmin') return /systems? administrator|sysadmin|server administrator/i.test(job.title)
  return /site reliability|\bsre\b/i.test(job.title)
}
export const locationMatch = (job, location) => {
  if (location === 'All Locations') return true
  const value = `${job.location || ''} ${job.workMode || ''}`.toLowerCase()
  if (location === 'Remote') return /remote/.test(value)
  if (location === 'Worldwide Remote') return /remote/.test(value) && /worldwide|anywhere|global/.test(value) && !job.countryRestrictions?.length && remoteEligibility(job).status === 'eligible' && !/except|excluding|resid|authorized to work|work authorization|remote (?:within|in|from)|must be based|candidates.*only/i.test(job.description || job.descriptionSummary || '')
  if (location === 'India') return /\b(?:india|kerala|kochi|bengaluru|bangalore|chennai|hyderabad)\b/.test(value) || job.location?.trim() === 'IN'
  return value.includes(location.toLowerCase())
}
export function filterJobs(jobs, filters, now = new Date()) {
  const query = filters.search.trim().toLowerCase()
  return jobs.filter(job => filters.applicationOnly ? ['Application Started','Applied','Screening','Interview','Technical Interview','HR Interview','Rejected','Offer','Withdrawn'].includes(job.status) : true)
    .filter(job => filters.status === 'All' || job.status === filters.status)
    .filter(job => filters.mode === 'All' || job.workMode === filters.mode)
    .filter(job => filters.source === 'All Sources' || (job.sources || [job.source]).some(source => source.toLowerCase() === filters.source.toLowerCase()))
    .filter(job => locationMatch(job, filters.location))
    .filter(job => filters.quicks.every(quick => quickMatch(job, quick, now)))
    .filter(job => !query || [job.title, job.company, job.location, ...(job.skills || [])].join(' ').toLowerCase().includes(query))
}
export const freshnessCounts = (jobs, now = new Date()) => ({
  day: jobs.filter(job => isWithinHours(job, 24, now)).length,
  week: jobs.filter(job => isWithinHours(job, 24 * 7, now)).length,
  discoveredDay: jobs.filter(job => isNewlyDiscovered(job, 24, now)).length,
  discoveredWeek: jobs.filter(job => isNewlyDiscovered(job, 168, now)).length,
  high: jobs.filter(job => job.matchScore >= 80).length,
  remote: jobs.filter(job => job.workMode === 'Remote' || /remote/i.test(job.location)).length,
  total: jobs.length
})
export const newestFirst = (jobs, basis = 'posted') => { const date = basis === 'discovered' ? discoveredDate : postedDate; return [...jobs].sort((a, b) => (date(b)?.valueOf() || 0) - (date(a)?.valueOf() || 0)) }
