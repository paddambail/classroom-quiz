import { getAdmin, jsonError, newToken, hashToken } from '@/lib/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const title = String(body.title ?? '').trim();
    const questions = Array.isArray(body.questions) ? body.questions : [];
    if (!title) return jsonError('Quiz title is required.');
    if (!questions.length) return jsonError('Add at least one question.');

    const admin = getAdmin();
    let pin = '';
    for (let i = 0; i < 10; i++) {
      const candidate = String(Math.floor(100000 + Math.random() * 900000));
      const { data } = await admin.from('quizzes').select('id').eq('game_pin', candidate).maybeSingle();
      if (!data) { pin = candidate; break; }
    }
    if (!pin) return jsonError('Could not generate a unique Game PIN.', 500);

    const { data: quiz, error } = await admin.from('quizzes').insert({ title, game_pin: pin, status: 'waiting', current_question: -1 }).select('*').single();
    if (error || !quiz) return jsonError(error?.message ?? 'Could not create quiz.', 500);

    const rows = questions.map((q: any, index: number) => ({
      quiz_id: quiz.id,
      question_order: index,
      question_type: 'multiple_choice',
      question: String(q.question ?? '').trim(),
      option_a: String(q.options?.[0] ?? '').trim(),
      option_b: String(q.options?.[1] ?? '').trim(),
      option_c: String(q.options?.[2] ?? '').trim(),
      option_d: String(q.options?.[3] ?? '').trim(),
      correct_answer: String(q.correct ?? 'A'),
      time_limit: Number(q.timeLimit ?? 5),
      base_points: Number(q.basePoints ?? 1000),
    }));
    const { error: qError } = await admin.from('questions').insert(rows);
    if (qError) return jsonError(qError.message, 500);

    const hostToken = newToken();
    const { error: sessionError } = await admin.from('host_sessions').insert({ quiz_id: quiz.id, token_hash: hashToken(hostToken) });
    if (sessionError) return jsonError(sessionError.message, 500);

    return Response.json({ quiz, hostToken });
  } catch (error) {
    console.error(error);
    return jsonError('Unable to create quiz.', 500);
  }
}
