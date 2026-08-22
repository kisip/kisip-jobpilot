import { describe, expect, it } from 'vitest'
import { calculateMatchDetails, calculateMatchScore, deduplicateJobs, normalizeJob, validateJob, validateJobUrl } from './jobs'

const target = { title: 'Junior DevOps Engineer', company: 'Real Company', location: 'Remote, India', experience: '1–2 Years', skills: ['Linux', 'AWS', 'Docker', 'Git'], jobType: 'Full-time', workMode: 'Remote', source: 'Remotive Public API', url: 'https://remotive.com/remote-jobs/devops/sample-role-123' }
const placeholder = (...parts) => `https://${parts.join('.')}/job/1`
describe('job utilities', () => {
  it('scores a strong one-year target as excellent', () => { const details = calculateMatchDetails(target); expect(details.experience).toBe(100); expect(details.overall).toBeGreaterThanOrEqual(90) })
  it.each(['1 Year', '1+ Year', '0–1 Years', '0–2 Years', '1–2 Years', 'Entry Level'])("gives highest experience priority to %s", experience => expect(calculateMatchDetails({ ...target, title: 'DevOps Engineer', experience }).experience).toBe(100))
  it('keeps a two-year role eligible when skills match strongly', () => { const strong = calculateMatchDetails({ ...target, title: 'DevOps Engineer', experience: '2+ Years' }); const weak = calculateMatchDetails({ ...target, title: 'DevOps Engineer', experience: '2+ Years', skills: ['Linux'] }); expect(strong.experience).toBe(70); expect(strong.overall).toBeGreaterThan(weak.overall); expect(strong.overall).toBeGreaterThanOrEqual(80) })
  it.each(['Senior DevOps Engineer', 'Lead Linux Administrator', 'Principal SRE', 'Staff Engineer'])("excludes %s", title => expect(calculateMatchScore({ ...target, title })).toBe(0))
  it.each(['3 Years', '3–5 Years', '5+ Years', '10+ Years'])("excludes %s requirements", experience => expect(calculateMatchScore({ ...target, title: 'DevOps Engineer', experience })).toBe(0))
  it('removes normalized duplicates', () => expect(deduplicateJobs([target, { ...target, id: 'two', url: `${target.url}/` }])).toHaveLength(1))
  it('normalizes dates and match details', () => { const job = normalizeJob(target); expect(job.status).toBe('New'); expect(job.matchDetails.experience).toBe(100); expect(job.dateDiscovered).toMatch(/^\d{4}-\d{2}-\d{2}$/) })
  it('accepts only valid HTTPS job URLs', () => { expect(validateJobUrl(target.url)).toBe(true); expect(validateJobUrl('http://remotive.com/job/1')).toBe(false); expect(validateJobUrl(placeholder('local', 'host'))).toBe(false); expect(validateJobUrl('not-a-url')).toBe(false) })
  it('requires the production job fields', () => { expect(validateJob(target).valid).toBe(true); expect(validateJob({ ...target, company: '' }).reason).toContain('company'); expect(validateJob({ ...target, url: placeholder('test', 'com') }).valid).toBe(false) })
})
