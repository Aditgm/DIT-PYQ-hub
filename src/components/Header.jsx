import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import ThemeSwitcher from './ThemeSwitcher'

const Header = () => {
  const { user, isAdmin, signOut } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showConfirmSignOut, setShowConfirmSignOut] = useState(false)
  const confirmRef = useRef(null)
  const cancelBtnRef = useRef(null)

  const requestSignOut = () => {
    setMenuOpen(false)
    setShowConfirmSignOut(true)
  }

  const confirmSignOut = async () => {
    setShowConfirmSignOut(false)
    await signOut()
    navigate('/')
  }

  const cancelSignOut = () => {
    setShowConfirmSignOut(false)
  }

  // Focus trap and keyboard handling for confirmation dialog
  useEffect(() => {
    if (!showConfirmSignOut) return

    cancelBtnRef.current?.focus()

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        cancelSignOut()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showConfirmSignOut])

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container/95 border-b border-white/10 backdrop-blur-xl supports-[backdrop-filter]:bg-surface-container/80">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <span className="text-white font-bold">D</span>
                </div>
                <span className="font-display font-bold text-xl text-on-surface">DIT PYQ Hub</span>
              </Link>
            </div>
            
             {/* Desktop Nav */}
             <nav className="hidden md:flex items-center gap-6">
               <Link to="/browse" className="text-on-surface-variant hover:text-primary transition-colors">Browse</Link>
               
               {user ? (
                 <div className="flex items-center gap-4">
                   <Link to="/upload" className="text-on-surface-variant hover:text-primary transition-colors">Upload</Link>
                   <Link to="/profile" className="text-on-surface-variant hover:text-primary transition-colors">Profile</Link>
                   {isAdmin && (
                     <Link to="/admin" className="text-primary hover:text-primary/80 transition-colors">
                       Admin Panel
                     </Link>
                   )}
                   <ThemeSwitcher />
                   <button
                     onClick={requestSignOut}
                     className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors"
                   >
                     <LogOut className="w-4 h-4" />
                     Sign Out
                   </button>
                 </div>
               ) : (
                 <div className="flex items-center gap-4">
                   <ThemeSwitcher />
                   <Link 
                     to="/login" 
                     className="px-4 py-2 rounded-xl border border-primary/40 bg-primary/15 text-on-surface hover:bg-primary/25 transition-colors"
                   >
                     Sign In
                   </Link>
                 </div>
               )}
             </nav>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 relative w-10 h-10 flex items-center justify-center text-on-surface"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              <Menu className={`w-6 h-6 absolute transition-all duration-300 ${menuOpen ? 'rotate-90 opacity-0 scale-50' : 'rotate-0 opacity-100 scale-100'}`} />
              <X className={`w-6 h-6 absolute transition-all duration-300 ${menuOpen ? 'rotate-0 opacity-100 scale-100' : '-rotate-90 opacity-0 scale-50'}`} />
            </button>
          </div>

          {/* Mobile Nav */}
          <nav 
            className={`md:hidden overflow-hidden transition-all duration-300 ease-out ${
              menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
           <div className="py-4 border-t border-white/10 mt-4">
               <div className="flex flex-col gap-4">
                 <Link to="/browse" onClick={() => setMenuOpen(false)} className="text-on-surface-variant hover:text-primary transition-colors">Browse Papers</Link>
                 <ThemeSwitcher className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors w-fit" />
                {user ? (
                  <>
                    <Link to="/upload" onClick={() => setMenuOpen(false)} className="text-on-surface-variant hover:text-primary transition-colors">Upload Paper</Link>
                    <Link to="/profile" onClick={() => setMenuOpen(false)} className="text-on-surface-variant hover:text-primary transition-colors">Profile</Link>
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setMenuOpen(false)} className="text-primary hover:text-primary/80 transition-colors">Admin Panel</Link>
                    )}
                    <button
                      onClick={requestSignOut}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors w-fit"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-2 rounded-xl border border-primary/40 bg-primary/15 text-on-surface hover:bg-primary/25 transition-colors text-center w-fit"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Sign Out Confirmation Dialog */}
      {showConfirmSignOut && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={cancelSignOut}
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-title"
        >
          <div 
            ref={confirmRef}
            className="rounded-2xl w-full max-w-sm p-6 bg-surface-container border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-red-400" />
              </div>
              <h2 id="signout-title" className="font-display font-bold text-lg text-on-surface">Sign Out</h2>
            </div>
            <p className="text-on-surface-variant mb-6">
              Are you sure you want to sign out?
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={confirmSignOut}
                className="flex-1 px-4 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors font-medium"
              >
                Sign Out
              </button>
              <button
                ref={cancelBtnRef}
                onClick={cancelSignOut}
                className="px-4 py-3 text-on-surface-variant hover:text-on-surface rounded-xl border border-white/10 hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Header
