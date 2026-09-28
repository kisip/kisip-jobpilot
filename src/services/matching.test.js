import { describe, expect, it } from 'vitest'
import { normalizeJob, rejectionReason, deduplicateJobs, sameListing } from './jobService'
import { experienceRequirements } from './experienceService'
import { remoteEligibility } from './locationService'
import { canonicalJobUrl } from './duplicateService'
const base = { title: 'DevOps Engineer', company: 'Fixture Cloud', location: 'India', source: 'Remotive', workMode: 'Remote', url: 'https://remotive.com/jobs/role-123', experience: 'Not specified' }
describe('requirements in full descriptions', () => {
  it.each(['Minimum of five years of professional experience required.', 'Requires 11 years of experience.', '12+ years working with Linux.', '3 to 5 years of relevant experience.', 'At least three years in DevOps required.'])('rejects a hidden requirement: %s', requirement => {
    const job = normalizeJob({ ...base, descriptionSummary: 'Junior opportunity', description: `${'About our team. '.repeat(100)}<p>${requirement}</p>` })
    expect(rejectionReason(job)).toBe('experience')
    expect(job.matchScore).toBe(0)
  })
  it.each(['Five years of experience preferred.', '<h2>Preferred qualifications</h2><ul><li>5 years of experience</li></ul>', 'Our company has 12 years of experience serving customers.', 'No minimum years of experience required.'])('does not hard-reject optional or company history: %s', description => {
    expect(rejectionReason(normalizeJob({ ...base, description }))).toBeNull()
  })
  it('uses minimum of a range and detects requirements after an earlier junior qualification', () => {
    expect(experienceRequirements({ description: '1 year of Linux experience; minimum 5 years of cloud experience required.' }).minimum).toBe(5)
    expect(experienceRequirements({ description: '1 to 3 years of experience required.' }).minimum).toBe(1)
  })
  it('handles decimal years and distinguishes optional and required clauses', () => {
    expect(experienceRequirements({ description: '1.5 years of experience required.' }).minimum).toBe(1.5)
    expect(experienceRequirements({ description: '5 years of experience preferred, 3 years of experience required.' }).minimum).toBe(3)
    expect(experienceRequirements({ description: 'Up to 5 years of experience.' }).minimum).toBeNull()
  })
  it('respects degree alternatives with a lower eligible experience route', () => {
    expect(experienceRequirements({ description: 'Bachelor degree with 5 years experience or master degree with 2 years experience.' }).minimum).toBe(2)
  })
})
describe('conservative duplicate detection', () => {
  it('merges different source URLs with the same specific application URL and keeps provenance', () => {
    const a = normalizeJob({ ...base, applyUrl: 'https://careers.fixture.dev/jobs/123?utm_source=remotive' })
    const b = normalizeJob({ ...base, source: 'Himalayas', url: 'https://himalayas.app/jobs/456', applyUrl: 'https://careers.fixture.dev/jobs/123?utm_source=himalayas' })
    const result = deduplicateJobs([a, b])
    expect(result).toHaveLength(1)
    expect(result[0].sources).toEqual(['Remotive', 'Himalayas'])
    expect(result[0].sourceUrls).toHaveLength(2)
    expect(a.sources).toEqual(['Remotive'])
  })
  it('merges a shared employer requisition but never conflicting requisitions', () => {
    expect(sameListing({ ...base, requisitionId: 'REQ-1' }, { ...base, url: 'https://other.fixture.dev/1', requisitionId: 'REQ-1' })).toBe(true)
    expect(sameListing({ ...base, requisitionId: 'REQ-1' }, { ...base, requisitionId: 'REQ-2' })).toBe(false)
  })
  it.each([
    [{ url: 'https://careers.fixture.dev/job?id=1' }, { url: 'https://careers.fixture.dev/job?id=2' }],
    [{ url: 'https://careers.fixture.dev/job?ref=1' }, { url: 'https://careers.fixture.dev/job?ref=2' }],
    [{ applyUrl: 'https://careers.fixture.dev/jobs' }, { url: 'https://himalayas.app/jobs/2', applyUrl: 'https://careers.fixture.dev/jobs' }],
    [{}, { location: 'Canada' }],
    [{}, { company: 'Different company' }],
    [{}, { title: 'Cloud Engineer' }],
    [{}, { source: 'Himalayas', url: 'https://himalayas.app/jobs/2' }]
  ])('does not merge distinct jobs despite similar metadata', (a, b) => {
    expect(deduplicateJobs([{ ...base, ...a }, { ...base, ...b }])).toHaveLength(2)
  })
  it('preserves legacy IDs and meaningful URL identity while stripping tracking', () => {
    expect(normalizeJob({ ...base, id: 'legacy-saved-id' }).id).toBe('legacy-saved-id')
    expect(canonicalJobUrl('https://www.careers.fixture.dev/job?id=1&utm_source=feed#apply')).toBe('https://careers.fixture.dev/job?id=1')
    expect(sameListing({ ...base, url: 'https://careers.fixture.dev/Jobs/A' }, { ...base, url: 'https://careers.fixture.dev/jobs/a' })).toBe(false)
  })
})
describe('remote country eligibility for India', () => {
  it.each(['United States', 'USA', 'US', 'Canada', 'Mexico', 'UK', 'Europe', 'EMEA', 'North America'])('rejects remote restriction %s', location => {
    expect(rejectionReason(normalizeJob({ ...base, location }))).toBe('location')
  })
  it.each(['India', 'IN', 'Bengaluru', 'Worldwide', 'Anywhere', 'APAC', 'United States, India', 'Worldwide except Canada'])('allows %s', location => {
    expect(remoteEligibility({ ...base, location }).status).toBe('eligible')
  })
  it('does not treat the uppercase preposition IN as the India country code', () => {
    expect(remoteEligibility({ ...base, location: 'REMOTE IN USA' }).status).toBe('ineligible')
  })
  it('honors structured restrictions and restrictions deep in full descriptions', () => {
    expect(remoteEligibility({ ...base, location: 'Worldwide', countryRestrictions: ['US', 'CA'] }).status).toBe('ineligible')
    expect(remoteEligibility({ ...base, location: 'Worldwide', description: `${'About us. '.repeat(100)} Candidates must be based in the United States.` }).status).toBe('ineligible')
    expect(remoteEligibility({ ...base, location: 'Worldwide', description: 'Applicants must reside in the U.S.' }).status).toBe('ineligible')
    expect(remoteEligibility({ ...base, location: 'Worldwide', description: 'Remote within the US only.' }).status).toBe('ineligible')
    expect(remoteEligibility({ ...base, location: 'Worldwide', description: 'Worldwide except India.' }).status).toBe('ineligible')
  })
  it('does not confuse employer offices or timezone overlap with residency', () => {
    expect(remoteEligibility({ ...base, location: 'Worldwide', description: 'Our company is based in Canada. You must be available during US hours.' }).status).toBe('eligible')
  })
  it('marks missing or unrecognized restrictions as requiring confirmation', () => {
    expect(remoteEligibility({ ...base, location: 'Remote' }).status).toBe('unknown')
    expect(remoteEligibility({ ...base, location: 'Worldwide', countryRestrictions: ['Zone X'] }).status).toBe('unknown')
    expect(normalizeJob({ ...base, location: 'Remote' }).matchDetails.location).toBe(0)
  })
})
it('keeps saved identity, notes and dates when the first duplicate is untracked', () => {
  const applyUrl = 'https://careers.fixture.dev/job?id=123'
  const fresh = normalizeJob({ ...base, applyUrl })
  const tracked = normalizeJob({ ...base, id: 'saved-legacy-id', source: 'Himalayas', url: 'https://himalayas.app/jobs/123', applyUrl, status: 'Applied', notes: 'Keep this history', applicationDate: '2026-09-01', resumeVersion: 'v2' })
  expect(deduplicateJobs([fresh, tracked])[0]).toMatchObject({ id: 'saved-legacy-id', status: 'Applied', notes: 'Keep this history', applicationDate: '2026-09-01', resumeVersion: 'v2' })
})

it('keeps earliest discovery and recognizes previously merged source URLs', () => {
  const a = { ...base, discoveredAt: '2026-09-26', sourceUrls: ['https://other.fixture.dev/jobs/2'] }
  const b = { ...base, url: 'https://other.fixture.dev/jobs/2', source: 'Himalayas', discoveredAt: '2026-09-01' }
  expect(deduplicateJobs([a, b])).toHaveLength(1)
  expect(deduplicateJobs([a, b])[0].discoveredAt).toBe('2026-09-01')
})

it('does not mistake company aspirations from a real feed for a residency restriction', () => {
  expect(remoteEligibility({ ...base, location: 'Anywhere', description: 'We expect excellence - in order to succeed, we need to be the best at what we do.' }).status).toBe('eligible')
})
