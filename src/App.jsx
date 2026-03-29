import React, { useState, useEffect, lazy, Suspense } from 'react'
import { Navigate, useNavigate, Route } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { supabase } from './lib/supabase'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import OnboardingWizard from './components/OnboardingWizard'
import AdminRoute from './components/AdminRoute'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import Header from './components/Header'
import Footer from './components/Footer'
import BottomNav from './components/BottomNav'
import AnimatedRoutes from './components/AnimatedRoutes'
import PWAManager from './pwa/PWAManager'

// Main App
function App() {
  const { user, loading: authLoading } = useAuth()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingData, setOnboardingData] = useState(null)
  const navigate = useNavigate()
  useKeyboardShortcuts()

  // Check if user needs onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user || authLoading) return
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('branch, semester, onboarding_completed')
          .eq('id', user.id)
          .single()
        
        if (error) throw error
        
        // Show onboarding if not completed or no branch selected
        if (!data?.onboarding_completed || !data?.branch) {
          setShowOnboarding(true)
        }
      } catch (err) {
        console.error('Error checking onboarding status:', err)
      }
    }
    
    checkOnboarding()
  }, [user, authLoading])

  const handleOnboardingClose = (data) => {
    setShowOnboarding(false)
    setOnboardingData(data)
    // Optionally navigate to browse with filters
    if (data?.branch && data?.semester) {
      navigate(`/browse?branch=${data.branch}&semester=${data.semester}`)
    }
  }

  // Lazy load page components
  const HomePage = lazy(() => import('./pages/HomePage'))
  const AuthPage = lazy(() => import('./pages/AuthPage'))
  const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
  const AuthCallback = lazy(() => import('./pages/AuthCallback'))
  const AdminPanel = lazy(() => import('./pages/AdminPanel'))
  const RoleSelectionPage = lazy(() => import('./pages/RoleSelectionPage'))
  const ProfilePage = lazy(() => import('./pages/ProfilePage'))
  const PaperUpload = lazy(() => import('./pages/PaperUpload'))
  const PaperBrowse = lazy(() => import('./pages/PaperBrowse'))
  const PaperDetail = lazy(() => import('./pages/PaperDetail'))
  const NotFound = lazy(() => import('./pages/NotFound'))

  return (
    <div className="app-shell min-h-screen flex flex-col">
      <PWAManager />
      <OnboardingWizard 
        isOpen={showOnboarding} 
        onClose={handleOnboardingClose}
        user={user}
      />
      <Header />
      <div className="flex-1">
        <ErrorBoundary>
          <Suspense fallback={
            <div className="flex h-[200px] items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-500"></div>
            </div>
          }>
            <AnimatedRoutes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/select-role" element={<RoleSelectionPage />} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/upload" element={<ProtectedRoute><PaperUpload /></ProtectedRoute>} />
              <Route path="/browse" element={<PaperBrowse />} />
              <Route path="/paper/:id" element={<PaperDetail />} />
              <Route 
                path="/admin" 
                element={
                  <AdminRoute>
                    <AdminPanel />
                  </AdminRoute>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </AnimatedRoutes>
          </Suspense>
        </ErrorBoundary>
      </div>
      <Footer />
      <BottomNav />
    </div>
  )
}

export default App