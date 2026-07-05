import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function softDelete(table, id) {
  const { error } = await supabase.rpc('soft_delete_record', { p_table: table, p_id: id })
  return error ? { ok: false, message: error.message } : { ok: true }
}

export async function softDeleteMany(table, ids) {
  const { error } = await supabase.rpc('soft_delete_records', { p_table: table, p_ids: ids })
  return error ? { ok: false, message: error.message } : { ok: true }
}
