import { useMemo, useState } from 'react'
import { Clock3, Database, Filter, Plus, Search } from 'lucide-react'
import { useJobs } from '../context/JobContext'
import { applicationStatuses, sortJobs } from '../services/jobService'
import { filterJobs, freshnessCounts, newestFirst, quickGroups, toggleQuickFilter } from '../services/jobFilterService'
import sources from '../data/sources.json'
import JobForm from '../components/JobForm'
import JobTable from '../components/JobTable'
import ApplicationsTable from '../components/ApplicationsTable'
const quicks = ['Last 24 Hours','Last 7 Days','Excellent Match','80%+','Remote','0–2 Years','1–2 Years','DevOps','Linux Admin','SysAdmin','SRE']
const baseLocations = ['All Locations','Kerala','Kochi','Bengaluru','Chennai','Hyderabad','India','Remote','Worldwide Remote']
const baseSources = ['All Sources','Himalayas','Remotive','Jobicy','Company Careers']
const stamp = value => value ? new Date(value).toLocaleString() : 'Not run yet'
export default function Jobs({ preset }) {
  const { jobs, scanStatus: scan, refreshDataset, refreshing, lastRefresh, error: refreshError } = useJobs(), applicationOnly = preset === 'applications'
  const [search,setSearch] = useState(''), [status,setStatus] = useState(preset === 'Saved' ? 'Saved' : 'All'), [mode,setMode] = useState('All'), [source,setSource] = useState('All Sources'), [location,setLocation] = useState('All Locations'), [sort,setSort] = useState('match'), [activeQuicks,setActiveQuicks] = useState([]), [filtersOpen,setFiltersOpen] = useState(false), [modal,setModal] = useState(false), [edit,setEdit] = useState(null)
  const now = new Date(), counts = useMemo(() => freshnessCounts(jobs, now), [jobs])
  const dynamicLocations = useMemo(() => [...new Set(jobs.map(job => job.location).filter(value => value && value !== 'Not specified'))].sort(), [jobs])
  const locationOptions = [...baseLocations, ...dynamicLocations.filter(value => !baseLocations.includes(value))]
  const dynamicSources = useMemo(() => [...new Set(jobs.map(job => job.source).filter(Boolean))].sort(), [jobs])
  const sourceOptions = [...baseSources, ...dynamicSources.filter(value => !baseSources.some(item => item.toLowerCase() === value.toLowerCase()))]
  const displayed = useMemo(() => {
    const filtered = filterJobs(jobs,{search,status,mode,source,location,quicks:activeQuicks,applicationOnly},now)
    return activeQuicks.some(quick => quickGroups[quick] === 'time') || sort === 'date' ? newestFirst(filtered) : sortJobs(filtered)
  },[jobs,search,status,mode,source,location,activeQuicks,applicationOnly,sort])
  const activeSources = sources.filter(item => item.enabled && item.permitted).length
  const quickLabel = value => value === 'Last 24 Hours' ? `${value} (${counts.day})` : value === 'Last 7 Days' ? `${value} (${counts.week})` : value
  return <>
    {!applicationOnly && <div className="freshness-grid"><article><span>New in 24h</span><strong>{counts.day}</strong></article><article><span>New in 7 days</span><strong>{counts.week}</strong></article><article><span>Excellent Match</span><strong>{jobs.filter(job=>job.matchScore>=90).length}</strong></article><article><span>80%+ Matches</span><strong>{counts.high}</strong></article><article><span>Remote Jobs</span><strong>{counts.remote}</strong></article><article><span>Total Indexed</span><strong>{counts.total}</strong></article></div>}
    <div className="discovery-status" aria-label="Discovery status"><article><Clock3/><span>Last job scan<strong>{stamp(scan.lastScan)}</strong></span></article><article><Database/><span>Jobs currently indexed<strong>{jobs.length}</strong></span></article><article><Database/><span>Sources active<strong>{activeSources}</strong></span></article><article><Clock3/><span>Next scheduled scan<strong>{stamp(scan.nextScan)}</strong></span></article></div>
    <div className="page-heading"><div><p>{displayed.length} {applicationOnly ? 'applications in your pipeline' : 'jobs in the indexed dataset'}</p>{lastRefresh&&<small>Dataset checked {stamp(lastRefresh)}</small>}{refreshError&&<small className="error-text">{refreshError}</small>}</div>{!applicationOnly && <div className="button-row"><button className="button" disabled={refreshing} onClick={refreshDataset}>{refreshing?'Checking…':'Check for Latest Jobs'}</button><button className="button button-primary" onClick={() => setModal(true)}><Plus size={18}/> Add Job Manually</button></div>}</div>
    {!applicationOnly && <div className="quick-filters"><button className={!activeQuicks.length?'active':''} onClick={() => setActiveQuicks([])}>All</button>{quicks.map(item => <button key={item} className={activeQuicks.includes(item)?'active':''} onClick={() => setActiveQuicks(current => toggleQuickFilter(current,item))}>{quickLabel(item)}</button>)}</div>}
    <button className="button mobile-filter-button" onClick={() => setFiltersOpen(!filtersOpen)}><Filter size={16}/> Filters {filtersOpen ? '▲' : '▼'}</button>
    <div className={`toolbar filter-panel ${filtersOpen?'filter-panel-open':''}`}><label className="search"><Search/><input aria-label="Search indexed jobs" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search indexed jobs by title, company, skill, or location…"/></label><label>Location<select aria-label="Location filter" value={location} onChange={event=>setLocation(event.target.value)}>{locationOptions.map(value=><option key={value}>{value}</option>)}</select></label><label>Source<select aria-label="Source filter" value={source} onChange={event=>setSource(event.target.value)}>{sourceOptions.map(value=><option key={value}>{value}</option>)}</select></label><label>Status<select value={status} onChange={event=>setStatus(event.target.value)}><option>All</option>{['New','Saved',...applicationStatuses].map(value=><option key={value}>{value}</option>)}</select></label><label>Mode<select value={mode} onChange={event=>setMode(event.target.value)}><option>All</option><option>Remote</option><option>Hybrid</option><option>On-site</option><option>Not specified</option></select></label><label>Sort<select value={sort} onChange={event=>setSort(event.target.value)}><option value="match">Highest match, then newest</option><option value="date">Newest</option></select></label></div>
    <p className="search-note">Search filters jobs already discovered by the scheduled scan. It does not search the internet live.</p>
    <section className="panel">{applicationOnly ? <ApplicationsTable jobs={displayed}/> : <JobTable jobs={displayed} onEdit={job=>setEdit(job)}/>}</section>
    {(modal||edit)&&<JobForm job={edit} onClose={()=>{setModal(false);setEdit(null)}}/>}
  </>
}
