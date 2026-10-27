import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function MatchHeader({ history = false }) {
  const { user } = useAuth()
  return <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 bg-[#0e131f] px-4 py-3 text-[#f2f6ff]">
    <div className="flex items-center gap-6 sm:gap-10">
      <Link to="/dashboard" className="text-sm font-extrabold tracking-tight">CodeDuel</Link>
      {history && <nav aria-label="Main navigation" className="flex items-center gap-3 font-mono text-[10px] tracking-wider">
        <Link to="/dashboard" className="text-gray-300">DASHBOARD</Link><Link to="/history" aria-current="page" className="bg-[#f2f6ff] px-3 py-2 text-ink">HISTORY</Link>
      </nav>}
    </div>
    <div className="flex items-center gap-4">
      <span className="max-w-44 truncate border border-gray-700 bg-white/5 px-3 py-2 text-xs">{user.username}</span>
      <details className="relative"><summary aria-label="Navigation" className="flex min-h-11 min-w-11 items-center justify-center cursor-pointer list-none [&::-webkit-details-marker]:hidden"><Menu size={17} /></summary>
        <nav className="absolute right-0 top-8 z-20 min-w-36 border border-gray-700 bg-ink p-3 text-xs"><Link className="block px-2 py-3 hover:bg-white/10" to="/dashboard">Dashboard</Link><Link className="block px-2 py-3 hover:bg-white/10" to="/history">History</Link><Link className="block px-2 py-3 hover:bg-white/10" to="/play">Play</Link></nav>
      </details>
    </div>
  </header>
}
