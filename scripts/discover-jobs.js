import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { calculateMatchScore, deduplicateJobs, normalizeJob } from '../src/lib/jobs.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readJson = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'))
const sources = await readJson('src/data/sources.json')
const existing = await readJson('src/data/jobs.json')

async function fetchJson(source) {
  const headers = { Accept: 'application/json', 'User-Agent': 'Kisip-JobPilot/1.0 safe-feed-reader' }
  if (source.apiKeyEnv) { const key = process.env[source.apiKeyEnv]; if (!key) throw new Error(`Missing repository secret: ${source.apiKeyEnv}`); headers.Authorization = `Bearer ${key}` }
  const response = await fetch(source.url, { headers, signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`${source.name}: HTTP ${response.status}`)
  const payload = await response.json(); const rows = Array.isArray(payload) ? payload : payload.jobs
  if (!Array.isArray(rows)) throw new Error(`${source.name}: expected an array or { jobs: [] }`)
  return rows.map(job => ({ ...job, source: source.name }))
}

const enabled = sources.filter(source => source.enabled && source.permitted)
const rejected = sources.filter(source => source.enabled && !source.permitted)
if (rejected.length) throw new Error('Enabled sources must be explicitly marked permitted.')
const discovered = []
for (const source of enabled) {
  if (source.type !== 'json') { console.log(`Skipping unsupported source type ${source.type} for ${source.name}; add a reviewed adapter first.`); continue }
  discovered.push(...await fetchJson(source))
}
const normalized = discovered.map(normalizeJob).map(job => ({ ...job, matchScore: calculateMatchScore(job) }))
const rescoredExisting = existing.map(normalizeJob)
const merged = deduplicateJobs([...rescoredExisting, ...normalized])
const duplicateCount = rescoredExisting.length + normalized.length - merged.length
await fs.writeFile(path.join(root, 'src/data/jobs.json'), `${JSON.stringify(merged, null, 2)}\n`)
console.log(`Scan complete: ${normalized.length} discovered, ${duplicateCount} duplicates removed, ${normalized.filter(j => j.matchScore >= 80).length} high match.`)
