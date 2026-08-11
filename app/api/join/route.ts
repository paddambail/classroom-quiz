import { getAdmin, jsonError } from '@/lib/server';

export async function POST(req: Request) {
  try {
    const { pin, name } = await req.json();
    const cleanPin = String(pin ?? '').trim();
    const cleanName = String(name ?? '').trim();
    if (!/^\d{6}$/.test(cleanPin)) return jsonError('Please enter a 6-digit PIN.');
    if (!cleanName) return jsonError('Please enter your name.');

    const admin = getAdmin();
    const { data: quiz } = await admin.from('quizzes').select('id,title,status,game_pin').eq('game_pin', cleanPin).maybeSingle();
    if (!quiz) return jsonError('Invalid Game PIN.');
    if (quiz.status !== 'waiting') return jsonError(quiz.status === 'finished' ? 'Quiz has ended.' : 'Quiz has already started.');

    const { data: existing } = await admin.from('students').select('id').eq('quiz_id', quiz.id).ilike('name', cleanName).maybeSingle();
    if (existing) return jsonError('A student with this name is already in the quiz.');

    const { data: student, error } = await admin.from('students').insert({ quiz_id: quiz.id, name: cleanName }).select('*').single();
    if (error || !student) return jsonError(error?.code === '23505' ? 'A student with this name is already in the quiz.' : error?.message ?? 'Unable to join.', 400);
    return Response.json({ quiz, student });
  } catch (error) {
    console.error(error);
    return jsonError('Unable to connect to quiz server.', 500);
  }
}
