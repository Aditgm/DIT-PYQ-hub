import React, { lazy, Suspense, useState, useEffect } from 'react'
import { Route } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
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
import GlobalSearchModal from './components/GlobalSearchModal'
import { supabase } from './lib/supabase'

import { useOnboarding } from './hooks/useOnboarding'

// Main App
function App() {
  useKeyboardShortcuts()
  const { showOnboarding, handleOnboardingClose } = useOnboarding()
  const { user, loading: authLoading } = useAuth()
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [allPapers, setAllPapers] = useState([])

  // Load all papers for global search
  useEffect(() => {
    const fetchPapers = async () => {
      const { data } = await supabase
        .from('papers')
        .select('id, title, subject, branch, semester, year, exam_type, status')
        .eq('status', 'approved')
      setAllPapers(data || [])
    }
    fetchPapers()
  }, [])

  // Handle Cmd/Ctrl+K global search shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowGlobalSearch(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
  const MessagesPage = lazy(() => import('./pages/MessagesPage'))
  const PaperRequestPage = lazy(() => import('./pages/PaperRequestPage'))
  const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
  const NotFound = lazy(() => import('./pages/NotFound'))

  return (
    <div className="app-shell min-h-screen flex flex-col">
      <PWAManager />
      <OnboardingWizard 
        isOpen={showOnboarding} 
        onClose={handleOnboardingClose}
      />
      <Header />
      <div className="flex-1">
        <ErrorBoundary>
          <Suspense fallback={
            <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
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
        <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        <Route path="/request-paper" element={<ProtectedRoute><PaperRequestPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
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
      {!showOnboarding && <BottomNav />}
      
      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        papers={allPapers}
      />
    </div>
  )
}

export default App