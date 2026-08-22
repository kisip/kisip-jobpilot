import preferences from '../config/jobPreferences.js'
const lower = value => String(value || '').toLowerCase()
const aliases = { 'CI/CD':['ci/cd','continuous integration','continuous delivery','continuous deployment'], 'GitHub Actions':['github actions'], 'GitLab CI/CD':['gitlab ci','gitlab pipeline'], 'Server Administration':['server administration','server administrator','systems administration','system administrator'], 'Web Hosting':['web hosting','hosting'], 'SSL/TLS':['ssl','tls'], 'Security Hardening':['hardening','malware','security'], 'Cloud Infrastructure':['cloud infrastructure','cloud operations'], Backups:['backup','backups'], Migrations:['migration','migrations'] }
const containsTerm = (text, term) => (aliases[term] || [term]).some(candidate => lower(text).includes(lower(candidate)))
const excludedExperience = value => /\b(?:senior|lead|principal|manager|architect|staff engineer)\b|\b(?:3\s*[–-]\s*5|[3-9]|10)\s*\+?\s*years?\b/i.test(value)
export const matchCategory = score => score >= 90 ? 'Excellent Match' : score >= 80 ? 'Good Match' : score >= 70 ? 'Possible Match' : 'Low Match'
export function calculateMatchDetails(job, prefs = preferences) {
  const searchable = lower([job.title,job.descriptionSummary,job.description,job.notes,job.experience,...(job.skills||[])].join(' '))
  const matchedSkills = prefs.skills.filter(skill => containsTerm(searchable, skill))
  const roleHit = prefs.roles.some(role => lower(job.title).includes(lower(role))) || /\b(devops|site reliability|sre|linux|systems? administrator|server administrator|cloud (?:support|operations)|infrastructure support)\b/i.test(job.title||'')
  const expText = `${job.title||''} ${job.experience||''} ${job.descriptionSummary||''}`; const excluded = excludedExperience(expText)
  const preferred = /\b(?:junior|entry.?level)\b|\b0\s*[–-]\s*[12]\s*years?\b|\b1\s*(?:\+|[–-]\s*2)?\s*years?\b/i.test(expText); const twoYears=/\b2\s*\+?\s*years?\b/i.test(expText); const unspecified=/not specified/i.test(job.experience||'')
  const locationHit=prefs.locations.some(location=>lower(job.location).includes(lower(location)))||/\b(worldwide|anywhere|global|asia)\b/i.test(job.location||''); const remoteHit=lower(job.workMode)==='remote'||lower(job.location).includes('remote'); const typeHit=prefs.jobTypes.some(type=>lower(job.jobType).includes(lower(type)))
  const skills=Math.min(100,Math.round(matchedSkills.length/4*100)); const experience=excluded?0:preferred?100:twoYears&&skills>=70?70:twoYears?45:unspecified?60:35
  const details={role:roleHit?100:0,skills,experience,location:locationHit?100:0,workMode:remoteHit?100:70,jobType:typeHit?100:50,matchedSkills,excluded}
  details.overall=excluded?0:Math.min(100,Math.round(details.role*.25+details.skills*.30+details.experience*.20+details.location*.15+details.workMode*.05+details.jobType*.05)); details.category=matchCategory(details.overall)
  details.explanation=[`Role ${details.role}%: ${roleHit?'target role matched':'target role not identified'}`,`Skills ${details.skills}%: ${matchedSkills.length?matchedSkills.join(', '):'no CV skills identified'}`,`Experience ${details.experience}%: ${excluded?'senior or 3+ year requirement':preferred?'fits 0–2 years / junior level':twoYears?'2-year stretch role':'requirement not clearly stated'}`,`Location ${details.location}%: ${locationHit?'preferred or globally remote location':'outside preferred locations'}`,`Work mode ${details.workMode}%: ${job.workMode||'not specified'}`]
  return details
}
export const calculateMatchScore=(job,prefs=preferences)=>calculateMatchDetails(job,prefs).overall
