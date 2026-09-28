const clean = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
export function canonicalJobUrl(value) {
  try {
    const url = new URL(value)
    url.hostname = url.hostname.replace(/^www\./, '')
    url.hash = ''
    for (const key of [...url.searchParams.keys()]) if (/^(?:utm_.*|fbclid|gclid|referrer)$/i.test(key)) url.searchParams.delete(key)
    url.searchParams.sort()
    url.pathname = url.pathname.replace(/\/+$/, '') || '/'
    return url.href.replace(/\/$/, '')
  } catch { return String(value || '').trim() }
}
export function duplicateKey(job) {
  return [job.company, job.title, job.location].map(clean).concat(canonicalJobUrl(job.url)).join('|')
}
const specificUrl = value => {
  try { const url = new URL(value); return url.pathname.split('/').filter(Boolean).some(part => !/^(?:jobs?|careers?|apply|openings|positions)$/i.test(part)) || [...url.searchParams.keys()].some(key => /^(?:id|job_?id|gh_jid|requisition_?id|req_?id)$/i.test(key)) } catch { return false }
}
export function sameListing(a, b) {
  if (clean(a.company) !== clean(b.company) || clean(a.title) !== clean(b.title) || clean(a.location) !== clean(b.location)) return false
  if (a.countryRestrictions?.length && b.countryRestrictions?.length && JSON.stringify(a.countryRestrictions) !== JSON.stringify(b.countryRestrictions)) return false
  if (a.requisitionId && b.requisitionId && String(a.requisitionId) !== String(b.requisitionId)) return false
  if (duplicateKey(a) === duplicateKey(b)) return true
  if (a.requisitionId && b.requisitionId && String(a.requisitionId) === String(b.requisitionId)) return true
  const urls = job => [job.url, job.applyUrl, ...(job.sourceUrls || [])].filter(Boolean).map(canonicalJobUrl).filter(specificUrl)
  return urls(a).some(url => urls(b).includes(url))
}
const hasHistory = job => job.status === 'Saved' || ['Application Started','Applied','Screening','Interview','Technical Interview','HR Interview','Rejected','Offer','Withdrawn'].includes(job.status) || Boolean(job.applicationStartedAt || job.applicationDate)
export function deduplicateJobs(jobs) {
  const result = []
  for (const job of jobs) {
    const previous = result.find(item => sameListing(item, job))
    if (!previous) result.push({ ...job })
    else {
      // Keep the tracked identity when a fresh copy is encountered before its saved snapshot.
      if (hasHistory(job) && !hasHistory(previous)) {
        for (const field of ['id','status','notes','resumeVersion','applicationStartedAt','applicationDate','followUpDate']) if (job[field] !== undefined) previous[field] = job[field]
      }
      const firstDiscovery = [previous.discoveredAt, job.discoveredAt].filter(value => Number.isFinite(Date.parse(value))).sort((a, b) => Date.parse(a) - Date.parse(b))[0]
      if (firstDiscovery) {
        previous.discoveredAt = firstDiscovery
        previous.dateDiscovered = firstDiscovery.slice(0, 10)
        previous.dateFound = previous.dateDiscovered
      }
      previous.description = [...new Set([previous.description, job.description].filter(Boolean))].join('\n')
      if (!previous.countryRestrictions?.length && job.countryRestrictions?.length) previous.countryRestrictions = job.countryRestrictions
      previous.sources = [...new Set([...(previous.sources || [previous.source]), ...(job.sources || [job.source])])].filter(Boolean)
      previous.sourceUrls = [...new Set([...(previous.sourceUrls || [previous.url]), ...(job.sourceUrls || [job.url])])].filter(Boolean)
    }
  }
  return result
}
