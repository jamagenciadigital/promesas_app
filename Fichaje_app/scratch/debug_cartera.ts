import { supabase } from '../src/lib/supabase';

async function checkCartera() {
  const { data, error } = await supabase.from('cartera').select('*').limit(5);
  console.log("CARTERA SAMPLE:", data);
  if (error) console.error("CARTERA ERROR:", error);
  
  // Try to count total records
  const { count, error: countError } = await supabase.from('cartera').select('*', { count: 'exact', head: true });
  console.log("TOTAL CARTERA RECORDS:", count);
}

checkCartera();
