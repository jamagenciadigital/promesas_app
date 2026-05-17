import { supabase } from '../src/lib/supabase';

async function checkPolicies() {
  const { data, error } = await supabase.rpc('get_policies', { table_name: 'cartera' });
  if (error) {
    // If RPC doesn't exist, try a direct query to pg_policies if possible, 
    // but usually we can't from client.
    // Let's just try to fetch all data as superadmin and see if it works.
    const { data: allData, error: fetchError } = await supabase.from('cartera').select('*').limit(1);
    if (fetchError) {
      console.log("Fetch failed:", fetchError.message);
    } else {
      console.log("Fetch success, found records:", allData?.length);
    }
  } else {
    console.log("Policies:", data);
  }
}

checkPolicies();
