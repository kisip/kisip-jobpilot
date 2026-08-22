import { useMemo, useState } from 'react'
import { Clock3, Database, Filter, Plus, Search } from 'lucide-react'
import { useJobs } from '../context/JobContext'
import { sortJobs } from '../services/jobService'
import scan from '../data/scan-status.json'
import sources from '../data/sources.json'
import JobForm from '../components/JobForm'
import JobTable from '../components/JobTable'

const quicks = ['All', 'Excellent Match', '80%+', 'Remote', '0–2 Years', '1–2 Years', 'New Today', 'DevOps', 'Linux Admin', 'SysAdmin', 'SRE']
const quickMatch = (job, quick) => {
  if (quick === 'All') return true
  if (quick === 'Excellent Match') return job.matchScore >= 90
  if (quick === '80%+') return job.matchScore >= 80
  if (quick === 'Remote') return job.workMode === 'Remote' || /remote/i.test(job.location)
  if (quick === 'New Today') return job.dateDiscovered === new Date().toISOString().slice(0, 10)
  if (quick === '0–2 Years') return /0\s*[–-]\s*2|junior|entry|1\s*(?:\+|year)|2\s*years?|not specified/i.test(`${job.experience} ${job.title}`)
  if (quick === '1–2 Years') return /1\s*[–-]\s*2/i.test(job.experience)
  if (quick === 'DevOps') return /devops/i.test(job.title)
  if (quick === 'Linux Admin') return /linux administrator|linux admin/i.test(job.title)
  if (quick === 'SysAdmin') return /systems? administrator|sysadmin/i.test(job.title)
  return /site reliability|\bsre\b/i.test(job.title)
}
const stamp = value => value ? new Date(value).toLocaleString() : 'Not run yet'
export default function Jobs({ preset }) {
  const { jobs } = useJobs()
  const [search, setSearch] = useState(''), [status, setStatus] = useState(preset === 'Saved' ? 'Saved' : 'All'), [mode, setMode] = useState('All'), [sort, setSort] = useState('match'), [quick, setQuick] = useState('All'), [modal, setModal] = useState(false), [edit, setEdit] = useState(null)
  const displayed = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = jobs
      .filter(job => preset === 'applications' ? ['Applied', 'Interview', 'Rejected', 'Offer'].includes(job.status) : true)
      .filter(job => status === 'All' || job.status === status)
      .filter(job => mode === 'All' || job.workMode === mode)
      .filter(job => quickMatch(job, quick))
      .filter(job => !query || [job.title, job.company, job.location, ...(job.skills || [])].join(' ').toLowerCase().includes(query))
    return sort === 'match' ? sortJobs(filtered) : [...filtered].sort((a, b) => new Date(b.dateDiscovered) - new Date(a.dateDiscovered))
  }, [jobs, preset, status, mode, search, sort, quick])
  const activeSources = sources.filter(source => source.enabled && source.permitted).length
  return <>
    <div className="discovery-status" aria-label="Discovery status">
      <article><Clock3/><span>Last job scan<strong>{stamp(scan.lastScan)}</strong></span></article>
      <article><Database/><span>Jobs currently indexed<strong>{jobs.length}</strong></span></article>
      <article><Database/><span>Sources active<strong>{activeSources}</strong></span></article>
      <article><Clock3/><span>Next scheduled scan<strong>{stamp(scan.nextScan)}</strong></span></article>
    </div>
    <div className="page-heading"><div><p>{displayed.length} jobs in the indexed dataset</p></div><button className="button button-primary" onClick={() => setModal(true)}><Plus size={18}/> Add Job Manually</button></div>
    <div className="quick-filters">{quicks.map(item => <button key={item} className={quick === item ? 'active' : ''} onClick={() => setQuick(item)}>{item}</button>)}</div>
    <div className="toolbar"><label className="search"><Search/><input aria-label="Search indexed jobs" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search indexed jobs by title, company, skill, or location…"/></label><label><Filter size={16}/><select value={status} onChange={event => setStatus(event.target.value)}><option>All</option>{['New', 'Saved', 'Applied', 'Interview', 'Rejected', 'Offer'].map(value => <option key={value}>{value}</option>)}</select></label><label><select value={mode} onChange={event => setMode(event.target.value)}><option>All</option><option>Remote</option><option>Hybrid</option><option>On-site</option></select></label><label>Sort<select value={sort} onChange={event => setSort(event.target.value)}><option value="match">Highest match, then newest</option><option value="date">Newest</option></select></label></div>
    <p className="search-note">Search filters jobs already discovered by the scheduled scan. It does not search the internet live.</p>
    <section className="panel"><JobTable jobs={displayed} onEdit={job => setEdit(job)}/></section>
    {(modal || edit) && <JobForm job={edit} onClose={() => { setModal(false); setEdit(null) }}/>}</>
}
