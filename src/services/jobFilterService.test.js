import { describe, expect, it } from 'vitest'
import { filterJobs, freshnessCounts, newestFirst } from './jobFilterService'
const now = new Date('2026-08-23T12:00:00Z')
const base = { status:'New',workMode:'Remote',skills:['Linux','AWS','Docker'],experience:'0–2 Years',matchScore:85,discoveredAt:'2026-08-23T10:00:00Z' }
const jobs = [
  { ...base,id:'h',title:'DevOps Engineer',company:'Alpha',location:'Bengaluru, India',source:'Himalayas',postedAt:'2026-08-23T09:00:00Z' },
  { ...base,id:'r',title:'DevOps Engineer',company:'Beta',location:'Worldwide Remote',source:'Remotive',experience:'1–2 Years',postedAt:'2026-08-23T08:00:00Z' },
  { ...base,id:'j',title:'Cloud Engineer',company:'Gamma',location:'Chennai, India',source:'Jobicy',experience:'0–2 Years',matchScore:75,postedAt:'2026-08-18T08:00:00Z',discoveredAt:'2026-08-18T10:00:00Z' },
  { ...base,id:'old',title:'Linux Engineer',experience:'3 Years',company:'Delta',location:'Kerala, India',source:'Jobicy',postedAt:'2026-08-10T08:00:00Z',discoveredAt:'2026-08-10T10:00:00Z' }
]
const run = overrides => filterJobs(jobs,{search:'',status:'All',mode:'All',source:'All Sources',location:'All Locations',quicks:[],applicationOnly:false,...overrides},now).map(job=>job.id)
describe('composable jobs filters',()=>{
  it('Last 24h + Remote',()=>expect(run({quicks:['Last 24 Hours','Remote']})).toEqual(['h','r']))
  it('Last 24h + Bengaluru',()=>expect(run({quicks:['Last 24 Hours'],location:'Bengaluru'})).toEqual(['h']))
  it('Last 7 Days + DevOps',()=>expect(run({quicks:['Last 7 Days','DevOps']})).toEqual(['h','r']))
  it('Last 7 Days + 80%+',()=>expect(run({quicks:['Last 7 Days','80%+']})).toEqual(['h','r']))
  it('Himalayas + Remote',()=>expect(run({source:'Himalayas',quicks:['Remote']})).toEqual(['h']))
  it('Remotive + DevOps',()=>expect(run({source:'Remotive',quicks:['DevOps']})).toEqual(['r']))
  it('Jobicy + 0–2 Years',()=>expect(run({source:'Jobicy',quicks:['0–2 Years']})).toEqual(['j']))
  it('counts real freshness windows and sorts newest activity first',()=>{expect(freshnessCounts(jobs,now)).toMatchObject({day:2,week:3,high:3,remote:4,total:4});expect(newestFirst(jobs).map(job=>job.id)).toEqual(['h','r','j','old'])})
})
