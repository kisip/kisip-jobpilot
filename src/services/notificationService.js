export function createJobNotifications(jobs,today=new Date().toISOString().slice(0,10)){const fresh=jobs.filter(job=>job.dateDiscovered===today&&job.status==='New');return[{id:'new',label:'New jobs discovered',count:fresh.length},{id:'good',label:'80%+ matches',count:fresh.filter(job=>job.matchScore>=80).length},{id:'excellent',label:'90%+ matches',count:fresh.filter(job=>job.matchScore>=90).length},{id:'remote',label:'New remote jobs',count:fresh.filter(job=>job.workMode==='Remote'||/remote/i.test(job.location)).length}]}
export function buildNotifications(jobs, now = new Date()) {
  const cutoff = now.getTime() - 86400000
  return jobs.flatMap(job => {
    const items = [], discovered = new Date(job.discoveredAt || 0).getTime()
    if (discovered >= cutoff) items.push({ id: `new:${job.id}`, label: `New job: ${job.title}` })
    if (discovered >= cutoff && job.matchScore >= 80) items.push({ id: `good:${job.id}`, label: `${job.matchScore}% match: ${job.title}` })
    if (discovered >= cutoff && job.matchScore >= 90) items.push({ id: `excellent:${job.id}`, label: `Excellent match: ${job.title}` })
    if (discovered >= cutoff && (job.workMode === 'Remote' || /remote/i.test(job.location))) items.push({ id: `remote:${job.id}`, label: `New remote job: ${job.title}` })
    if (job.followUpDate && new Date(job.followUpDate).getTime() <= now.getTime()) items.push({ id: `followup:${job.id}:${job.followUpDate}`, label: `Follow-up due: ${job.title}` })
    if (['Interview','Technical Interview','HR Interview'].includes(job.status)) items.push({ id: `interview:${job.id}:${job.status}`, label: `${job.status}: ${job.title}` })
    return items
  })
}
