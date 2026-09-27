// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { discoverJobs } from './discover-jobs.js'
import { normalizeJob } from '../src/services/jobService.js'

const temporary = []
afterEach(async () => { await Promise.all(temporary.splice(0).map(root => fs.rm(root, { recursive: true, force: true }))) })
const source = name => ({ name, type: 'remotive', enabled: true, permitted: true, endpoint: `https://feeds.invalid/${name}`, attribution: name })
const row = { title: 'Junior DevOps Engineer', company_name: 'Fixture', candidate_required_location: 'India', description: 'Linux AWS Docker. 1 year', url: 'https://careers.fixture.dev/jobs/1', publication_date: '2026-09-26T00:00:00Z' }
const job = (name, extra = {}) => normalizeJob({ title: row.title, company: row.company_name, location: 'India', source: name, url: row.url, discoveredAt: '2026-09-25T00:00:00Z', ...extra })
const response = rows => ({ ok: true, status: 200, json: async () => ({ jobs: rows }) })
async function fixture(sources, existing = []) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'jobpilot-test-')); temporary.push(root)
  await fs.mkdir(path.join(root, 'src/data'), { recursive: true })
  for (const [name, data] of [['sources', sources], ['jobs', existing], ['scan-status', { lastSuccessfulScan: '2026-09-25T00:00:00Z' }]]) {
    await fs.writeFile(path.join(root, `src/data/${name}.json`), JSON.stringify(data))
  }
  return root
}
const run = (root, fetchImpl, now = new Date('2026-09-27T06:20:00Z')) => discoverJobs({ root, fetchImpl, now, log: () => {} })
describe('discovery reliability', () => {
  it('retains every prior job and reports failure when all feeds are down', async () => {
    const root = await fixture([source('A')], [job('A')])
    const result = await run(root, async () => { throw new Error('offline') })
    expect(result.exitCode).toBe(1)
    expect(result.jobs).toHaveLength(1)
    expect(result.scan).toMatchObject({ status: 'Failed', lastSuccessfulScan: '2026-09-25T00:00:00Z', lastFailedScan: '2026-09-27T06:20:00.000Z' })
    expect(JSON.parse(await fs.readFile(path.join(root, 'public/data/scan-status.json')))).toEqual(result.scan)
  })
  it('updates healthy feeds and retains failed feeds with partial-failure status', async () => {
    const root = await fixture([source('A'), source('B')], [job('B', { company: 'Old company' })])
    const result = await run(root, async url => { if (url.endsWith('/B')) throw new Error('offline'); return response([row]) })
    expect(result.jobs.map(j => j.source).sort()).toEqual(['A', 'B'])
    expect(result.scan.status).toBe('Partial failure')
    expect(result.scan.lastSuccessfulScan).toBe('2026-09-25T00:00:00Z')
    expect(result.exitCode).toBe(1)
  })
  it('retains source data if one endpoint fails, including successful empty endpoints', async () => {
    const root = await fixture([{ ...source('A'), additionalEndpoints: ['https://feeds.invalid/broken'] }], [job('A')])
    const result = await run(root, async url => { if (url.endsWith('broken')) return { ok: false, status: 503 }; return response([]) })
    expect(result.jobs).toHaveLength(1)
    expect(result.scan.sourceStats[0].status).toBe('Partial failure')
    expect(result.scan.status).toBe('Partial failure')
  })
  it('publishes a fresh timestamp with identical jobs and zero new jobs', async () => {
    const root = await fixture([source('A')])
    const first = await run(root, async () => response([row]))
    const second = await run(root, async () => response([row]), new Date('2026-09-27T12:20:00Z'))
    expect(second.jobs).toEqual(first.jobs)
    expect(second.scan).toMatchObject({ status: 'Active', newJobs: 0, lastScan: '2026-09-27T12:20:00.000Z', nextScan: '2026-09-27T18:17:00.000Z' })
    for (const name of ['jobs', 'scan-status']) expect(await fs.readFile(path.join(root, `public/data/${name}.json`), 'utf8')).toBe(await fs.readFile(path.join(root, `src/data/${name}.json`), 'utf8'))
  })
  it('retains saved and application history while removing untracked missing listings', async () => {
    const root = await fixture([source('A')], ['Saved', 'Applied', 'Interview', 'New'].map((status, i) => job('A', { status, url: `https://careers.fixture.dev/jobs/${i}`, notes: 'Keep my notes', resumeVersion: 'v2', applicationDate: status === 'Applied' ? '2026-09-25' : '' })))
    const result = await run(root, async () => response([]))
    expect(result.jobs.map(j => j.status)).toEqual(['Saved', 'Applied', 'Interview'])
    expect(result.jobs[1]).toMatchObject({ notes: 'Keep my notes', resumeVersion: 'v2', applicationDate: '2026-09-25' })
    expect(result.scan.status).toBe('Active')
  })
  it.each(['schema', 'adapter', 'disabled'])('reports %s configuration/feed failures honestly', async kind => {
    const configured = kind === 'disabled' ? [] : [{ ...source('A'), ...(kind === 'adapter' ? { type: 'unknown' } : {}) }]
    const root = await fixture(configured, [job('A')])
    const result = await run(root, async () => ({ ok: true, status: 200, json: async () => ({ unexpected: [] }) }))
    expect(result.scan.status).toBe('Failed')
    expect(result.exitCode).toBe(1)
    expect(result.jobs).toHaveLength(1)
  })
})
