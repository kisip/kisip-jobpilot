import { useMemo, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { BarChart3, Bell, Bot, BriefcaseBusiness, CheckCircle2, FileText, LayoutDashboard, Menu, Settings as SettingsIcon, Star, X } from 'lucide-react'
import { useJobs } from './context/JobContext'
import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import Resume from './pages/Resume'
import Automation from './pages/Automation'
import Settings from './pages/Settings'

const nav = [
  ['/', 'Dashboard', LayoutDashboard], ['/jobs', 'Jobs', BriefcaseBusiness], ['/saved', 'Saved Jobs', Star], ['/applications', 'Applications', CheckCircle2],
  ['/resume', 'Resume', FileText], ['/automation', 'Automation', Bot], ['/settings', 'Settings', SettingsIcon]
]
export default function App() {
  const [open, setOpen] = useState(false); const { jobs } = useJobs(); const location = useLocation()
  const alerts = useMemo(() => ({ fresh: jobs.filter(j => j.status === 'New').length, high: jobs.filter(j => j.matchScore >= 80).length, remote: jobs.filter(j => j.workMode === 'Remote' && j.status === 'New').length }), [jobs])
  const title = nav.find(([path]) => path === location.pathname)?.[1] || 'JobPilot'
  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="brand"><span className="brand-mark">K</span><div><strong>Kisip</strong><small>JOBPILOT</small></div><button className="icon-button mobile-only" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button></div>
      <nav>{nav.map(([path, label, Icon]) => <NavLink key={path} to={path} end={path === '/'} onClick={() => setOpen(false)}><Icon size={19}/><span>{label}</span>{label === 'Jobs' && alerts.fresh > 0 && <b className="nav-count">{alerts.fresh}</b>}</NavLink>)}</nav>
      <div className="safety-note"><CheckCircle2 size={18}/><p><strong>Manual apply only</strong><br/>You review and submit every application.</p></div>
    </aside>
    {open && <button className="scrim" onClick={() => setOpen(false)} aria-label="Close navigation"/>}
    <main><header className="topbar"><button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="Open menu"><Menu/></button><div><p className="eyebrow">CAREER COMMAND CENTER</p><h1>{title}</h1></div><div className="notification" title={`${alerts.fresh} new · ${alerts.high} high match · ${alerts.remote} remote`}><Bell/><span>{alerts.fresh}</span></div></header>
      <div className="page"><Routes><Route path="/" element={<Dashboard/>}/><Route path="/jobs" element={<Jobs/>}/><Route path="/saved" element={<Jobs preset="Saved"/>}/><Route path="/applications" element={<Jobs preset="applications"/>}/><Route path="/resume" element={<Resume/>}/><Route path="/automation" element={<Automation/>}/><Route path="/settings" element={<Settings/>}/><Route path="*" element={<Navigate to="/"/>}/></Routes></div>
    </main>
  </div>
}
