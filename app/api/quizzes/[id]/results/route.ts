import { getAdmin, jsonError } from '@/lib/server';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const admin = getAdmin();
    const { data: quiz } = await admin.from('quizzes').select('current_question').eq('id', id).single();
    const { data: students, error } = await admin.from('students').select('*').eq('quiz_id', id).order('score', { ascending: false }).order('total_response_time', { ascending: true });
    if (error) return jsonError(error.message, 500);
    const ids = (students ?? []).map((s) => s.id);
    const { data: answers } = ids.length ? await admin.from('answers').select('student_id,is_correct,question_id').eq('quiz_id', id) : { data: [] as any[] };
    const correct = new Map<string, number>();
    for (const answer of answers ?? []) if (answer.is_correct) correct.set(answer.student_id, (correct.get(answer.student_id) ?? 0) + 1);
    let answeredCount = 0;
    if (quiz && quiz.current_question >= 0) {
      const { data: q } = await admin.from('questions').select('id').eq('quiz_id', id).eq('question_order', quiz.current_question).maybeSingle();
      if (q) answeredCount = (answers ?? []).filter((a) => a.question_id === q.id).length;
    }
    return Response.json({ answeredCount, leaderboard: (students ?? []).map((student, index) => ({ ...student, rank: index + 1, correct: correct.get(student.id) ?? 0 })) });
  } catch (error) {
    console.error(error);
    return jsonError('Unable to load leaderboard.', 500);
  }
}
