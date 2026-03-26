import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { 
  FileText, 
  GraduationCap,
  Calendar,
  BookOpen,
  Download,
  Star,
  AlertCircle,
  Loader2,
  Mail,
  Clock,
  Edit,
  Check,
  X,
  ArrowUpDown
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { usePageTitle } from '../hooks/usePageTitle'
import { supabase, BRANCHES, SEMESTERS } from '../lib/supabase'

const ProfilePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  usePageTitle('My Profile', 'View your uploaded papers, download history, and manage your profile.')
  const [profile, setProfile] = useState(null)
  const [papers, setPapers] = useState([])
  const [myDownloads, setMyDownloads] = useState([])
  const [stats, setStats] = useState({ totalPapers: 0, totalDownloads: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'downloads' ? 'downloads' : 'uploads')
  const [downloadSort, setDownloadSort] = useState('date-desc')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({ full_name: '', branch: '', semester: '' })
  const [refreshKey, setRefreshKey] = useState(0)
  
  const name = searchParams.get('name')
  
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (tab === 'uploads') {
        next.delete('tab')
      } else {
        next.set('tab', tab)
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  // Sort downloads based on selected option
  const sortedDownloads = [...myDownloads].sort((a, b) => {
    switch (downloadSort) {
      case 'date-asc':
        return new Date(a.downloaded_at) - new Date(b.downloaded_at)
      case 'subject':
        return (a.papers?.subject || '').localeCompare(b.papers?.subject || '')
      case 'title':
        return (a.papers?.title || '').localeCompare(b.papers?.title || '')
      case 'date-desc':
      default:
        return new Date(b.downloaded_at) - new Date(a.downloaded_at)
    }
  })
  
  // Fetch user profile and their papers from Supabase
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError
        setProfile(profileData)

        // Fetch user's papers (their own uploads)
        const { data: papersData, error: papersError } = await supabase
          .from('papers')
          .select('*')
          .eq('uploaded_by', user.id)
          .order('created_at', { ascending: false })

        if (papersError) throw papersError
        setPapers(papersData || [])

        // Fetch user's downloads
        const { data: downloadsData, error: downloadsError } = await supabase
          .from('downloads')
          .select(`
            id,
            downloaded_at,
            papers (
              id, title, subject, branch, semester, year, file_url, status
            )
          `)
          .eq('user_id', user.id)
          .order('downloaded_at', { ascending: false })

        const personalDownloads = (!downloadsError && downloadsData) ? downloadsData : []
        setMyDownloads(personalDownloads)

        // Profile stats should represent only the signed-in user's own activity.
        setStats({
          totalPapers: (papersData || []).length,
          totalDownloads: personalDownloads.length,
        })

      } catch (err) {
        console.error('Error fetching profile:', err)
        setError('Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }

    fetchProfileData()
  }, [user, refreshKey])
  
  // Subscribe to Realtime for download deletions
  // When admin deletes a paper, its download records are also removed
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('profile-downloads')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'downloads',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Remove the deleted download from local state immediately
          setMyDownloads(prev => prev.filter(d => d.id !== payload.old.id))
          setStats(prev => ({ ...prev, totalDownloads: Math.max(0, prev.totalDownloads - 1) }))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'papers'
        },
        () => {
          // A paper was deleted - re-fetch to clean up any orphaned download entries
          setRefreshKey(k => k + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])
  
  // Color generation based on name
  const getAvatarColor = (name) => {
    const colors = [
      'from-cyan-500 to-blue-500',
      'from-purple-500 to-pink-500',
      'from-blue-500 to-indigo-500',
      'from-green-500 to-teal-500',
      'from-orange-500 to-red-500',
      'from-pink-500 to-rose-500'
    ]
    return colors[name?.charCodeAt(0) % colors.length] || colors[0]
  }
  
  const getInitials = (name) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getSemesterString = (semester) => {
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']
    return romanNumerals[semester - 1] || semester
  }
  
  const startEditing = () => {
    setEditForm({
      full_name: profile?.full_name || '',
      branch: profile?.branch || '',
      semester: profile?.semester || ''
    })
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
  }

  const handleSaveProfile = async () => {
    if (!editForm.full_name.trim()) {
      toast.error('Name cannot be empty')
      return
    }
    if (!editForm.branch) {
      toast.error('Please select a branch')
      return
    }
    if (!editForm.semester) {
      toast.error('Please select a semester')
      return
    }

    setSaving(true)
    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name.trim(),
          branch: editForm.branch,
          semester: parseInt(editForm.semester)
        })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) throw updateError

      setProfile(data)
      setIsEditing(false)
      toast.success('Profile updated')
    } catch (err) {
      console.error('Error updating profile:', err)
      toast.error('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-on-surface-variant">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-red-400">{error}</p>
          <button onClick={() => navigate(-1)} className="btn-secondary">
            Go Back
          </button>
        </div>
      </div>
    )
  }
  
  const displayName = profile?.full_name || name || 'Guest User'
  const displayEmail = profile?.email || user?.email || 'No email provided'
  const displayBranch = profile?.branch || 'Not specified'
  const displaySemester = profile?.semester ? getSemesterString(profile.semester) : 'N/A'
  
  return (
    <div className="min-h-screen bg-surface">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>
      
      {/* Profile Header */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-12">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
          {/* Avatar */}
          <div className={`w-32 h-32 rounded-2xl bg-gradient-to-br ${getAvatarColor(displayName)} 
            flex items-center justify-center text-white text-4xl font-bold
            shadow-lg shadow-primary/20`}>
            {getInitials(displayName)}
          </div>
          
          {/* User Info */}
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Name</label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                    className="input-glass max-w-sm"
                    placeholder="Your full name"
                  />
                </div>
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{displayEmail}</span>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-1">Branch</label>
                    <select
                      value={editForm.branch}
                      onChange={(e) => setEditForm(f => ({ ...f, branch: e.target.value }))}
                      className="input-glass max-w-xs"
                    >
                      <option value="">Select Branch</option>
                      {BRANCHES.map(b => (
                        <option key={b.value} value={b.value}>{b.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-1">Semester</label>
                    <select
                      value={editForm.semester}
                      onChange={(e) => setEditForm(f => ({ ...f, semester: e.target.value }))}
                      className="input-glass max-w-xs"
                    >
                      <option value="">Select Semester</option>
                      {SEMESTERS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={saving}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-display font-bold text-on-surface">
                    {displayName}
                  </h1>
                  <button
                    onClick={startEditing}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors text-on-surface-variant hover:text-primary"
                    aria-label="Edit profile"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-on-surface-variant mb-2">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{displayEmail}</span>
                </div>
                <p className="text-lg text-on-surface-variant mb-4">
                  {displayBranch} • Semester {displaySemester}
                </p>
                
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span>Joined {formatDate(profile?.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <BookOpen className="w-5 h-5 text-secondary" />
                    <span>{stats.totalPapers} Papers Uploaded</span>
                  </div>
                  {profile?.role === 'admin' && (
                    <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-medium">
                      Admin
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-surface-container shadow-card rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold text-on-surface">{stats.totalPapers}</p>
                <p className="text-sm text-on-surface-variant">Total Papers</p>
              </div>
            </div>
          </div>
          
          <div className="bg-surface-container shadow-card rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Download className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-3xl font-bold text-on-surface">{stats.totalDownloads}</p>
                <p className="text-sm text-on-surface-variant">Total Downloads</p>
              </div>
            </div>
          </div>
          
          <div className="bg-surface-container shadow-card rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-tertiary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-tertiary" />
              </div>
              <div>
                <p className="text-3xl font-bold text-on-surface">
                  {profile?.created_at ? new Date(profile.created_at).getFullYear() : 'N/A'}
                </p>
                <p className="text-sm text-on-surface-variant">Batch Year</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex items-center gap-4 mt-12 border-b border-white/10">
          <button
            onClick={() => handleTabChange('uploads')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'uploads'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <FileText className="w-4 h-4" />
            My Uploads
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-white/10">
              {papers.length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange('downloads')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'downloads'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Download className="w-4 h-4" />
            My Downloads
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-white/10">
              {myDownloads.length}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'uploads' ? (
            papers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {papers.map((paper) => (
                  <Link
                    key={paper.id}
                    to={`/paper/${paper.id}`}
                    className="group bg-surface-container rounded-xl p-5 border border-transparent 
                      hover:border-primary/20 hover:shadow-glow-primary transition-all duration-300"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center 
                          group-hover:bg-primary/20 transition-colors">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-on-surface group-hover:text-primary transition-colors">
                            {paper.title}
                          </h3>
                          <p className="text-sm text-on-surface-variant mt-1">
                            {paper.subject} • {paper.year}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium
                        ${paper.status === 'approved' ? 'bg-green-500/10 text-green-400' : 
                          paper.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' : 
                          'bg-red-500/10 text-red-400'}`}>
                        {paper.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                      <span className="text-sm text-on-surface-variant">
                        Semester {getSemesterString(paper.semester)}
                      </span>
                      <span className="text-sm text-on-surface-variant">
                        {paper.branch}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-surface-container shadow-card rounded-2xl border border-white/10">
                <FileText className="w-16 h-16 text-on-surface-variant mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold text-on-surface mb-2">No Papers Yet</h3>
                <p className="text-on-surface-variant mb-4">You haven't uploaded any papers yet</p>
                <Link to="/upload" className="btn-primary">
                  Upload Your First Paper
                </Link>
              </div>
            )
          ) : (
            myDownloads.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-on-surface-variant">
                    {sortedDownloads.length} download{sortedDownloads.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-3 h-3 text-on-surface-variant" />
                    <select
                      value={downloadSort}
                      onChange={(e) => setDownloadSort(e.target.value)}
                      className="text-sm bg-surface-container border border-white/10 rounded-lg px-3 py-1.5 text-on-surface focus:outline-none focus:border-primary/50"
                    >
                      <option value="date-desc">Newest first</option>
                      <option value="date-asc">Oldest first</option>
                      <option value="subject">By subject</option>
                      <option value="title">By title (A–Z)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedDownloads.map((dl) => (
                  <Link
                    key={dl.id}
                    to={`/paper/${dl.papers.id}`}
                    className="group bg-surface-container rounded-xl p-5 border border-transparent 
                      hover:border-secondary/20 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center 
                          group-hover:bg-secondary/20 transition-colors">
                          <Download className="w-5 h-5 text-secondary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-on-surface group-hover:text-secondary transition-colors">
                            {dl.papers.title}
                          </h3>
                          <p className="text-sm text-on-surface-variant mt-1">
                            {dl.papers.subject} • {dl.papers.year}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-1 text-sm text-on-surface-variant">
                        <Clock className="w-3 h-3" />
                        {new Date(dl.downloaded_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      <span className="text-sm text-on-surface-variant">
                        Semester {getSemesterString(dl.papers.semester)}
                      </span>
                    </div>
                   </Link>
                 ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 bg-surface-container shadow-card rounded-2xl border border-white/10">
                <Download className="w-16 h-16 text-on-surface-variant mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold text-on-surface mb-2">No Downloads Yet</h3>
                <p className="text-on-surface-variant mb-4">Browse papers to start downloading</p>
                <Link to="/browse" className="btn-primary">
                  Browse Papers
                </Link>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
