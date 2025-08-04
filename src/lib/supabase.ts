import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://metbdgtkwyqggnngtscf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldGJkZ3Rrd3lxZ2dubmd0c2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5OTI3MTQsImV4cCI6MjA1MzU2ODcxNH0.oEj1YwqvFHAJBWyKfvhSNjKGJKXKhzJCgHO_tLEhgqY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase