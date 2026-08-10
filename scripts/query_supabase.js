const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vcrvlujazhbihibzafus.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_e_ag41rXGkKswtX1XUd2-w_-qcgPepS';
const supabase = createClient(url, key, { realtime: { params: { eventsPerSecond: 10 } } });
(async ()=>{
  try{
    const { data: quizzes, error: qErr } = await supabase.from('quizzes').select('*');
    console.log('quizzes err', qErr);
    console.log('quizzes', quizzes && quizzes.length);
    const { data: students, error: sErr } = await supabase.from('students').select('*');
    console.log('students err', sErr);
    console.log('students', students && students.length);
  }catch(e){
    console.error(e);
  }
})();
