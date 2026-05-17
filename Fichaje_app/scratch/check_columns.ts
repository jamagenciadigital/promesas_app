import { createClient } from '@supabase/supabase-client'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkColumns() {
  const { data, error } = await supabase
    .from('reserva_escenario')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error("Error fetching table:", error)
  } else if (data && data.length > 0) {
    console.log("Columns found in first record:", Object.keys(data[0]))
  } else {
    console.log("No records found in reserva_escenario")
  }
}

checkColumns()
