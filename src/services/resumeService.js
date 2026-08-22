export const activeResume = resumes => resumes.find(resume => resume.status === 'Active') || resumes[0] || null
export const resumeLabel = resume => resume ? `${resume.name} ${resume.version}`.trim() : ''
