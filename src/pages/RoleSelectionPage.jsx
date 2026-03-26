import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { 
  Shield, Home, User, LogOut, ArrowRight, 
  Settings, BookOpen, Crown 
} from 'lucide-react'

const RoleSelectionPage = () => {
  const { user, isAdmin, signOut } = useAuth()
  usePageTitle('Welcome', 'Choose your destination after signing in.')
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <p className="text-on-surface-variant mb-4">Please sign in to continue</p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-primary/40 bg-primary/15 text-on-surface hover:bg-primary/25 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-6">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl w-full">
        {/* Welcome Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-on-surface mb-2">
            Welcome back!
          </h1>
          <p className="text-on-surface-variant">
            You're signed in as <span className="text-primary font-medium">{user.email}</span>
          </p>
          {isAdmin && (
            <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-medium">
              <Shield className="w-4 h-4" />
              Admin Access
            </span>
          )}
        </div>

        {/* Role Selection Cards */}
        {isAdmin ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Admin Panel Option */}
            <div className="rounded-xl p-6 border border-secondary/30 bg-surface-container hover:border-secondary/50 transition-all group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h2 className="font-semibold text-on-surface">Admin Panel</h2>
                  <p className="text-sm text-on-surface-variant">Management Console</p>
                </div>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <Settings className="w-4 h-4 text-secondary" />
                  Manage paper submissions
                </li>
                <li className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <User className="w-4 h-4 text-secondary" />
                  User management
                </li>
                <li className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <BookOpen className="w-4 h-4 text-secondary" />
                  View analytics
                </li>
              </ul>
              <Link 
                to="/admin" 
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-secondary/20 text-on-surface font-medium border border-secondary/40 group-hover:bg-secondary/30 transition-colors"
              >
                Go to Admin Panel
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* User Website Option */}
            <div className="rounded-xl p-6 border border-primary/30 bg-surface-container hover:border-primary/50 transition-all group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Home className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-on-surface">Student Portal</h2>
                  <p className="text-sm text-on-surface-variant">Browse & Download</p>
                </div>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Browse PYQ papers
                </li>
                <li className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <User className="w-4 h-4 text-primary" />
                  Your profile
                </li>
                <li className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <Shield className="w-4 h-4 text-primary" />
                  Upload papers
                </li>
              </ul>
              <Link 
                to="/browse" 
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary/20 text-on-surface font-medium border border-primary/40 group-hover:bg-primary/30 transition-colors"
              >
                Go to Student Portal
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          // Regular user - redirect to browse
          <div className="rounded-xl p-8 text-center border border-primary/20 bg-surface-container">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-on-surface mb-2">
              Welcome, Student!
            </h2>
            <p className="text-on-surface-variant mb-6">
              You have full access to browse and download previous year question papers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/browse" className="btn-primary">
                Browse Papers
              </Link>
              <Link to="/" className="btn-secondary">
                Go to Home
              </Link>
            </div>
          </div>
        )}

        {/* Sign Out */}
        <div className="mt-8 text-center">
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl border border-white/15 bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

export default RoleSelectionPage
