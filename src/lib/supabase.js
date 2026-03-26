import { createClient } from '@supabase/supabase-js'

// Validate required environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing required Supabase environment variables. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (will be auto-generated from Supabase)
export const TABLES = {
  PAPERS: 'papers',
  USERS: 'profiles',
  DOWNLOADS: 'downloads'
}

// Paper status options
export const PAPER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

// User roles
export const USER_ROLES = {
  STUDENT: 'student',
  ADMIN: 'admin'
}

// Branch options for DIT University
export const BRANCHES = [
  { value: 'cse', label: 'Computer Science & Engineering (CSE)' },
  { value: 'ece', label: 'Electronics & Communication (ECE)' },
  { value: 'me', label: 'Mechanical Engineering (ME)' },
  { value: 'ce', label: 'Civil Engineering (CE)' },
  { value: 'ee', label: 'Electrical Engineering (EE)' },
  { value: 'it', label: 'Information Technology (IT)' },
  { value: 'cse_ai', label: 'CSE - Artificial Intelligence' },
  { value: 'cse_ds', label: 'CSE - Data Science' }
]

// Semester options
export const SEMESTERS = Array.from({ length: 8 }, (_, i) => ({
  value: i + 1,
  label: `Semester ${i + 1}`
}))

// Year options
export const YEARS = Array.from({ length: 10 }, (_, i) => {
  const year = new Date().getFullYear() - i
  return { value: year, label: year.toString() }
})
