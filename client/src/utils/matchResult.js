export function matchResultText(match, userId) {
  if (match?.status !== 'completed') return ''
  if (!match.winner) return 'Draw — time expired.'
  return String(match.winner._id || match.winner) === String(userId) ? 'You won! First accepted solution.' : 'Your opponent won. Match completed.'
}
