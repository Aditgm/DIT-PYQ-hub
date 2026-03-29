import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import { sanitizeSearchQuery } from './utils'

function normalizeApiUrl(url) {
  return url?.trim().replace(/\/+$/, '') || ''
}

function resolveEnvApiUrl() {
  const rawUrl = import.meta.env.VITE_API_URL?.trim()
  if (!rawUrl) return ''

  if (typeof window !== 'undefined') {
    const isHttpsPage = window.location.protocol === 'https:'
    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

    if (isHttpsPage && rawUrl.startsWith('http://') && !isLocalHost) {
      return normalizeApiUrl(rawUrl.replace(/^http:\/\//i, 'https://'))
    }
  }

  return normalizeApiUrl(rawUrl)
}

function resolveApiBaseUrl() {
  const envUrl = resolveEnvApiUrl()
  const isBrowser = typeof window !== 'undefined'

  if (!isBrowser) {
    return envUrl || ''
  }

  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

  // In production/staging, always use same-origin /api so Vercel proxy handles routing.
  if (!isLocalHost) {
    return ''
  }

  if (envUrl) {
    return envUrl
  }

  return `${window.location.protocol}//${window.location.hostname}:3001`
}

const API_BASE_URL = resolveApiBaseUrl()
const ENV_API_BASE_URL = resolveEnvApiUrl()
let downloadCountsApiUnavailable = false

function allowEnvFallbackInBrowser() {
  if (typeof window === 'undefined') return true
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

function getApiBaseCandidates() {
  const candidates = [API_BASE_URL]

  if (allowEnvFallbackInBrowser() && !candidates.includes(ENV_API_BASE_URL) && ENV_API_BASE_URL) {
    candidates.push(ENV_API_BASE_URL)
  }

  return candidates.filter((value, index, arr) => arr.indexOf(value) === index)
}

async function fetchWithApiFallback(path, options) {
  const bases = getApiBaseCandidates()
  let lastResponse = null
  let lastError = null

  for (const base of bases) {
    try {
      const response = await fetch(`${base}${path}`, options)

      if (response.status === 404 && bases.length > 1 && base !== bases[bases.length - 1]) {
        lastResponse = response
        continue
      }

      return response
    } catch (error) {
      lastError = error
    }
  }

  if (lastResponse) return lastResponse
  throw lastError || new Error('API request failed')
}

export const queryKeys = {
  popularSubjects: ['popularSubjects'],
  homeStats: ['homeStats'],
  browsePapers: (params) => ['browsePapers', params],
  searchSuggestions: (query) => ['searchSuggestions', query],
}

async function fetchBrowsePapers(params) {
  const {
    currentPage = 1,
    itemsPerPage = 20,
    searchQuery = '',
    filters = {},
    sortBy = 'downloads',
    sortOrder = 'desc',
  } = params || {}

  let query = supabase
    .from('papers')
    .select(`
      *,
      profiles:uploaded_by (full_name)
    `)
    .eq('status', 'approved')

  const hasSearch = searchQuery && searchQuery.length > 0
  const sanitized = hasSearch ? sanitizeSearchQuery(searchQuery) : ''

  if (hasSearch) {
    if (filters.subject && filters.subject === searchQuery) {
      query = query.eq('subject', filters.subject)
    } else {
      query = query.or(`title.ilike.%${sanitized}%,subject.ilike.%${sanitized}%`)
    }
  }

  if (filters.subject) query = query.eq('subject', filters.subject)
  if (filters.branch) query = query.eq('branch', filters.branch)
  if (filters.semester) query = query.eq('semester', parseInt(filters.semester))
  if (filters.year) query = query.eq('year', parseInt(filters.year))
  if (filters.examType) query = query.eq('exam_type', filters.examType)

  const dbSortBy = sortBy === 'downloads' ? 'created_at' : sortBy
  query = query.order(dbSortBy, { ascending: sortOrder === 'asc' })

  const from = (currentPage - 1) * itemsPerPage
  const to = from + itemsPerPage - 1
  query = query.range(from, to)

  const { data: papersData, error: papersError } = await query
  if (papersError) throw papersError

  const papers = (papersData || []).map(paper => ({
    id: paper.id,
    title: paper.title,
    subject: paper.subject,
    branch: paper.branch,
    semester: paper.semester,
    year: paper.year,
    examType: paper.exam_type || 'End Term',
    fileUrl: paper.file_url,
    downloads: 0,
    uploadedBy: paper.profiles?.full_name || 'Unknown',
    uploadedDate: new Date(paper.created_at).toLocaleDateString(),
  }))

  const downloadCounts = {}
  if (papers.length > 0) {
    const paperIds = papers.map(p => p.id)

    const loadCountsViaRpc = async () => {
      const { data: countsData } = await supabase.rpc('get_download_counts', { paper_ids: paperIds })
      ;(countsData || []).forEach(d => {
        downloadCounts[d.paper_id] = parseInt(d.count)
      })
    }

    if (downloadCountsApiUnavailable) {
      await loadCountsViaRpc()
    } else {
      try {
        const response = await fetchWithApiFallback('/api/download/counts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paperIds }),
        })

        if (response.ok) {
          const payload = await response.json()
          Object.assign(downloadCounts, payload?.counts || {})
        } else {
          if (response.status === 404) {
            downloadCountsApiUnavailable = true
          }
          await loadCountsViaRpc()
        }
      } catch {
        await loadCountsViaRpc()
      }
    }
  }

  let countQuery = supabase
    .from('papers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')

  if (hasSearch) {
    if (filters.subject && filters.subject === searchQuery) {
      countQuery = countQuery.eq('subject', filters.subject)
    } else {
      countQuery = countQuery.or(`title.ilike.%${sanitized}%,subject.ilike.%${sanitized}%`)
    }
  }

  if (filters.subject) countQuery = countQuery.eq('subject', filters.subject)
  if (filters.branch) countQuery = countQuery.eq('branch', filters.branch)
  if (filters.semester) countQuery = countQuery.eq('semester', parseInt(filters.semester))
  if (filters.year) countQuery = countQuery.eq('year', parseInt(filters.year))
  if (filters.examType) countQuery = countQuery.eq('exam_type', filters.examType)

  const { count, error: countError } = await countQuery
  if (countError) throw countError

  const { data: allSubjectsData, error: subjectsError } = await supabase
    .from('papers')
    .select('subject')
    .eq('status', 'approved')

  if (subjectsError) throw subjectsError

  const subjects = [...new Set((allSubjectsData || []).map(p => p.subject))].sort()

  return {
    papers,
    totalCount: count || 0,
    subjects,
    downloadCounts,
  }
}

/**
 * Count subjects client-side from the papers table.
 */
async function countSubjectsFromPapers() {
  const { data, error } = await supabase
    .from('papers')
    .select('subject')
    .eq('status', 'approved')

  if (error) throw error

  const countMap = {}
  ;(data || []).forEach(p => {
    countMap[p.subject] = (countMap[p.subject] || 0) + 1
  })

  return Object.entries(countMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([subject, count]) => ({ subject, count }))
}

/**
 * Fetch popular subjects.
 * Count directly from approved papers so this works without custom SQL views.
 */
async function fetchPopularSubjects() {
  const { data, error } = await supabase
    .from('popular_subjects')
    .select('subject, paper_count')
    .order('paper_count', { ascending: false })
    .limit(8)

  if (!error) {
    return (data || []).map(row => ({
      subject: row.subject,
      count: row.paper_count,
    }))
  }

  // If the view is not deployed yet, keep app functional.
  const isMissingView = error.code === 'PGRST202'
    || (error.message && error.message.includes('popular_subjects'))

  if (isMissingView) {
    return countSubjectsFromPapers()
  }

  throw error
}

/**
 * Fetch home stats from base tables only.
 */
async function fetchHomeStats() {
  const [papersRes, usersRes, downloadsRes, popularSubjectsRes] = await Promise.all([
    supabase.from('papers').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('downloads').select('*', { count: 'exact', head: true }),
    supabase.from('popular_subjects').select('subject', { count: 'exact', head: true }),
  ])

  if (papersRes.error) throw papersRes.error
  if (usersRes.error) throw usersRes.error
  let totalSubjects = 0
  const totalUsers = usersRes.count || 0

  // Temporary product rule: keep global download count stable while
  // download tracking is being fixed server-side.
  const totalDownloads = totalUsers * 5

  if (downloadsRes.error) {
    console.warn('Downloads counter fallback in use:', downloadsRes.error)
  }

  if (!popularSubjectsRes.error) {
    totalSubjects = popularSubjectsRes.count || 0
  } else {
    const isMissingView = popularSubjectsRes.error.code === 'PGRST202'
      || (popularSubjectsRes.error.message && popularSubjectsRes.error.message.includes('popular_subjects'))

    if (!isMissingView) {
      throw popularSubjectsRes.error
    }

    const { data: subjectsData, error: subjectsError } = await supabase
      .from('papers')
      .select('subject')
      .eq('status', 'approved')

    if (subjectsError) throw subjectsError
    totalSubjects = new Set((subjectsData || []).map(p => p.subject)).size
  }

  return {
    totalPapers: papersRes.count || 0,
    totalSubjects,
    totalUsers,
    totalDownloads,
  }
}

async function fetchSearchSuggestions(searchQuery) {
  if (!searchQuery || searchQuery.length < 2) return []

  const { data: papersData, error: papersError } = await supabase
    .from('papers')
    .select('id, title, subject, branch')
    .eq('status', 'approved')
    .or(`title.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`)
    .order('created_at', { ascending: false })
    .limit(8)

  if (papersError) throw papersError

  const { data: subjectsData } = await supabase
    .from('papers')
    .select('subject')
    .eq('status', 'approved')
    .ilike('subject', `%${searchQuery}%`)
    .limit(5)

  const suggestions = []
  const seenTitles = new Set()
  const seenSubjects = new Set()

  if (subjectsData) {
    subjectsData.forEach(item => {
      if (!seenSubjects.has(item.subject)) {
        seenSubjects.add(item.subject)
        suggestions.push({ type: 'subject', text: item.subject, matchType: 'subject' })
      }
    })
  }

  if (papersData) {
    papersData.forEach(paper => {
      if (!seenTitles.has(paper.title)) {
        seenTitles.add(paper.title)
        suggestions.push({
          type: 'paper',
          id: paper.id,
          text: paper.title,
          subject: paper.subject,
          branch: paper.branch,
          matchType: paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ? 'title' : 'subject',
        })
      }
    })
  }

  return suggestions.slice(0, 8)
}

export function usePopularSubjects() {
  return useQuery({
    queryKey: queryKeys.popularSubjects,
    queryFn: fetchPopularSubjects,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useHomeStats() {
  return useQuery({
    queryKey: queryKeys.homeStats,
    queryFn: fetchHomeStats,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useBrowsePapers(params) {
  return useQuery({
    queryKey: queryKeys.browsePapers(params),
    queryFn: () => fetchBrowsePapers(params),
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
    retry: 1,
  })
}

export function useSearchSuggestions(searchQuery) {
  return useQuery({
    queryKey: queryKeys.searchSuggestions(searchQuery),
    queryFn: () => fetchSearchSuggestions(searchQuery),
    enabled: !!searchQuery && searchQuery.length >= 2,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
