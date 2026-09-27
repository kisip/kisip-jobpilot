import { useEffect, useState } from 'react'
import { scanHealth } from '../services/scanStatusService'

export default function ScanHealth({ scan }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])
  const health = scanHealth(scan, now)
  return <span className={health.warning ? 'error-text' : ''} role="status">{health.label}</span>
}
