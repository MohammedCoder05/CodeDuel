export function getDuelClock(endsAt, now = Date.now()) {
  const deadline = endsAt ? Date.parse(endsAt) : NaN
  if (!Number.isFinite(deadline)) return { text: '--:--', expired: false, hasDeadline: false }
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000))
  return {
    text: `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`,
    expired: seconds === 0,
    hasDeadline: true,
  }
}
