const numberWords = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, twenty: 20 }
export const plainDescription = value => String(value || '').replace(/<(?:br\s*\/?|\/p|\/li|\/div|\/h[1-6])>/gi, '\n').replace(/<[^>]*>/g, ' ').replace(/&(?:nbsp|#160);/gi, ' ').replace(/&amp;/gi, '&').replace(/&#(?:8211|8212);|&(?:ndash|mdash);/gi, '-').replace(/[ \t]+/g, ' ')

export function experienceRequirements(job) {
  const requirements = []
  for (const [input, structured] of [[job.experience, true], [job.description || job.descriptionSummary, false]]) {
    let preferredSection = false
    const text = plainDescription(input).toLowerCase().replace(new RegExp(`\\b(${Object.keys(numberWords).join('|')})\\b`, 'g'), word => numberWords[word])
    for (const section of text.split(/\n|[,;]|[.](?:\s|$)/)) {
      if (/^(?:\s*)(?:preferred qualifications|nice to have|desirable|bonus skills)\s*:?\s*$/.test(section)) { preferredSection = true; continue }
      if (/^(?:\s*)(?:requirements|required qualifications|minimum qualifications|responsibilities|benefits)\s*:?\s*$/.test(section)) { preferredSection = false; continue }
      const matches = [...section.matchAll(/\b(\d{1,2}(?:\.\d+)?)(?:\s*\+|\s*(?:-|–|—|to)\s*(\d{1,2}(?:\.\d+)?))?\s*(?:years?|yrs?)\b/g)]
      const candidates = []
      for (let i = 0; i < matches.length; i += 1) {
        const match = matches[i]
        const before = section.slice(i ? matches[i - 1].index + matches[i - 1][0].length : 0, match.index)
        const after = section.slice(match.index + match[0].length, matches[i + 1]?.index ?? section.length)
        const context = `${before} ${after}`
        if (!structured && !/experience|working|worked|hands.on|background|expertise|must have|minimum|at least|required/.test(context)) continue
        if (/company|business|organization|founded|established|serving customers/.test(before) && !/you|candidate|applicant|must|require/.test(before)) continue
        if (/not required|no minimum/.test(context) || /(?:up to|less than)\s*$/.test(before)) continue
        const preferred = /preferred|ideally|desirable|nice.to.have|bonus|a plus/.test(context) || (preferredSection && !/must|required|minimum|at least/.test(context))
        candidates.push({ minimum: Number(match[1]), preferred, evidence: section.trim() })
      }
      // Education alternatives are separate valid routes, not cumulative requirements.
      const required = candidates.filter(item => !item.preferred)
      if (/\bor\b/.test(section) && /bachelor|master|degree|phd/.test(section) && required.length > 1) {
        requirements.push(required.reduce((a, b) => a.minimum < b.minimum ? a : b), ...candidates.filter(item => item.preferred))
      } else requirements.push(...candidates)
    }
  }
  const required = requirements.filter(item => !item.preferred)
  return { minimum: required.length ? Math.max(...required.map(item => item.minimum)) : null, requirements }
}
