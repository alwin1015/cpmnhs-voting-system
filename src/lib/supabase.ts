import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yjahkkxelrjnvfbaazsr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_44j1Ik-C3oAKIc--hOCZBw_D_dgibeV';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
