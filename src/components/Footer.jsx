import React from 'react'
import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const Footer = () => {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const borderColorClass = isLight ? 'border-outline-variant/10' : 'border-white/5'

  return (
    <footer className={`border-t ${borderColorClass} py-8 px-6`}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <span className="font-display font-bold text-on-surface">DIT PYQ Hub</span>
            </Link>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Free access to previous year question papers for DIT University students.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-on-surface mb-3">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link to="/browse" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Browse Papers</Link></li>
              <li><Link to="/upload" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Upload Paper</Link></li>
              <li><Link to="/profile" className="text-sm text-on-surface-variant hover:text-primary transition-colors">My Profile</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-on-surface mb-3">Resources</h4>
            <ul className="space-y-2">
              <li><Link to="/browse" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Subjects</Link></li>
              <li><Link to="/browse?sortBy=downloads" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Most Downloaded</Link></li>
              <li><Link to="/browse?sortBy=created_at" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Recently Added</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-on-surface mb-3">Information</h4>
            <ul className="space-y-2">
              <li><Link to="/browse" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Browse Papers</Link></li>
              <li><a href="mailto:ditpyqhub@gmail.com" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Contact Us</a></li>
              <li><span className="text-sm text-on-surface-variant">Open Source Project</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-on-surface-variant">© 2026 DIT PYQ Hub. Made for DIT Students.</p>
          <div className="flex items-center gap-1 text-sm text-on-surface-variant">
            <BookOpen className="w-4 h-4 text-primary" />
            <span>Open source educational resource</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
