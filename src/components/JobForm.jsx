import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useJobs } from '../context/JobContext'

const blank = { title: '', company: '', location: '', experience: '1 Year', skills: '', jobType: 'Full-time', workMode: 'Remote', source: 'Manual link', url: '', datePosted: '', notes: '', resumeVersion: '' }
export default function JobForm({ job, onClose }) {
  const { addJob, updateJob, resumes } = useJobs(); const [form, setForm] = useState(blank); const [error, setError] = useState('')
  useEffect(() => setForm(job ? { ...job, skills: job.skills.join(', ') } : blank), [job])
  const change = event => setForm({ ...form, [event.target.name]: event.target.value })
  const submit = event => {
    event.preventDefault(); setError('')
    const payload = { ...form, skills: form.skills.split(',').map(skill => skill.trim()).filter(Boolean) }
    const result = job ? updateJob(job.id, payload) : addJob(payload)
    if (!result.ok) return setError(result.message)
    onClose()
  }
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><form className="modal" onSubmit={submit}><div className="modal-head"><div><p className="eyebrow">MANUAL & SAFE</p><h2>{job ? 'Edit job' : 'Add a real job link'}</h2></div><button type="button" className="icon-button" onClick={onClose}><X/></button></div>
    {error && <p className="form-error">{error}</p>}<div className="form-grid"><label>Job title<input required name="title" value={form.title} onChange={change}/></label><label>Company<input required name="company" value={form.company} onChange={change}/></label><label>Location<input required name="location" value={form.location} onChange={change}/></label><label>Experience<input name="experience" value={form.experience} onChange={change}/></label><label>Source<select required name="source" value={form.source} onChange={change}><option>Manual link</option><option>LinkedIn (manual)</option><option>Indeed (manual)</option><option>Naukri (manual)</option><option>Company careers</option><option>Public RSS</option><option>Permitted API</option></select></label><label>Job URL<input required type="url" pattern="https://.*" name="url" value={form.url} onChange={change} placeholder="https://official-job-page…"/></label><label>Date posted<input type="date" name="datePosted" value={form.datePosted || ''} onChange={change}/></label><label>Skills (comma separated)<input name="skills" value={form.skills} onChange={change}/></label><label>Job type<select name="jobType" value={form.jobType} onChange={change}><option>Full-time</option><option>Internship</option><option>Contract</option></select></label><label>Work mode<select name="workMode" value={form.workMode} onChange={change}><option>Remote</option><option>Hybrid</option><option>On-site</option></select></label><label>Resume version<select name="resumeVersion" value={form.resumeVersion} onChange={change}><option value="">Not selected</option>{resumes.map(resume => <option key={resume.id}>{resume.name} {resume.version}</option>)}</select></label><label className="wide">Notes<textarea name="notes" value={form.notes} onChange={change}/></label></div>
    <div className="modal-actions"><button type="button" className="button" onClick={onClose}>Cancel</button><button className="button button-primary">{job ? 'Save changes' : 'Add job'}</button></div><p className="fine-print">Only real HTTPS links are accepted. JobPilot never logs in or submits an application.</p></form></div>
}
