import { useState } from 'react'
import { ExternalLink, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useJobs } from '../context/JobContext'
import { validateJobUrl } from '../lib/jobs'

const nextActions = [['Saved', 'Save'], ['Applied', 'Applied'], ['Interview', 'Interview'], ['Rejected', 'Reject'], ['Offer', 'Offer']]
const formatDate = value => value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not provided'
export default function JobTable({ jobs, onEdit }) {
  const { updateJob, deleteJob } = useJobs(); const [menu, setMenu] = useState(null)
  if (!jobs.length) return <div className="empty"><BriefcaseIcon/><h3>No real jobs discovered yet.</h3><p>Configure a permitted job source or add a job URL manually.</p></div>
  return <div className="table-wrap"><table><thead><tr><th>Job</th><th>Experience</th><th>Source</th><th>Posted</th><th>Discovered</th><th>Match</th><th>Status</th><th>Actions</th></tr></thead><tbody>{jobs.map(job => { const viewOk = validateJobUrl(job.url); const applyUrl = job.applyUrl || job.url; const applyOk = validateJobUrl(applyUrl); return <tr key={job.id}>
    <td><div className="job-title"><span className="company-logo">{job.company.slice(0, 1)}</span><div><strong>{job.title}</strong><small>{job.company}</small><small>{job.location} · {job.workMode}</small><div className="tag-row">{job.skills.slice(0, 3).map(s => <span key={s}>{s}</span>)}</div></div></div></td>
    <td>{job.experience}<small>{job.jobType}</small></td><td><strong>{job.source}</strong></td><td>{formatDate(job.datePosted)}</td><td>{formatDate(job.dateDiscovered)}</td>
    <td><div className="match-cell"><div className={`score score-${job.matchScore >= 80 ? 'high' : job.matchScore >= 60 ? 'mid' : 'low'}`} title={`Role ${job.matchDetails?.role ?? 0}% · Skills ${job.matchDetails?.skills ?? 0}% · Experience ${job.matchDetails?.experience ?? 0}% · Location ${job.matchDetails?.location ?? 0}%`}>{job.matchScore}%</div>{job.matchScore >= 90 ? <small className="match-label excellent">Excellent Match</small> : job.matchScore >= 80 ? <small className="match-label good">Good Match</small> : null}</div></td><td><span className={`status status-${job.status.toLowerCase()}`}>{job.status}</span></td>
    <td><div className="actions action-buttons">{viewOk ? <a className="button compact" href={job.url} target="_blank" rel="noopener noreferrer">View Job <ExternalLink size={14}/></a> : <button className="button compact" disabled>Application URL unavailable</button>}{applyOk ? <a className="button button-primary compact" href={applyUrl} target="_blank" rel="noopener noreferrer">Apply <ExternalLink size={14}/></a> : <button className="button compact" disabled>Application URL unavailable</button>}<button className="icon-button" onClick={() => setMenu(menu === job.id ? null : job.id)} aria-label="More actions"><MoreHorizontal/></button>{menu === job.id && <div className="action-menu">{nextActions.map(([status,label]) => <button key={status} onClick={() => { updateJob(job.id, { status }); setMenu(null) }}>{label}</button>)}<button onClick={() => { onEdit(job); setMenu(null) }}><Pencil size={14}/> Edit</button><button className="danger" onClick={() => { if (confirm('Delete this job?')) deleteJob(job.id) }}><Trash2 size={14}/> Delete</button></div>}</div></td>
  </tr>})}</tbody></table></div>
}
function BriefcaseIcon() { return <div className="empty-icon">⌁</div> }
