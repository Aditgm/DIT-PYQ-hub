import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Search, Upload, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * Bottom tab navigation — visible on mobile only (< md breakpoint).
 * Uses NavLink for automatic active-state styling.
 *
 * Accessibility:
 *  - role="navigation" with aria-label
 *  - Each tab has aria-label and aria-current="page" when active
 *  - Touch targets ≥ 48px (py-3 = 12px + 24px icon + 12px = 48px)
 *  - Focus ring visible on keyboard navigation
 */
const BottomNav = () => {
  const { user } = useAuth()

  const tabs = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/browse', icon: Search, label: 'Browse' },
    ...(user ? [
      { to: '/upload', icon: Upload, label: 'Upload' },
      { to: '/profile', icon: User, label: 'Profile' },
    ] : []),
  ]

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-3 px-4 min-w-[64px] min-h-[48px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg ${
                isActive
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`
            }
            aria-label={label}
          >
            {({ isActive }) => (
              <>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[11px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default BottomNav
