import React, { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  Mail, Lock, User, LogIn, Loader2, AlertCircle, 
  ArrowLeft, Github, Eye, EyeOff
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { usePageTitle } from '../hooks/usePageTitle'

// Password strength calculator
const calculatePasswordStrength = (password) => {
  if (!password) return { strength: 0, level: 'none', label: '', color: '' }
  
  let score = 0
  
  // Length checks
  if (password.length >= 6) score += 1
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  
  // Character type checks
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1
  
  // Calculate percentage (max 7 points)
  const strength = Math.min(score / 7 * 100, 100)
  
  let level, label, color
  if (strength <= 20) {
    level = 'weak'
    label = 'Weak'
    color = 'bg-red-500'
  } else if (strength <= 50) {
    level = 'fair'
    label = 'Fair'
    color = 'bg-orange-500'
  } else if (strength <= 75) {
    level = 'good'
    label = 'Good'
    color = 'bg-yellow-500'
  } else {
    level = 'strong'
    label = 'Strong'
    color = 'bg-green-500'
  }
  
  return { strength, level, label, color }
}

const AuthPage = () => {
  const navigate = useNavigate()
  const {
    signIn, 
    signUp, 
    signInWithGoogle, 
    signInWithGitHub,
    loading, 
    error,
    clearError 
  } = useAuth()

  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
  })
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Calculate password strength
  const passwordStrength = useMemo(() => 
    calculatePasswordStrength(formData.password), 
    [formData.password]
  )

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    clearError()
    setFormError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setSuccessMessage('')

    if (!formData.email || !formData.password) {
      setFormError('Please fill in all required fields')
      return
    }

    if (!isLogin && !formData.fullName) {
      setFormError('Please enter your name')
      return
    }

    if (isLogin) {
      const result = await signIn(formData.email, formData.password)
      if (result.success) {
        navigate('/select-role')
      } else {
        setFormError(result.error)
        toast.error(`Login failed: ${result.error}`)
      }
    } else {
      const result = await signUp(formData.email, formData.password, formData.fullName)
      if (result.success) {
        setSuccessMessage('Account created! Please check your email to verify, then login.')
        toast.success('Account created! Please check your email to verify, then login.')
        setIsLogin(true)
      } else {
        setFormError(result.error)
        toast.error(result.error)
      }
    }
  }

  const handleGoogleSignIn = async () => {
    const result = await signInWithGoogle()
    if (!result.success) {
      setFormError(result.error)
      toast.error(result.error)
    }
  }

  const handleGitHubSignIn = async () => {
    const result = await signInWithGitHub()
    if (!result.success) {
      setFormError(result.error)
      toast.error(result.error)
    }
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(109, 221, 255, 0.4) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(214, 116, 255, 0.4) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-lg">D</span>
            </div>
          </a>
          <h1 className="font-display font-bold text-2xl text-on-surface">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-on-surface-variant mt-2">
            {isLogin 
              ? 'Sign in to access question papers' 
              : 'Join to access all question papers'
            }
          </p>
        </div>

        {/* Auth Form */}
        <div className="surface-modal rounded-2xl p-8 border border-white/10">
          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-medium disabled:opacity-50"
            >
              <Mail className="w-5 h-5" />
              Continue with Google
            </button>
            
            <button
              onClick={handleGitHubSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-medium disabled:opacity-50"
            >
              <Github className="w-5 h-5" />
              Continue with GitHub
            </button>
          </div>

          {/* Divider - Fixed background to match glass card */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-surface text-on-surface-variant">
                or continue with email
              </span>
            </div>
          </div>

          {/* Error/Success Messages */}
          {(formError || error) && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{formError || error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <p className="text-green-400 text-sm">{successMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="input-glass pl-10 pr-4 rounded-xl"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-on-surface mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  className="input-glass pl-10 pr-4 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={showPassword ? 'Enter password' : '••••••••'}
                  required
                  minLength={6}
                  className="input-glass pl-10 pr-12 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Strength Meter - Only show on signup */}
            {!isLogin && formData.password && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${passwordStrength.color} transition-all duration-300`}
                      style={{ width: `${passwordStrength.strength}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    passwordStrength.level === 'weak' ? 'text-red-400' :
                    passwordStrength.level === 'fair' ? 'text-orange-400' :
                    passwordStrength.level === 'good' ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Use 8+ characters with uppercase, lowercase, numbers & symbols
                </p>
              </div>
            )}

            {isLogin && (
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  {isLogin ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="mt-6 text-center">
            <p className="text-on-surface-variant text-sm">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button 
                onClick={() => {
                  setIsLogin(!isLogin)
                  clearError()
                  setFormError('')
                  setSuccessMessage('')
                }}
                className="text-primary font-medium hover:underline"
              >
                {isLogin ? 'Register' : 'Sign In'}
              </button>
            </p>
          </div>

          {/* Back to Home */}
          <div className="mt-4 text-center">
            <a 
              href="/" 
              className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-on-surface-variant mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}

export default AuthPage
