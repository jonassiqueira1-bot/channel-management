import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kkvnvlfyswevlpnchilu.supabase.co'
const supabaseKey = 'sb_publishable_JSq_L8pzlLHOyxy3303Z-A_z_4Smv68'
// eslint-disable-next-line no-unused-vars
const supabase = createClient(supabaseUrl, supabaseKey)

function App() {
  return (
    <div>
      <h1>Channel Management</h1>
      <p>Supabase conectado.</p>
    </div>
  )
}

export default App