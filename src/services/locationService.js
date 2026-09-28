import preferences from '../config/jobPreferences.js'
import { plainDescription } from './experienceService.js'
const names = new Intl.DisplayNames(['en'], { type: 'region' })
const aliases = { IN: ['india', 'kerala', 'kochi', 'bengaluru', 'bangalore', 'chennai', 'hyderabad'], US: ['usa', 'u.s.', 'u.s.a.', 'united states', 'united states of america'], GB: ['uk', 'u.k.', 'united kingdom', 'great britain'], CA: ['canada'], AE: ['uae'] }
const countries = []
for (let a = 65; a <= 90; a += 1) for (let b = 65; b <= 90; b += 1) {
  const code = String.fromCharCode(a, b), name = names.of(code)
  if (name !== code && !['EU', 'UN', 'EZ', 'XA', 'XB', 'ZZ'].includes(code)) countries.push([code, [name.toLowerCase(), ...(aliases[code] || [])]])
}
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const textOf = value => Array.isArray(value) ? value.map(textOf).join(', ') : typeof value === 'object' && value ? value.name || value.code || value.slug || '' : String(value || '')
function countryCodes(value) {
  const text = textOf(value)
  return countries.filter(([code, labels]) => new RegExp(`(?:^|[^a-z])(?:${labels.map(escape).join('|')})(?=$|[^a-z])`, 'i').test(text) || text.split(/[,;/()]/).some(part => part.trim() === code) || (['US','UK','USA','GB','CA','AU','NZ'].includes(code) && new RegExp(`\\b${code}\\b`).test(text))).map(([code]) => code)
}
function scope(value, country) {
  const text = textOf(value)
  const excluded = text.split(/\b(?:except|excluding)\b/i)
  if (excluded.length > 1) {
    if (countryCodes(excluded.slice(1).join(' ')).includes(country)) return 'ineligible'
    return scope(excluded[0], country)
  }
  const codes = countryCodes(text)
  if (codes.length) return codes.includes(country) ? 'eligible' : 'ineligible'
  if (/worldwide|anywhere|global|all countries/i.test(text)) return 'eligible'
  if (/\b(?:asia|apac|asia.pacific)\b/i.test(text)) return country === 'IN' ? 'eligible' : 'unknown'
  if (/\b(?:europe|eu|eea|emea|north america|latin america|latam|anz|australia and new zealand)\b/i.test(text)) return country === 'IN' ? 'ineligible' : 'unknown'
  return 'unknown'
}
export function remoteEligibility(job, country = preferences.candidateCountry || 'IN') {
  if (!/remote/i.test(`${job.workMode || ''} ${job.location || ''}`)) return { status: 'not-applicable', reason: 'Not a remote role' }
  const description = plainDescription(job.description || job.descriptionSummary)
  const restrictions = []
  if (textOf(job.countryRestrictions).trim()) restrictions.push({ text: textOf(job.countryRestrictions), explicit: true })
  restrictions.push({ text: job.location || '', explicit: false })
  for (const sentence of description.replace(/\bU\.S\.(?:A\.)?/gi, 'USA').replace(/\bU\.K\./gi, 'UK').split(/[\n.!?]+/)) {
    if (/hours|time.?zone|overlap/i.test(sentence) && !/reside|live in|based in|located in/i.test(sentence)) continue
    if (/\b(?:except|excluding|not (?:available|open|eligible) (?:in|to))\b/i.test(sentence) && countryCodes(sentence).includes(country)) return { status: 'ineligible', reason: `${names.of(country)} excluded: ${sentence.trim()}` }
    if (/\b(?:must|need to|required to)\s+(?:currently\s+)?(?:be\s+(?:based|located|resident|authorized|eligible)|reside|live)|\b(?:only|restricted to|limited to)\b.*\b(?:remote|based|residents|applicants|candidates)|\b(?:remote|based|residents|applicants|candidates)\b.*\bonly\b|authorized to work in|work authorization in|remote (?:within|in|from)/i.test(sentence)) restrictions.push({ text: sentence, explicit: true })
  }
  let allowed = false
  let unknownRestriction = ''
  for (const restriction of restrictions) {
    const status = scope(restriction.text, country)
    if (status === 'ineligible') return { status, reason: `${names.of(country)} not included: ${restriction.text.trim()}` }
    if (status === 'eligible') allowed = true
    // An unrecognized explicit restriction must not become a confident worldwide match.
    if (status === 'unknown' && restriction.explicit) unknownRestriction = restriction.text.trim()
  }
  if (unknownRestriction) return { status: 'unknown', reason: `Check country eligibility: ${unknownRestriction}` }
  return allowed ? { status: 'eligible', reason: `Remote location includes ${names.of(country)}` } : { status: 'unknown', reason: `Country eligibility not specified; confirm ${names.of(country)} is allowed` }
}
