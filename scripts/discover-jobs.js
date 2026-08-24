import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import preferences from '../src/config/jobPreferences.js'
import { deduplicateJobs, duplicateKey, normalizeJob, rejectionReason, validateJob } from '../src/services/jobService.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readJson = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'))
const sources = await readJson('src/data/sources.json')
const existing = await readJson('src/data/jobs.json')
let previousScan = {}
try { previousScan = await readJson('src/data/scan-status.json') } catch {}
const now = new Date()
const today = now.toISOString().slice(0, 10)
const stripHtml = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/&(?:amp|#038);/gi, '&').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim()
const summarize = value => stripHtml(value).slice(0, 500)
const detectSkills = value => preferences.skills.filter(skill => String(value).toLowerCase().includes(skill.toLowerCase()))
const detectExperience = value => String(value).match(/\b(?:0\s*[–-]\s*2|0\s*[–-]\s*1|1\s*[–-]\s*2|1\+?|2\+?|3\+?|3\s*[–-]\s*5)\s*years?\b/i)?.[0] || String(value).match(/\b(?:junior|entry.?level|senior|lead|principal|staff|manager|director|architect)\b/i)?.[0] || 'Not specified'
const normalizeType = value => {
  const text = Array.isArray(value) ? value[0] : value
  return ({ full_time: 'Full-time', 'full-time': 'Full-time', 'full time': 'Full-time', contract: 'Contract', contractor: 'Contract', internship: 'Internship', intern: 'Internship', part_time: 'Part-time', 'part-time': 'Part-time' })[String(text || '').toLowerCase()] || 'Full-time'
}
const dateIso = value => {
  if (!value) return ''
  if (typeof value === 'number' || /^\d{10,13}$/.test(String(value))) {
    const numeric = Number(value)
    return new Date(numeric > 1e12 ? numeric : numeric * 1000).toISOString()
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.valueOf()) ? '' : parsed.toISOString()
}
const salary = (min, max, currency = '') => min || max ? [currency, min && Number(min).toLocaleString('en-US'), max && `- ${Number(max).toLocaleString('en-US')}`].filter(Boolean).join(' ') : 'Not provided'
const locationText = value => Array.isArray(value) ? value.map(item => typeof item === 'string' ? item : item?.name || item?.slug).filter(Boolean).join(', ') : String(value || '')
const common = (row, source, text) => ({
  title: row.title, company: row.company, location: locationText(row.location) || 'Worldwide', experience: row.experience || detectExperience(text),
  salary: row.salary || 'Not provided', skills: detectSkills(text), jobType: row.jobType || 'Full-time', workMode: row.workMode || 'Remote', source: source.name,
  datePosted: dateIso(row.datePosted).slice(0, 10), postedAt: dateIso(row.datePosted), dateDiscovered: today, discoveredAt: now.toISOString(), url: row.url, applyUrl: row.applyUrl || row.url,
  descriptionSummary: summarize(row.summary || text), status: 'New', notes: `${source.attribution}. Final application remains manual.`, resumeVersion: ''
})
function adaptRemotive(row, source) {
  const text = `${row.title} ${(row.tags || []).join(' ')} ${stripHtml(row.description)}`
  return common({ title: row.title, company: row.company_name, location: row.candidate_required_location || 'Worldwide', experience: detectExperience(text), salary: row.salary, jobType: normalizeType(row.job_type), datePosted: row.publication_date, url: row.url, summary: row.description }, source, text)
}
function adaptHimalayas(row, source) {
  const text = `${row.title} ${(row.seniority || []).join(' ')} ${(row.categories || []).join(' ')} ${stripHtml(row.description)}`
  return common({ title: row.title, company: row.companyName, location: row.locationRestrictions, experience: detectExperience(text), salary: salary(row.minSalary, row.maxSalary, row.currency), jobType: normalizeType(row.employmentType), datePosted: row.pubDate, url: row.applicationLink, summary: row.excerpt || row.description }, source, text)
}
function adaptJobicy(row, source) {
  const text = `${row.jobTitle} ${row.jobLevel || ''} ${(row.jobIndustry || []).join(' ')} ${stripHtml(row.jobDescription)}`
  return common({ title: row.jobTitle, company: row.companyName, location: row.jobGeo || 'Worldwide', experience: detectExperience(text), salary: salary(row.annualSalaryMin, row.annualSalaryMax, row.salaryCurrency), jobType: normalizeType(row.jobType), datePosted: row.pubDate, url: row.url, summary: row.jobExcerpt || row.jobDescription }, source, text)
}
const adapters = { remotive: adaptRemotive, himalayas: adaptHimalayas, jobicy: adaptJobicy }
async function fetchSource(source) {
  const stats = { name: source.name, status: 'OK', requests: 0, httpStatus: [], rawJobs: 0, normalizedJobs: 0, invalidRejected: 0, unrelatedRejected: 0, seniorRejected: 0, experienceRejected: 0, duplicatesRemoved: 0, eligibleJobs: 0, errors: [] }
  const rows = []
  const endpoints = [source.endpoint, ...(source.additionalEndpoints || [])]
  for (const endpoint of endpoints) {
    try {
      const headers = { Accept: 'application/json', 'User-Agent': 'Kisip-JobPilot/2.1 permitted-public-feed-reader' }
      if (source.requiresSecret) {
        const key = process.env[source.apiKeyEnv]
        if (!key) throw new Error(`Missing repository secret: ${source.apiKeyEnv}`)
        headers.Authorization = `Bearer ${key}`
      }
      stats.requests += 1
      const response = await fetch(endpoint, { headers, signal: AbortSignal.timeout(30000) })
      stats.httpStatus.push(response.status)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const payload = await response.json()
      if (!Array.isArray(payload.jobs)) throw new Error('Response schema has no jobs array')
      stats.rawJobs += payload.jobs.length
      rows.push(...payload.jobs.map(row => adapters[source.type](row, source)))
    } catch (error) { stats.errors.push(error.message); stats.status = 'Failed' }
  }
  return { rows, stats }
}

const enabled = sources.filter(source => source.enabled && source.permitted)
if (sources.some(source => source.enabled && !source.permitted)) throw new Error('Enabled sources must be explicitly marked permitted.')
const discovered = []
const sourceStats = []
for (const source of enabled) {
  if (!adapters[source.type]) { sourceStats.push({ name: source.name, requests: 0, httpStatus: [], rawJobs: 0, errors: [`Unsupported adapter: ${source.type}`] }); continue }
  const result = await fetchSource(source)
  discovered.push(...result.rows)
  sourceStats.push(result.stats)
}

const rejectionCounts = { invalid: 0, unrelated: 0, senior: 0, experience: 0, location: 0 }
const statsBySource = new Map(sourceStats.map(source => [source.name, source]))
const normalizedValid = []
for (const raw of discovered) {
  const job = normalizeJob(raw)
  const validation = validateJob(job)
  const source = statsBySource.get(job.source)
  if (!validation.valid) { rejectionCounts.invalid += 1; if (source) source.invalidRejected += 1; continue }
  if (source) source.normalizedJobs += 1
  normalizedValid.push(job)
}
const uniqueDiscovered = []
const seenDiscovered = new Set()
for (const job of normalizedValid) {
  const key = duplicateKey(job)
  if (seenDiscovered.has(key)) { rejectionCounts.duplicates = (rejectionCounts.duplicates || 0) + 1; const source = statsBySource.get(job.source); if (source) source.duplicatesRemoved += 1; continue }
  seenDiscovered.add(key)
  uniqueDiscovered.push(job)
}
const duplicatesRemoved = normalizedValid.length - uniqueDiscovered.length
const eligible = []
for (const job of uniqueDiscovered) {
  const reason = rejectionReason(job)
  const source = statsBySource.get(job.source)
  if (reason) { rejectionCounts[reason] += 1; const field = { invalid: "invalidRejected", unrelated: "unrelatedRejected", senior: "seniorRejected", experience: "experienceRejected" }[reason]; if (source && field) source[field] += 1 }
  else { eligible.push(job); if (source) source.eligibleJobs += 1 }
}
eligible.sort((a, b) => b.matchScore - a.matchScore || new Date(b.datePosted || 0) - new Date(a.datePosted || 0))

const allExisting = existing.map(normalizeJob).filter(job => validateJob(job).valid)
const existingMap = new Map(allExisting.map(job => [duplicateKey(job), job]))
const automaticSources = new Set(enabled.map(source => source.name))
const manualExisting = allExisting.filter(job => !automaticSources.has(job.source))
const tracked = eligible.map(job => {
  const previous = existingMap.get(duplicateKey(job))
  return previous ? { ...job, status: previous.status, notes: previous.notes || job.notes, resumeVersion: previous.resumeVersion, applicationDate: previous.applicationDate, applicationStartedAt: previous.applicationStartedAt, followUpDate: previous.followUpDate, discoveredAt: previous.discoveredAt?.includes('T') ? previous.discoveredAt : job.discoveredAt, dateDiscovered: previous.dateDiscovered, dateFound: previous.dateFound } : job
})
const merged = deduplicateJobs([...tracked, ...manualExisting])
const newJobs = tracked.filter(job => !existingMap.has(duplicateKey(job))).length
const errors = sourceStats.flatMap(source => source.errors.map(error => `${source.name}: ${error}`))
const allFailed = enabled.length > 0 && sourceStats.every(source => source.status === 'Failed')
const successfulScan = !allFailed
const scan = {
  status: allFailed ? 'Failed' : 'Active', automationStatus: allFailed ? 'Failed' : 'Active',
  lastSuccessfulScan: successfulScan ? now.toISOString() : previousScan.lastSuccessfulScan || '',
  lastFailedScan: errors.length ? now.toISOString() : previousScan.lastFailedScan || '',
  lastScan: now.toISOString(), nextScan: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(), sourcesChecked: enabled.length,
  sourceStats, jobsFetched: discovered.length, invalidRejected: rejectionCounts.invalid, unrelatedRejected: rejectionCounts.unrelated,
  seniorRejected: rejectionCounts.senior, experienceRejected: rejectionCounts.experience, locationRejected: rejectionCounts.location,
  duplicatesRemoved, newJobs, newJobsAdded: newJobs, jobsIndexed: merged.length,
  highMatchJobs: tracked.filter(job => job.matchScore >= 80).length, goodMatches: tracked.filter(job => job.matchScore >= 80).length,
  excellentMatchJobs: tracked.filter(job => job.matchScore >= 90).length, excellentMatches: tracked.filter(job => job.matchScore >= 90).length, errors
}
await fs.writeFile(path.join(root, 'src/data/jobs.json'), `${JSON.stringify(merged, null, 2)}\n`)
await fs.writeFile(path.join(root, 'src/data/scan-status.json'), `${JSON.stringify(scan, null, 2)}\n`)
await fs.mkdir(path.join(root, 'public/data'), { recursive: true })
await fs.writeFile(path.join(root, 'public/data/jobs.json'), `${JSON.stringify(merged, null, 2)}\n`)
await fs.writeFile(path.join(root, 'public/data/scan-status.json'), `${JSON.stringify(scan, null, 2)}\n`)
for (const source of sourceStats) console.log(`${source.name}: HTTP ${source.httpStatus.join(", ") || "none"}; ${source.rawJobs} fetched; ${source.invalidRejected} invalid; ${source.unrelatedRejected} unrelated; ${source.seniorRejected} senior; ${source.experienceRejected} experience; ${source.duplicatesRemoved} duplicates; ${source.eligibleJobs} eligible${source.errors.length ? `; errors: ${source.errors.join("; ")}` : ""}`)
console.log(`Total fetched: ${discovered.length}`)
console.log(`Invalid: ${rejectionCounts.invalid}`)
console.log(`Unrelated: ${rejectionCounts.unrelated}`)
console.log(`Senior roles: ${rejectionCounts.senior}`)
console.log(`Mandatory 3+ years: ${rejectionCounts.experience}`)
console.log(`Location rejected: ${rejectionCounts.location}`)
console.log(`Duplicates: ${duplicatesRemoved}`)
console.log(`Eligible jobs: ${eligible.length}`)
console.log(`Final indexed jobs: ${merged.length}`)
console.log(`90%+ matches: ${scan.excellentMatchJobs}`)
console.log(`80%+ matches: ${scan.highMatchJobs}`)
