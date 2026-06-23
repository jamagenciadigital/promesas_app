import { PostgrestClient } from '@supabase/postgrest-js';
import { GoTrueClient } from '@supabase/auth-js';
import { StorageClient } from '@supabase/storage-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? `${window.location.origin}/api`
  : rawUrl && rawUrl.startsWith('http')
    ? rawUrl
    : typeof window !== 'undefined'
      ? `${window.location.origin}${rawUrl || '/api'}`
      : '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Faltan las credenciales en el archivo .env');
}

const authUrl = `${supabaseUrl}/auth/v1`;
const restUrl = `${supabaseUrl}/rest/v1`;
const storageUrl = `${supabaseUrl}/storage/v1`;

const headers: Record<string, string> = {
  apikey: supabaseAnonKey || '',
  'Content-Type': 'application/json',
};

const auth = new GoTrueClient({
  url: authUrl,
  headers,
  flowType: 'implicit',
  persistSession: true,
  autoRefreshToken: true,
});

const fetchWithAuth: typeof fetch = async (url, options) => {
  const token = (await auth.getSession())?.data?.session?.access_token;
  const mergedHeaders = new Headers(headers);
  if (token) {
    mergedHeaders.set('Authorization', `Bearer ${token}`);
  }
  if (options?.headers) {
    const inputHeaders = new Headers(options.headers);
    inputHeaders.forEach((value, key) => {
      mergedHeaders.set(key, value);
    });
  }
  return fetch(url, { ...options, headers: mergedHeaders });
};


const rest = new PostgrestClient(restUrl, {
  headers,
  fetch: fetchWithAuth,
});

const storage = new StorageClient(storageUrl, headers, fetchWithAuth);

function createMockChannel(name: string) {
  const mock = {
    on: (_type: string, _filter: Record<string, unknown>, _callback: (payload: any) => void) => mock,
    subscribe: () => mock,
    unsubscribe: () => {},
  };
  return mock;
}

export const supabase = {
  from: (table: string) => rest.from(table),
  rpc: (fnName: string, args?: any, options?: any) => rest.rpc(fnName, args, options),
  auth,
  storage,
  channel: (name: string) => createMockChannel(name),
  removeChannel: (_channel: any) => {},
  getChannels: () => [],
};
