import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Home, BookOpen, Upload, Search, ArrowRight } from 'lucide-react'
import { usePageTitle } from '../hooks/usePageTitle'

const NotFound = () => {
  usePageTitle('Page Not Found')
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const quickLinks = [
    { to: '/', label: 'Home', icon: Home, desc: 'Back to homepage' },
    { to: '/browse', label: 'Browse Papers', icon: BookOpen, desc: 'Search question papers' },
    { to: '/upload', label: 'Upload Paper', icon: Upload, desc: 'Share your papers' },
  ]

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-xl w-full text-center">
        {/* SVG Illustration */}
        <div className="mb-6">
          <svg className="w-40 h-40 mx-auto" viewBox="0 0 240 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="120" cy="100" r="90" fill="var(--color-surface-container)" opacity="0.5" />
            <circle cx="120" cy="100" r="70" stroke="var(--color-outline-variant)" strokeWidth="1" strokeDasharray="6 4" />
            <path d="M75 55 L75 145 C75 148 77 150 80 150 L145 150 C148 150 150 148 150 145 L150 80 L135 55 Z" 
              fill="var(--color-surface-container-highest)" stroke="var(--color-on-surface-variant)" strokeWidth="1.5" strokeOpacity="0.2" />
            <path d="M135 55 L135 80 L150 80" fill="var(--color-surface-container)" stroke="var(--color-on-surface-variant)" strokeWidth="1.5" strokeOpacity="0.2" />
            <rect x="85" y="90" width="50" height="3" rx="1.5" fill="var(--color-on-surface-variant)" opacity="0.15" />
            <rect x="85" y="100" width="40" height="3" rx="1.5" fill="var(--color-on-surface-variant)" opacity="0.1" />
            <rect x="85" y="110" width="55" height="3" rx="1.5" fill="var(--color-on-surface-variant)" opacity="0.1" />
            <rect x="85" y="120" width="30" height="3" rx="1.5" fill="var(--color-on-surface-variant)" opacity="0.08" />
            <path d="M148 78 L160 68 L155 85 L168 80" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6" />
            <circle cx="165" cy="120" r="18" fill="var(--color-surface-container)" stroke="var(--color-primary)" strokeWidth="2.5" strokeOpacity="0.7" />
            <circle cx="165" cy="120" r="12" stroke="var(--color-primary)" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="3 3" />
            <line x1="178" y1="133" x2="190" y2="145" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7" />
            <text x="165" y="125" fontFamily="sans-serif" fontSize="16" fontWeight="bold" fill="var(--color-primary)" opacity="0.5" textAnchor="middle">?</text>
            <circle cx="60" cy="70" r="3" fill="var(--color-secondary)" opacity="0.3" />
            <circle cx="180" cy="50" r="2" fill="var(--color-primary)" opacity="0.25" />
          </svg>
        </div>

        {/* Text Content */}
        <h1 className="text-6xl font-display font-extrabold text-on-surface mb-2">404</h1>
        <h2 className="text-xl font-display font-bold text-on-surface mb-2">Well, this is awkward...</h2>
        <p className="text-on-surface-variant mb-8 max-w-md mx-auto">
          The page you were looking for seems to have taken a study break. 
          Try searching for what you need or head back to a familiar spot.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for papers, subjects..."
              className="w-full pl-12 pr-4 py-3 bg-surface-container border border-white/10 rounded-xl text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-gradient-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Search
            </button>
          </div>
        </form>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="glass rounded-xl p-4 text-left hover:border-primary/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <link.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-on-surface text-sm">{link.label}</p>
                  <p className="text-xs text-on-surface-variant">{link.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-on-surface-variant ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default NotFound
