const parseDate = value => { if (!value) return null; const parsed = new Date(value); return Number.isNaN(parsed.valueOf()) ? null : parsed }
export const postedDate = job => parseDate(job.postedAt || job.datePosted)
export const discoveredDate = job => parseDate(job.discoveredAt || job.dateDiscovered)
export const jobActivityDate = job => postedDate(job) || discoveredDate(job)
const within = (date, hours, now) => Boolean(date && now - date >= 0 && now - date <= hours * 3600000)
export const isNewlyPosted = (job, hours, now = new Date()) => within(postedDate(job), hours, now)
export const isNewlyDiscovered = (job, hours, now = new Date()) => within(discoveredDate(job), hours, now)
// Compatibility for callers using posting freshness: no discovery-time fallback.
export const isWithinHours = isNewlyPosted
export const formatRelativeDate = (value,now=new Date()) => { const date=parseDate(value);if(!date)return'Not specified';const seconds=Math.round((now-date)/1000);if(seconds>=0&&seconds<60)return'just now';if(seconds>=0&&seconds<3600){const minutes=Math.floor(seconds/60);return`${minutes} minute${minutes===1?'':'s'} ago`}if(seconds>=0&&seconds<86400){const hours=Math.floor(seconds/3600);return`${hours} hour${hours===1?'':'s'} ago`}return date.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) }
export const postedDisplay=(job,now=new Date())=>({value:formatRelativeDate(job.postedAt||job.datePosted,now),fallbackUsed:false})
export const foundDisplay=(job,now=new Date())=>formatRelativeDate(job.discoveredAt||job.dateDiscovered,now)
