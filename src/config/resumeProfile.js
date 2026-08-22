export const defaultResume = {
  id: 'anandha-devops-v1',
  name: 'Anandha Krishnan DevOps CV',
  version: 'v1',
  target: 'DevOps / Linux / System Administration',
  profile: 'Junior Server Administrator / DevOps-oriented experience',
  skills: ['Linux', 'AWS', 'Docker', 'Docker Compose', 'Terraform', 'Ansible', 'GitHub Actions', 'GitLab CI/CD', 'Nginx', 'Apache', 'MySQL', 'PostgreSQL', 'Bash', 'Python', 'Git'],
  status: 'Active',
  fileName: '',
  fileSize: 0,
  fileType: ''
}

export function migrateResumes(value) {
  const resumes = Array.isArray(value) ? value : []
  const migrated = resumes.map(resume => resume.id === 'resume-1' && resume.name === 'DevOps CV' ? { ...defaultResume, fileName: resume.fileName || '', fileSize: resume.fileSize || 0 } : resume)
  if (!migrated.length) return [{ ...defaultResume }]
  if (!migrated.some(resume => resume.id === defaultResume.id || resume.name === defaultResume.name)) return [{ ...defaultResume }, ...migrated]
  return migrated.map(resume => ({ target: '', status: 'Inactive', fileName: '', fileSize: 0, fileType: '', ...resume }))
}
