const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vcrvlujazhbihibzafus.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_e_ag41rXGkKswtX1XUd2-w_-qcgPepS';
const supabase = createClient(url, key);
(async ()=>{
  try{
    const { data, error } = await supabase.from('quizzes').select('id, game_pin, status').eq('status','waiting').order('created_at',{ascending:false}).limit(1);
    if(error) { console.error('err', error); process.exit(1); }
    if(!data || data.length===0){ console.log('NO_WAITING'); process.exit(0); }
    console.log(JSON.stringify(data[0]));
  }catch(e){ console.error(e); process.exit(1); }
})();
