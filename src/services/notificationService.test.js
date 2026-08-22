import { describe,expect,it } from 'vitest'
import { createJobNotifications } from './notificationService'
import { dashboardCounters,normalizeJob } from './jobService'
const today='2026-08-22';const job=normalizeJob({title:'Junior DevOps Engineer',company:'Cloud Co',location:'Remote, India',experience:'1 Year',skills:['Linux','AWS','Docker','Terraform'],jobType:'Full-time',workMode:'Remote',source:'Public API',dateDiscovered:today,url:'https://jobs.cloud-company.dev/roles/123'})
describe('dashboard automation',()=>{it('creates automatic counters and notifications',()=>{const counters=dashboardCounters([job],new Date(`${today}T10:00:00Z`));expect(counters).toMatchObject({total:1,today:1,new:1,good:1,excellent:1,remote:1});expect(createJobNotifications([job],today).map(x=>x.count)).toEqual([1,1,1,1])})})
