import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://ebmtnqkzrkoygnykmyt.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVibXRucWt6cmtveWdueWtibXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzQ4MzgsImV4cCI6MjA5NTk1MDgzOH0.zQMPZzT3jdPvNE9JOHd8ux4HrZnQWCr5cqUHdjYmEt8'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
