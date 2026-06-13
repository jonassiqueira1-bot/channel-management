import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kkvnvlfyswevlpnchilu.supabase.co'
const supabaseKey = 'sb_publishable_JSq_L8pzlLHOyxy3303Z-A_z_4Smv68'

export const supabase = createClient(supabaseUrl, supabaseKey)
