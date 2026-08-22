import { useState } from 'react'
import { CheckCircle2, FilePenLine, FileText, Plus, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { useJobs } from '../context/JobContext'
import { deleteResumeFile, formatFileSize, saveResumeFile } from '../lib/resumeFiles'

const emptyForm = { name: '', version: '', target: 'DevOps / Linux / System Administration', profile: 'Junior Server Administrator / DevOps-oriented experience', skills: '' }
export default function Resume() {
  const { resumes, setResumes, jobs } = useJobs(); const [form, setForm] = useState(emptyForm); const [editingId, setEditingId] = useState(null); const [message, setMessage] = useState('')
  const updateResume = (id, updates) => setResumes(current => current.map(resume => resume.id === id ? { ...resume, ...updates } : resume))
  const selectPdf = async (resume, file) => {
    setMessage('')
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return setMessage('Please select a PDF file.')
    try {
      await saveResumeFile(resume.id, file)
      updateResume(resume.id, { fileName: file.name, fileSize: file.size, fileType: file.type || 'application/pdf' })
      setMessage(`${file.name} is stored privately in this browser.`)
    } catch (error) { setMessage(error.message) }
  }
  const setActive = id => setResumes(current => current.map(resume => ({ ...resume, status: resume.id === id ? 'Active' : 'Inactive' })))
  const beginEdit = resume => { setEditingId(resume.id); setForm({ name: resume.name, version: resume.version, target: resume.target || '', profile: resume.profile || '', skills: resume.skills.join(', ') }); setMessage('') }
  const submit = event => {
    event.preventDefault()
    const details = { ...form, skills: form.skills.split(',').map(skill => skill.trim()).filter(Boolean) }
    if (editingId) updateResume(editingId, details)
    else setResumes(current => [...current, { ...details, id: crypto.randomUUID(), status: current.some(resume => resume.status === 'Active') ? 'Inactive' : 'Active', fileName: '', fileSize: 0, fileType: '' }])
    setEditingId(null); setForm(emptyForm); setMessage(editingId ? 'Resume details updated.' : 'Resume version added.')
  }
  const remove = async resume => {
    if (!confirm(`Delete ${resume.name} ${resume.version}?`)) return
    try { await deleteResumeFile(resume.id) } catch { /* metadata can still be removed if private storage is unavailable */ }
    setResumes(current => { const remaining = current.filter(item => item.id !== resume.id); if (resume.status === 'Active' && remaining.length) remaining[0] = { ...remaining[0], status: 'Active' }; return remaining })
    if (editingId === resume.id) { setEditingId(null); setForm(emptyForm) }
  }
  return <><div className="privacy-banner"><ShieldCheck/><div><strong>Your PDF stays on this device</strong><p>Files are saved in browser-local IndexedDB. Nothing is uploaded to GitHub Pages or this repository.</p></div></div><div className="resume-layout"><section className="panel"><div className="section-head"><div><p className="eyebrow">RESUME LIBRARY</p><h3>Professional versions</h3></div><span>{resumes.length} version{resumes.length === 1 ? '' : 's'}</span></div>{message && <p className="resume-message" role="status">{message}</p>}<div className="resume-cards">{resumes.map(resume => <article className={`resume-card ${resume.status === 'Active' ? 'active' : ''}`} key={resume.id}><div className="resume-card-head"><span className="resume-file-icon"><FileText/></span><div><strong>{resume.name}</strong><small>{resume.version}</small></div><span className={`resume-status ${resume.status === 'Active' ? 'active' : ''}`}>{resume.status || 'Inactive'}</span></div><dl><div><dt>Profile</dt><dd>{resume.profile || 'Not specified'}</dd></div><div><dt>Target</dt><dd>{resume.target || 'Not specified'}</dd></div><div><dt>Skills</dt><dd><span className="tag-row">{resume.skills.map(skill => <span key={skill}>{skill}</span>)}</span></dd></div><div><dt>Selected PDF</dt><dd>{resume.fileName ? <><strong>{resume.fileName}</strong><small>{formatFileSize(resume.fileSize)}</small></> : 'No PDF selected'}</dd></div><div><dt>Applications</dt><dd>{jobs.filter(job => job.resumeVersion === `${resume.name} ${resume.version}`).length}</dd></div></dl><div className="resume-actions"><label className="button button-primary compact"><Upload size={15}/>{resume.fileName ? 'Replace PDF' : 'Select PDF'}<input className="visually-hidden" type="file" accept="application/pdf,.pdf" onChange={event => selectPdf(resume, event.target.files?.[0])}/></label><button className="button compact" disabled={resume.status === 'Active'} onClick={() => setActive(resume.id)}><CheckCircle2 size={15}/> Set as Active</button><button className="button compact" onClick={() => beginEdit(resume)}><FilePenLine size={15}/> Edit Details</button><button className="button compact danger-button" onClick={() => remove(resume)}><Trash2 size={15}/> Delete Version</button></div></article>)}</div>{!resumes.length && <div className="empty"><FileText/><h3>No resume versions</h3><p>Add a version using the form.</p></div>}</section><form className="panel simple-form resume-form" onSubmit={submit}><p className="eyebrow">{editingId ? 'EDIT DETAILS' : 'FUTURE VERSION'}</p><h3>{editingId ? 'Update resume' : 'Add resume version'}</h3><label>Resume name<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}/></label><label>Version<input required value={form.version} placeholder="v2" onChange={event => setForm({ ...form, version: event.target.value })}/></label><label>Target<input required value={form.target} onChange={event => setForm({ ...form, target: event.target.value })}/></label><label>Professional profile<input required value={form.profile} onChange={event => setForm({ ...form, profile: event.target.value })}/></label><label>Skills<textarea required value={form.skills} placeholder="Linux, AWS, Docker" onChange={event => setForm({ ...form, skills: event.target.value })}/></label><button className="button button-primary"><Plus size={17}/>{editingId ? 'Save details' : 'Add version'}</button>{editingId && <button type="button" className="button" onClick={() => { setEditingId(null); setForm(emptyForm) }}>Cancel edit</button>}<p className="fine-print">Add v2, v3, or future tailored versions. Select the private PDF from its card after saving metadata.</p></form></div></>
}
