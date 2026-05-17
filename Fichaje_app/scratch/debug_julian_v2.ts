import { createClient } from '@supabase/supabase-client'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugJulian() {
  console.log("--- DEBUGGING JULIAN ---")
  
  // 1. Find Julian in deportistas
  const { data: athletes } = await supabase
    .from('deportistas')
    .select('*')
    .ilike('nombre_completo', '%julian%')
  
  console.log("Athletes found:", JSON.stringify(athletes, null, 2))

  if (athletes && athletes.length > 0) {
    const julian = athletes[0]
    
    // 2. Find profiles associated with Julian
    const { data: profiles } = await supabase
      .from('perfiles')
      .select('*')
      .or(`deportista_id.eq.${julian.id},email.eq.${julian.email_deportista},email.eq.${julian.tutor_email}`)
    
    console.log("Profiles found:", JSON.stringify(profiles, null, 2))
    
    // 3. Find reservations for Julian
    const { data: reservations } = await supabase
      .from('reserva_escenario')
      .select('*')
      .eq('deportista_id', julian.id)
    
    console.log("Reservations found:", JSON.stringify(reservations, null, 2))
    
    // 4. Find notifications for those profiles
    if (profiles && profiles.length > 0) {
      const pIds = profiles.map(p => p.id)
      const { data: notifications } = await supabase
        .from('notificaciones')
        .select('*')
        .in('user_id', pIds)
      
      console.log("Notifications for these profiles:", JSON.stringify(notifications, null, 2))
    }
  }
}

debugJulian()
