import { useState } from 'react'
import { ExternalLink, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useJobs } from '../context/JobContext'

const nextActions = [['Saved', 'Save'], ['Applied', 'Applied'], ['Interview', 'Interview'], ['Rejected', 'Reject'], ['Offer', 'Offer']]
export default function JobTable({ jobs, onEdit }) {
  const { updateJob, deleteJob } = useJobs(); const [menu, setMenu] = useState(null)
  if (!jobs.length) return <div className="empty"><BriefcaseIcon/><h3>No matching jobs</h3><p>Try clearing filters or add a job manually.</p></div>
  return <div className="table-wrap"><table><thead><tr><th>Role</th><th>Match</th><th>Location</th><th>Type</th><th>Status</th><th>Found</th><th>Actions</th></tr></thead><tbody>{jobs.map(job => <tr key={job.id}>
    <td><div className="job-title"><span className="company-logo">{job.company.slice(0, 1)}</span><div><strong>{job.title}</strong><small>{job.company} · {job.source}</small><div className="tag-row">{job.skills.slice(0, 3).map(s => <span key={s}>{s}</span>)}</div></div></div></td>
    <td><div className="match-cell"><div className={`score score-${job.matchScore >= 80 ? 'high' : job.matchScore >= 60 ? 'mid' : 'low'}`} title={`Role ${job.matchDetails?.role ?? 0}% · Skills ${job.matchDetails?.skills ?? 0}% · Experience ${job.matchDetails?.experience ?? 0}% · Location ${job.matchDetails?.location ?? 0}%`}>{job.matchScore}%</div>{job.matchScore >= 90 ? <small className="match-label excellent">Excellent Match</small> : job.matchScore >= 80 ? <small className="match-label good">Good Match</small> : null}</div></td><td>{job.location}<small>{job.workMode}</small></td><td>{job.jobType}<small>{job.experience}</small></td><td><span className={`status status-${job.status.toLowerCase()}`}>{job.status}</span></td><td>{new Date(`${job.dateFound}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
    <td><div className="actions"><a className="button button-primary compact" href={job.url} target="_blank" rel="noopener noreferrer">View <ExternalLink size={14}/></a><button className="icon-button" onClick={() => setMenu(menu === job.id ? null : job.id)} aria-label="More actions"><MoreHorizontal/></button>{menu === job.id && <div className="action-menu">{nextActions.map(([status,label]) => <button key={status} onClick={() => { updateJob(job.id, { status }); setMenu(null) }}>{label}</button>)}<button onClick={() => { onEdit(job); setMenu(null) }}><Pencil size={14}/> Edit</button><button className="danger" onClick={() => { if (confirm('Delete this job?')) deleteJob(job.id) }}><Trash2 size={14}/> Delete</button></div>}</div></td>
  </tr>)}</tbody></table></div>
}
function BriefcaseIcon() { return <div className="empty-icon">⌁</div> }
