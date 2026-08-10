const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vcrvlujazhbihibzafus.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_e_ag41rXGkKswtX1XUd2-w_-qcgPepS';
const supabase = createClient(url, key);

function createPin(){
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function ensureUniquePin(pin){
  const { data } = await supabase.from('quizzes').select('id').eq('game_pin', pin).maybeSingle();
  return !data;
}

(async ()=>{
  try{
    // prepare
    const title = process.argv[2] || 'E2E Script Quiz';
    const questions = [
      { text: 'Which number is two?', options: ['1','2','3','4'], correct: 'B' },
      { text: 'What is 1+1?', options: ['1','2','3','4'], correct: 'B' }
    ];

    let pin = createPin();
    for(let i=0;i<6;i++){
      if(await ensureUniquePin(pin)) break;
      pin = createPin();
    }

    const { data: quizData, error: qErr } = await supabase.from('quizzes').insert([{ title, game_pin: pin, status: 'waiting' }]).select('id').single();
    if(qErr) throw qErr;
    const quizId = quizData.id;

    const formatted = questions.map((q, idx)=>({
      quiz_id: quizId,
      question_text: q.text,
      option_a: q.options[0],
      option_b: q.options[1],
      option_c: q.options[2],
      option_d: q.options[3],
      correct_answer: q.correct,
      time_limit: 5,
      question_order: idx+1
    }));

    const { error: qsErr } = await supabase.from('questions').insert(formatted);
    if(qsErr) throw qsErr;

    console.log(JSON.stringify({ id: quizId, game_pin: pin }));
  }catch(e){
    console.error(e);
    process.exit(1);
  }
})();
