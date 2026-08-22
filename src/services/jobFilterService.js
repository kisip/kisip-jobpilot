import { isWithinHours, jobActivityDate } from './dateService.js'
export const quickGroups = { 'Last 24 Hours':'time','Last 7 Days':'time','Excellent Match':'match','80%+':'match',Remote:'mode','0–2 Years':'experience','1–2 Years':'experience',DevOps:'role','Linux Admin':'role',SysAdmin:'role',SRE:'role' }
export function toggleQuickFilter(active, value) {
  if (value === 'All') return []
  const group = quickGroups[value]
  const withoutGroup = active.filter(item => quickGroups[item] !== group)
  return active.includes(value) ? withoutGroup : [...withoutGroup, value]
}
export const quickMatch = (job, quick, now = new Date()) => {
  if (quick === 'Last 24 Hours') return isWithinHours(job, 24, now)
  if (quick === 'Last 7 Days') return isWithinHours(job, 24 * 7, now)
  if (quick === 'Excellent Match') return job.matchScore >= 90
  if (quick === '80%+') return job.matchScore >= 80
  if (quick === 'Remote') return job.workMode === 'Remote' || /remote/i.test(job.location)
  if (quick === '0–2 Years') return /0\s*[–-]\s*2|junior|entry|1\s*(?:\+|year)|2\s*years?|not specified/i.test(`${job.experience} ${job.title}`)
  if (quick === '1–2 Years') return /1\s*[–-]\s*2/i.test(job.experience)
  if (quick === 'DevOps') return /devops/i.test(job.title)
  if (quick === 'Linux Admin') return /linux administrator|linux admin|linux engineer/i.test(job.title)
  if (quick === 'SysAdmin') return /systems? administrator|sysadmin|server administrator/i.test(job.title)
  return /site reliability|\bsre\b/i.test(job.title)
}
export const locationMatch = (job, location) => {
  if (location === 'All Locations') return true
  const value = `${job.location || ''} ${job.workMode || ''}`.toLowerCase()
  if (location === 'Remote') return /remote/.test(value)
  if (location === 'Worldwide Remote') return /remote/.test(value) && /worldwide|anywhere|global/.test(value)
  if (location === 'India') return /india|kerala|kochi|bengaluru|bangalore|chennai|hyderabad/.test(value)
  return value.includes(location.toLowerCase())
}
export function filterJobs(jobs, filters, now = new Date()) {
  const query = filters.search.trim().toLowerCase()
  return jobs.filter(job => filters.applicationOnly ? ['Application Started','Applied','Screening','Interview','Technical Interview','HR Interview','Rejected','Offer','Withdrawn'].includes(job.status) : true)
    .filter(job => filters.status === 'All' || job.status === filters.status)
    .filter(job => filters.mode === 'All' || job.workMode === filters.mode)
    .filter(job => filters.source === 'All Sources' || job.source.toLowerCase() === filters.source.toLowerCase())
    .filter(job => locationMatch(job, filters.location))
    .filter(job => filters.quicks.every(quick => quickMatch(job, quick, now)))
    .filter(job => !query || [job.title, job.company, job.location, ...(job.skills || [])].join(' ').toLowerCase().includes(query))
}
export const freshnessCounts = (jobs, now = new Date()) => ({
  day: jobs.filter(job => isWithinHours(job, 24, now)).length,
  week: jobs.filter(job => isWithinHours(job, 24 * 7, now)).length,
  high: jobs.filter(job => job.matchScore >= 80).length,
  remote: jobs.filter(job => job.workMode === 'Remote' || /remote/i.test(job.location)).length,
  total: jobs.length
})
export const newestFirst = jobs => [...jobs].sort((a, b) => (jobActivityDate(b)?.valueOf() || 0) - (jobActivityDate(a)?.valueOf() || 0))
