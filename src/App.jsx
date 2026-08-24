import { useMemo, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Bell, Bot, BriefcaseBusiness, CheckCircle2, FileText, LayoutDashboard, Menu, Settings as SettingsIcon, Star, X } from 'lucide-react'
import { useJobs } from './context/JobContext'
import { buildNotifications } from './services/notificationService'
import { storageService } from './services/storageService'
import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import Resume from './pages/Resume'
import Automation from './pages/Automation'
import Settings from './pages/Settings'

const nav=[['/','Dashboard',LayoutDashboard],['/jobs','Jobs',BriefcaseBusiness],['/saved','Saved Jobs',Star],['/applications','Applications',CheckCircle2],['/resume','Resume',FileText],['/automation','Automation',Bot],['/settings','Settings',SettingsIcon]]
export default function App(){
  const [open,setOpen]=useState(false), [jump,setJump]=useState(false), [read,setRead]=useState(()=>storageService.load('readNotifications',[]))
  const {jobs,settings}=useJobs(), location=useLocation(), notices=useMemo(()=>settings.notifications ? buildNotifications(jobs) : [],[jobs,settings.notifications]), unread=notices.filter(item=>!read.includes(item.id))
  const markRead=()=>{const ids=notices.map(item=>item.id);setRead(ids);storageService.save('readNotifications',ids)}
  const title=nav.find(([path])=>path===location.pathname)?.[1]||'JobPilot'
  return <div className="app-shell"><aside className={`sidebar ${open?'sidebar-open':''}`}><div className="brand"><span className="brand-mark">K</span><div><strong>Kisip</strong><small>JOBPILOT</small></div><button className="icon-button mobile-only" onClick={()=>setOpen(false)}><X/></button></div><nav>{nav.map(([path,label,Icon])=><NavLink key={path} to={path} end={path==='/'} onClick={()=>setOpen(false)}><Icon size={19}/><span>{label}</span>{label==='Jobs'&&unread.length>0&&<b className="nav-count">{unread.length}</b>}</NavLink>)}</nav><div className="safety-note"><CheckCircle2 size={18}/><p><strong>Manual apply only</strong><br/>You review and submit every application.</p></div></aside>{open&&<button className="scrim" onClick={()=>setOpen(false)}/>}<main><header className="topbar"><button className="icon-button mobile-only" onClick={()=>setOpen(true)}><Menu/></button><div><p className="eyebrow">CAREER COMMAND CENTER</p><h1>{title}</h1></div><div className="notification-wrap"><button className="notification" title="In-app notifications" onClick={()=>setJump(!jump)}><Bell/>{unread.length>0&&<span>{unread.length}</span>}</button>{jump&&<div className="notification-panel"><div><strong>Notifications</strong><button className="text-button" onClick={markRead}>Mark all read</button></div>{notices.slice(0,12).map(item=><div key={item.id} className={read.includes(item.id)?'read-notice':''}><span>{item.label}</span></div>)}{!notices.length&&<div>No notifications</div>}</div>}</div></header><div className="page"><Routes><Route path="/" element={<Dashboard/>}/><Route path="/jobs" element={<Jobs/>}/><Route path="/saved" element={<Jobs preset="Saved"/>}/><Route path="/applications" element={<Jobs preset="applications"/>}/><Route path="/resume" element={<Resume/>}/><Route path="/automation" element={<Automation/>}/><Route path="/settings" element={<Settings/>}/><Route path="*" element={<Navigate to="/"/>}/></Routes></div></main></div>
}
