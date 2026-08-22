import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import preferences from '../src/config/jobPreferences.js'
import { deduplicateJobs, normalizeJob, validateJob } from '../src/lib/jobs.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readJson = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'))
const sources = await readJson('src/data/sources.json')
const existing = await readJson('src/data/jobs.json')
const today = new Date().toISOString().slice(0, 10)
const targetRole = /\b(devops|site reliability|\bsre\b|linux administrator|system administrator|server administrator|cloud support|cloud operations|infrastructure support|linux support)\b/i
const eligibleLocation = /\b(worldwide|anywhere|global|india|asia|kerala|kochi|bengaluru|bangalore|chennai|hyderabad)\b/i
const stripHtml = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
const detectSkills = value => preferences.skills.filter(skill => new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(value))
const detectExperience = value => value.match(/\b(?:0\s*[–-]\s*2|0\s*[–-]\s*1|1\s*[–-]\s*2|1\+?|2\+?)\s*years?\b/i)?.[0] || (/(?:junior|entry.?level)/i.test(value) ? 'Entry Level / Junior' : 'Not specified')
const jobType = value => ({ full_time: 'Full-time', contract: 'Contract', internship: 'Internship', part_time: 'Part-time', freelance: 'Contract' }[value] || 'Full-time')

function adaptRemotive(row, source) {
  const description = stripHtml(row.description)
  return {
    id: `remotive-${row.id}`, title: row.title, company: row.company_name, location: row.candidate_required_location || 'Remote', experience: detectExperience(`${row.title} ${description}`),
    skills: detectSkills(`${row.title} ${description}`), jobType: jobType(row.job_type), workMode: 'Remote', source: source.name, datePosted: String(row.publication_date || '').slice(0, 10),
    dateDiscovered: today, url: row.url, applyUrl: row.url, status: 'New', notes: 'Public API listing. Application remains manual.', resumeVersion: ''
  }
}

async function fetchSource(source) {
  const headers = { Accept: 'application/json', 'User-Agent': 'Kisip-JobPilot/1.0 permitted-public-feed-reader' }
  if (source.apiKeyEnv) {
    const key = process.env[source.apiKeyEnv]
    if (!key) throw new Error(`Missing repository secret: ${source.apiKeyEnv}`)
    headers.Authorization = `Bearer ${key}`
  }
  const response = await fetch(source.url, { headers, signal: AbortSignal.timeout(20000) })
  if (!response.ok) throw new Error(`${source.name}: HTTP ${response.status}`)
  const payload = await response.json()
  if (source.type === 'remotive') return (payload.jobs || []).map(row => adaptRemotive(row, source))
  throw new Error(`${source.name}: unsupported source adapter ${source.type}`)
}

const enabled = sources.filter(source => source.enabled && source.permitted)
if (sources.some(source => source.enabled && !source.permitted)) throw new Error('Enabled sources must be explicitly marked permitted.')
const discovered = []
for (const source of enabled) {
  const rows = await fetchSource(source)
  discovered.push(...rows.filter(job => targetRole.test(`${job.title} ${job.notes}`) && eligibleLocation.test(job.location)))
}

const rejected = []
const normalizeValid = job => {
  const normalized = normalizeJob(job)
  const validation = validateJob(normalized)
  if (!validation.valid) { rejected.push(`${job.source || 'Unknown source'}: ${validation.reason}`); return null }
  return normalized
}
const validExisting = existing.map(normalizeValid).filter(Boolean)
const validDiscovered = discovered.map(normalizeValid).filter(Boolean).filter(job => !job.matchDetails.excluded)
const merged = deduplicateJobs([...validDiscovered, ...validExisting])
const duplicateCount = validDiscovered.length + validExisting.length - merged.length
await fs.writeFile(path.join(root, 'src/data/jobs.json'), `${JSON.stringify(merged, null, 2)}\n`)
console.log(`Scan complete: ${validDiscovered.length} valid target jobs, ${rejected.length} invalid rejected, ${duplicateCount} duplicates removed, ${validDiscovered.filter(job => job.matchScore >= 80).length} high match.`)
