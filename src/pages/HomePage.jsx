import React, { useState, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { FileText, BookOpen, Award, Download, Star, Users, Shield, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AnimatedCounter from '../components/AnimatedCounter'
import SubjectCard from '../components/SubjectCard'
import { usePageTitle } from '../hooks/usePageTitle'
import { usePopularSubjects, useHomeStats } from '../lib/queries'

const ColorTrail = lazy(() => import('../ColorTrail'))

const defaultSubjects = [
  'Computer Networks', 'Deep Learning', 'Machine Learning',
  'Advanced Java Programming', 'Operating Systems', 'Database Management',
  'Data Structures', 'Software Engineering'
]

const animConfigs = [
  { position: { left: '2%', top: '20%' }, animationType: 'float', colorScheme: 'primary' },
  { position: { right: '2%', top: '18%' }, animationType: 'floatReverse', colorScheme: 'secondary' },
  { position: { left: '1%', top: '42%' }, animationType: 'floatDiagonal', colorScheme: 'pink' },
  { position: { right: '1%', top: '40%' }, animationType: 'floatPulse', colorScheme: 'success' },
  { position: { left: '2%', top: '64%' }, animationType: 'floatRotate', colorScheme: 'warning' },
  { position: { right: '2%', top: '62%' }, animationType: 'float', colorScheme: 'tertiary' },
  { position: { left: '3%', top: '82%' }, animationType: 'floatReverse', colorScheme: 'primary' },
  { position: { right: '3%', top: '80%' }, animationType: 'floatDiagonal', colorScheme: 'secondary' },
]

const HomePage = () => {
  usePageTitle('Home', 'Access thousands of previous year question papers from DIT University. Free exam preparation resource for students.')
  const { isAdmin } = useAuth()
  const [selectedTile, setSelectedTile] = useState(null)
  const [hoveredColorScheme, setHoveredColorScheme] = useState('primary')

  // React Query — cached, no loading spinner on back/forward navigation
  const { data: stats, isLoading: statsLoading } = useHomeStats()
  const { data: popularSubjects = [], isLoading: subjectsLoading, isError: subjectsError, refetch } = usePopularSubjects()

  const subjects = (popularSubjects.length > 0
    ? popularSubjects
    : defaultSubjects.map(s => ({ subject: s, count: 0 }))
  ).map((s, i) => ({
    id: i + 1,
    name: s.subject,
    count: s.count,
    delay: `${i * 0.4}s`,
    ...animConfigs[i % animConfigs.length],
  }))

  const handleTileHover = (colorScheme) => {
    if (colorScheme) setHoveredColorScheme(colorScheme)
  }

  return (
    <div className="min-h-screen bg-base relative overflow-hidden">
      <Suspense fallback={null}>
        <ColorTrail subjects={subjects} selectedTile={selectedTile} hoveredColorScheme={hoveredColorScheme} />
      </Suspense>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(109, 221, 255, 0.4) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(214, 116, 255, 0.4) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <main className="pt-24 pb-12 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Hero */}
           <div className="text-center mb-10">
            <h1 style={{
              fontSize: 'clamp(1.5rem, 5vw, 4rem)',
              lineHeight: 'clamp(1.2, 1.1em, 1.1)',
              letterSpacing: 'clamp(-0.02em, -0.01em, -0.005em)'
            }} className="font-display font-extrabold text-on-surface mb-4">
              Your Exam Success{' '}
              <span className="text-gradient">Starts Here</span>
            </h1>
            <p className="text-on-surface-variant text-lg max-w-xl mx-auto">
              Access thousands of previous year question papers from DIT University.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12" aria-busy={statsLoading}>
            {statsLoading ? (
              [0, 1, 2, 3].map(i => (
                <div key={i} className="rounded-xl p-6 text-center border border-white/10 bg-surface-container shadow-card">
                  <div className="w-8 h-8 rounded-lg skeleton mx-auto mb-2" />
                  <div className="h-9 w-16 skeleton rounded mx-auto mb-2" />
                  <div className="h-4 w-20 skeleton rounded mx-auto" />
                </div>
              ))
            ) : (
              <>
                <div className="bg-surface-container rounded-xl p-6 text-center border border-white/10 shadow-card relative overflow-hidden group hover:border-primary/30 hover:shadow-glow-primary hover:-translate-y-1 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <FileText className="w-8 h-8 text-primary mx-auto mb-3 relative z-10 group-hover:scale-110 transition-transform" />
                  <p className="text-3xl font-bold text-on-surface relative z-10">
                    <AnimatedCounter end={stats?.totalPapers || 0} suffix="+" />
                  </p>
                  <p className="text-sm text-on-surface-variant relative z-10 font-medium tracking-wide mt-1">TOTAL PAPERS</p>
                </div>
                <div className="bg-surface-container rounded-xl p-6 text-center border border-white/10 shadow-card relative overflow-hidden group hover:border-secondary/30 hover:shadow-glow-secondary hover:-translate-y-1 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <BookOpen className="w-8 h-8 text-secondary mx-auto mb-3 relative z-10 group-hover:scale-110 transition-transform" />
                  <p className="text-3xl font-bold text-on-surface relative z-10">
                    <AnimatedCounter end={stats?.totalSubjects || 0} suffix="+" />
                  </p>
                  <p className="text-sm text-on-surface-variant relative z-10 font-medium tracking-wide mt-1">SUBJECTS</p>
                </div>
                <div className="bg-surface-container rounded-xl p-6 text-center border border-white/10 shadow-card relative overflow-hidden group hover:border-tertiary/30 hover:shadow-lg hover:shadow-tertiary/20 hover:-translate-y-1 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-tertiary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Users className="w-8 h-8 text-tertiary mx-auto mb-3 relative z-10 group-hover:scale-110 transition-transform" />
                  <p className="text-3xl font-bold text-on-surface relative z-10">
                    <AnimatedCounter end={stats?.totalUsers || 0} suffix="+" />
                  </p>
                  <p className="text-sm text-on-surface-variant relative z-10 font-medium tracking-wide mt-1">STUDENTS</p>
                </div>
                <div className="bg-surface-container rounded-xl p-6 text-center border border-white/10 shadow-card relative overflow-hidden group hover:border-green-400/30 hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-1 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Download className="w-8 h-8 text-green-400 mx-auto mb-3 relative z-10 group-hover:scale-110 transition-transform" />
                  <p className="text-3xl font-bold text-on-surface relative z-10">
                    <AnimatedCounter end={stats?.totalDownloads || 0} suffix="+" />
                  </p>
                  <p className="text-sm text-on-surface-variant relative z-10 font-medium tracking-wide mt-1">DOWNLOADS</p>
                </div>
              </>
            )}
          </div>

          {/* Popular Subjects */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-display font-bold text-on-surface">
                Popular <span className="text-gradient">Subjects</span>
              </h2>
              <Link to="/browse" className="text-sm text-primary hover:underline flex items-center gap-1">
                View All Subjects →
              </Link>
            </div>
            {subjectsError ? (
              <div className="text-center py-8 rounded-xl border border-white/10 bg-surface-container">
                <p className="text-on-surface-variant mb-4">Unable to load subjects</p>
                <button onClick={() => refetch()} className="btn-secondary text-sm flex items-center gap-2 mx-auto">
                  <RefreshCw className="w-4 h-4" /> Retry
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-busy={subjectsLoading}>
                {subjectsLoading ? (
                  [0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                    <div key={i} className="rounded-xl p-5 border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg skeleton" />
                        <div className="flex-1">
                          <div className="h-5 w-32 skeleton rounded mb-2" />
                          <div className="h-4 w-20 skeleton rounded" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  subjects.map((subject, index) => (
                    <SubjectCard
                      key={subject.id}
                      subject={subject.name}
                      paperCount={subject.count}
                      index={index}
                      onHover={handleTileHover}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="rounded-2xl p-8 md:p-12 text-center mb-12 border border-primary/20 bg-surface-container shadow-card">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-on-surface mb-4">
              Ready to Ace Your Exams?
            </h2>
            <p className="text-on-surface-variant max-w-xl mx-auto mb-6">
              Join thousands of students who are already using DIT PYQ Hub to prepare for their exams.
              Get access to verified previous year question papers for all subjects.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/browse" className="btn-primary">Browse Papers</Link>
              <Link to="/upload" className="btn-secondary">Upload Paper</Link>
            </div>
          </div>

          {/* Features */}
          <div id="features" className="mt-16 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="rounded-xl p-6 text-center border border-white/10 bg-surface-container shadow-card hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Download className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-on-surface mb-2">Free Download</h3>
              <p className="text-on-surface-variant text-sm">All papers available free</p>
            </div>
            <div className="rounded-xl p-6 text-center border border-white/10 bg-surface-container shadow-card hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-semibold text-on-surface mb-2">Verified Papers</h3>
              <p className="text-on-surface-variant text-sm">Verified by faculty</p>
            </div>
            {isAdmin && (
              <Link to="/admin" className="rounded-xl p-6 text-center border border-white/10 bg-surface-container shadow-card hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-tertiary" />
                </div>
                <h3 className="font-semibold text-on-surface mb-2">Admin Panel</h3>
                <p className="text-on-surface-variant text-sm">Manage submissions</p>
              </Link>
            )}
            <div className="rounded-xl p-6 text-center border border-white/10 bg-surface-container shadow-card hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <Award className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="font-semibold text-on-surface mb-2">Regular Updates</h3>
              <p className="text-on-surface-variant text-sm">New papers added</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default HomePage
