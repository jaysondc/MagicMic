import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

// TODO: Replace with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'https://zdhdkoejivkuqaqicmsg.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkaGRrb2VqaXZrdXFhcWljbXNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NTY5MzIsImV4cCI6MjA3OTUzMjkzMn0.YMZkRyZI_nWbLML_-8K0VErb21xKf7QrdAcRp0eT6Z0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
