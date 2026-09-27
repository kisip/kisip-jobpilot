import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export async function verifyDeployment({ baseUrl, expectedScan, expectedJobs, fetchImpl = globalThis.fetch, attempts = 12, delay = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  if (!baseUrl) throw new Error('DASHBOARD_URL is required')
  let failure
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
      const read = async name => {
        const response = await fetchImpl(`${base}data/${name}.json?v=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(15000) })
        if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`)
        return response.json()
      }
      const [scan, jobs] = await Promise.all([read('scan-status'), read('jobs')])
      if (scan.lastScan !== expectedScan.lastScan || scan.status !== expectedScan.status || JSON.stringify(jobs) !== JSON.stringify(expectedJobs)) {
        throw new Error(`Published dataset is stale or inconsistent (lastScan: ${scan.lastScan})`)
      }
      return scan.lastScan
    } catch (error) { failure = error }
    if (attempt + 1 < attempts) await delay(10000)
  }
  throw failure
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const expectedScan = JSON.parse(await fs.readFile(new URL('../public/data/scan-status.json', import.meta.url)))
  const expectedJobs = JSON.parse(await fs.readFile(new URL('../public/data/jobs.json', import.meta.url)))
  const timestamp = await verifyDeployment({ baseUrl: process.env.DASHBOARD_URL, expectedScan, expectedJobs })
  console.log(`Verified published jobs and scan timestamp: ${timestamp}`)
}
