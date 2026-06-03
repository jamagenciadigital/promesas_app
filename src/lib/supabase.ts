import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = rawUrl && rawUrl.startsWith('http')
  ? rawUrl
  : typeof window !== 'undefined'
    ? `${window.location.origin}${rawUrl || '/api'}`
    : '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Faltan las credenciales de Supabase en el archivo .env');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
