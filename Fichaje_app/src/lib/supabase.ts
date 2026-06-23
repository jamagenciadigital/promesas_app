import { PostgrestClient } from '@supabase/postgrest-js';
import { GoTrueClient } from '@supabase/auth-js';
import { StorageClient } from '@supabase/storage-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Faltan las credenciales en el archivo .env');
}

const baseUrl = supabaseUrl || '';
const anonKey = supabaseAnonKey || '';

const authUrl = `${baseUrl}/auth/v1`;
const restUrl = `${baseUrl}/rest/v1`;
const storageUrl = `${baseUrl}/storage/v1`;

const headers: Record<string, string> = {
  apikey: anonKey,
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
  const mergedHeaders: Record<string, string> = {
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };
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
