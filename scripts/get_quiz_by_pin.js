const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vcrvlujazhbihibzafus.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_e_ag41rXGkKswtX1XUd2-w_-qcgPepS';
const supabase = createClient(url, key);
const pin = process.argv[2] || '256198';
(async ()=>{
  try{
    const { data, error } = await supabase.from('quizzes').select('*').eq('game_pin', pin).maybeSingle();
    if(error) console.error(error);
    console.log(JSON.stringify(data));
  }catch(e){ console.error(e); }
})();
