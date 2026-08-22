import { describe, expect, it } from 'vitest'
import { calculateMatchDetails, calculateMatchScore, deduplicateJobs, normalizeJob } from './jobs'

const target = { title: 'Junior DevOps Engineer', company: 'Acme', location: 'Remote, India', experience: '1–2 Years', skills: ['Linux', 'AWS', 'Docker', 'Git'], jobType: 'Full-time', workMode: 'Remote', url: 'https://acme.test/jobs/1' }

describe('job utilities', () => {
  it('scores a strong one-year target as excellent', () => {
    const details = calculateMatchDetails(target)
    expect(details.experience).toBe(100)
    expect(details.overall).toBeGreaterThanOrEqual(90)
  })
  it.each(['1 Year', '1+ Year', '0–1 Years', '0–2 Years', '1–2 Years', 'Entry Level'])("gives highest experience priority to %s", experience => {
    expect(calculateMatchDetails({ ...target, title: 'DevOps Engineer', experience }).experience).toBe(100)
  })
  it('keeps a two-year role eligible when skills match strongly', () => {
    const strong = calculateMatchDetails({ ...target, title: 'DevOps Engineer', experience: '2+ Years' })
    const weak = calculateMatchDetails({ ...target, title: 'DevOps Engineer', experience: '2+ Years', skills: ['Linux'] })
    expect(strong.experience).toBe(70)
    expect(strong.overall).toBeGreaterThan(weak.overall)
    expect(strong.overall).toBeGreaterThanOrEqual(80)
  })
  it.each(['Senior DevOps Engineer', 'Lead Linux Administrator', 'Principal SRE', 'Staff Engineer'])("excludes %s", title => expect(calculateMatchScore({ ...target, title })).toBe(0))
  it.each(['3 Years', '3–5 Years', '5+ Years', '10+ Years'])("excludes %s requirements", experience => expect(calculateMatchScore({ ...target, title: 'DevOps Engineer', experience })).toBe(0))
  it('removes exact normalized duplicates', () => expect(deduplicateJobs([target, { ...target, id: 'two', url: 'https://acme.test/jobs/1/' }])).toHaveLength(1))
  it('normalizes manual job defaults and breakdown', () => { const job = normalizeJob(target); expect(job.status).toBe('New'); expect(job.matchScore).toBeGreaterThan(0); expect(job.matchDetails.experience).toBe(100) })
})
