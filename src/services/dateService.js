const parseDate = value => { if (!value) return null; const parsed = new Date(value); return Number.isNaN(parsed.valueOf()) ? null : parsed }
const jobDates = job => [parseDate(job.postedAt || job.datePosted), parseDate(job.discoveredAt || job.dateDiscovered)].filter(Boolean)
export const jobActivityDate = job => jobDates(job).sort((a,b)=>b-a)[0] || null
export const isWithinHours = (job,hours,now=new Date()) => jobDates(job).some(date=>{const age=now-date;return age>=0&&age<=hours*60*60*1000})
export const formatRelativeDate = (value,now=new Date()) => { const date=parseDate(value);if(!date)return'Not specified';const seconds=Math.round((now-date)/1000);if(seconds>=0&&seconds<60)return'just now';if(seconds>=0&&seconds<3600){const minutes=Math.floor(seconds/60);return`${minutes} minute${minutes===1?'':'s'} ago`}if(seconds>=0&&seconds<86400){const hours=Math.floor(seconds/3600);return`${hours} hour${hours===1?'':'s'} ago`}return date.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) }
export const postedDisplay=(job,now=new Date())=>({value:formatRelativeDate(job.postedAt||job.datePosted,now),fallbackUsed:!parseDate(job.postedAt||job.datePosted)&&Boolean(parseDate(job.discoveredAt||job.dateDiscovered))})
export const foundDisplay=(job,now=new Date())=>formatRelativeDate(job.discoveredAt||job.dateDiscovered,now)
