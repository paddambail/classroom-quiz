const https = require('https');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vcrvlujazhbihibzafus.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_e_ag41rXGkKswtX1XUd2-w_-qcgPepS';
const pin = process.argv[2] || '948586';
function get(path){
  return new Promise((res,rej)=>{
    const opts = { headers: { apikey: key, Authorization: 'Bearer '+key, 'Content-Type': 'application/json' } };
    https.get(url + '/rest/v1/' + path, opts, r => {
      let d='';
      r.on('data', c => d+=c);
      r.on('end', () => res({ status: r.statusCode, body: d }));
    }).on('error', rej);
  });
}
(async ()=>{
  try{
    const q = await get(`quizzes?game_pin=eq.${pin}&select=*`);
    console.log('QUIZZES', q.status, q.body);
    const quizzes = JSON.parse(q.body || '[]');
    if(quizzes.length){
      const id = quizzes[0].id;
      const s = await get(`students?quiz_id=eq.${id}&select=*`);
      console.log('STUDENTS', s.status, s.body);
    }
  }catch(e){
    console.error(e);
  }
})();
