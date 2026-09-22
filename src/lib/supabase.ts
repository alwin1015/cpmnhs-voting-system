import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yjahkkxelrjnvfbaazsr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_44j1Ik-C3oAKIc--hOCZBw_D_dgibeV';

// Custom fetch wrapper with a 15-second timeout guard to prevent stalled TCP/HTTP connections
const DEFAULT_TIMEOUT_MS = 15000;

export const resilientFetch: typeof fetch = async (input, init?: RequestInit) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Request timed out after ${DEFAULT_TIMEOUT_MS}ms`));
  }, DEFAULT_TIMEOUT_MS);

  // If a signal was already provided, chain its abort
  if (init?.signal) {
    init.signal.addEventListener('abort', () => controller.abort(init.signal?.reason));
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
    heartbeatIntervalMs: 15000,
    reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 10000),
    timeout: 20000,
  },
  global: {
    fetch: resilientFetch,
  },
});
