import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yjahkkxelrjnvfbaazsr.supabase.co';
const supabaseAnonKey = 'sb_publishable_44j1Ik-C3oAKIc--hOCZBw_D_dgibeV';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('candidates').insert({
    name: 'Test Candidate',
    position_id: 1,
    party: 'Test Party',
    motto: 'Test Motto',
    photo_url: '',
    grade_level: '10',
    section: 'A'
  });
  console.log('Result:', { data, error });
}
test();
