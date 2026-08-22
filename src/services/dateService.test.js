import { describe,expect,it } from 'vitest'
import { formatRelativeDate,isWithinHours,postedDisplay } from './dateService'
const now=new Date('2026-08-23T12:00:00Z')
describe('job date display',()=>{it('uses useful relative time',()=>{expect(formatRelativeDate('2026-08-23T10:00:00Z',now)).toBe('2 hours ago')});it('uses discovered time for freshness when posted time is absent and labels fallback',()=>{const job={discoveredAt:'2026-08-23T11:00:00Z'};expect(isWithinHours(job,24,now)).toBe(true);expect(postedDisplay(job,now)).toEqual({value:'Not specified',fallbackUsed:true})})})
