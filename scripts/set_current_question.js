const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vcrvlujazhbihibzafus.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_e_ag41rXGkKswtX1XUd2-w_-qcgPepS';
const supabase = createClient(url, key);
const pin = process.argv[2];
const idx = Number(process.argv[3]);
(async ()=>{
  try{
    const { data, error } = await supabase.from('quizzes').select('id').eq('game_pin', pin).maybeSingle();
    if(error) { console.error(error); process.exit(1); }
    if(!data || !data.id){ console.error('no quiz'); process.exit(1); }
    const id = data.id;
    const { error: uErr } = await supabase.from('quizzes').update({ current_question: idx }).eq('id', id);
    if(uErr){ console.error(uErr); process.exit(1); }
    console.log('set', id, idx);
  }catch(e){ console.error(e); process.exit(1); }
})();
