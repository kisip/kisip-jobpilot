import { ExternalLink } from 'lucide-react'
import { useJobs } from '../context/JobContext'
import { applicationStatuses, validateJobUrl } from '../services/jobService'
import { formatRelativeDate } from '../services/dateService'

const followUpLabel = value => {
  if (!value) return 'Not scheduled'
  const days = Math.ceil((new Date(value).setHours(23,59,59,999) - Date.now()) / 86400000)
  return days > 0 ? `Follow-up due in ${days} day${days===1?'':'s'}` : days === 0 ? 'Follow-up due today' : `Follow-up overdue by ${Math.abs(days)} day${days===-1?'':'s'}`
}
export default function ApplicationsTable({ jobs }) {
  const { updateJob } = useJobs()
  if (!jobs.length) return <div className="empty"><div className="empty-icon">⌁</div><h3>No applications started yet.</h3><p>Use Apply on a job to begin the manual application flow.</p></div>
  return <div className="table-wrap"><table className="applications-table"><thead><tr><th>Job / Company</th><th>Source</th><th>Location</th><th>Application date</th><th>Resume used</th><th>Match</th><th>Status</th><th>Original URL</th><th>Notes</th><th>Follow-up</th></tr></thead><tbody>{jobs.map(job => <tr key={job.id}><td><strong>{job.title}</strong><small>{job.company}</small></td><td><span className="source-badge">{job.source}</span></td><td>{job.location}</td><td>{formatRelativeDate(job.applicationDate || job.applicationStartedAt)}<small>{job.applicationDate ? 'Submitted' : 'Started'}</small></td><td>{job.resumeVersion || 'Not specified'}</td><td>{job.matchScore}%</td><td><select aria-label={`Status for ${job.title}`} value={job.status} onChange={event => updateJob(job.id,{status:event.target.value})}>{applicationStatuses.map(status => <option key={status}>{status}</option>)}</select></td><td>{validateJobUrl(job.url) ? <a href={job.url} target="_blank" rel="noreferrer">Open <ExternalLink size={13}/></a> : 'Unavailable'}</td><td><textarea aria-label={`Notes for ${job.title}`} value={job.notes} onChange={event => updateJob(job.id,{notes:event.target.value})}/></td><td><strong>{followUpLabel(job.followUpDate)}</strong><input aria-label={`Follow-up for ${job.title}`} type="date" value={job.followUpDate || ''} onChange={event => updateJob(job.id,{followUpDate:event.target.value})}/></td></tr>)}</tbody></table></div>
}
