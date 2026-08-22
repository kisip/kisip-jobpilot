import { describe, expect, it } from 'vitest'
import { defaultResume, migrateResumes } from './resumeProfile'

describe('resume profile', () => {
  it('contains the CV-derived default metadata', () => { expect(defaultResume.name).toBe('Anandha Krishnan DevOps CV'); expect(defaultResume.version).toBe('v1'); expect(defaultResume.target).toBe('DevOps / Linux / System Administration'); expect(defaultResume.profile).toContain('Junior Server Administrator'); expect(defaultResume.skills).toContain('GitLab CI/CD'); expect(defaultResume.status).toBe('Active') })
  it('migrates the old generic default without removing custom versions', () => { const custom = { id: 'custom', name: 'Cloud CV', version: 'v2', skills: [] }; const result = migrateResumes([{ id: 'resume-1', name: 'DevOps CV', version: 'v1', skills: [] }, custom]); expect(result[0].name).toBe(defaultResume.name); expect(result).toContainEqual(expect.objectContaining(custom)) })
})
