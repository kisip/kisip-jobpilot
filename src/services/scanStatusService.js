// Matches the discovery workflow's 17 */6 * * * UTC schedule.
export function nextScheduledScan(now = new Date()) {
  const next = new Date(now)
  next.setUTCMinutes(17, 0, 0)
  next.setUTCHours(Math.floor(next.getUTCHours() / 6) * 6)
  if (next <= now) next.setUTCHours(next.getUTCHours() + 6)
  return next.toISOString()
}

export function scanHealth(scan, now = new Date()) {
  const status = scan.automationStatus || scan.status || 'Not run yet'
  const next = Date.parse(scan.nextScan)
  // Allow one hour for GitHub's scheduled-run queue before declaring it overdue.
  const overdue = Number.isFinite(next) && now.getTime() > next + 60 * 60 * 1000
  return { label: overdue ? `Overdue · ${status}` : status, warning: overdue || status !== 'Active' }
}
