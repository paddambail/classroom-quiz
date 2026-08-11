import { getAdmin, jsonError, validHost } from '@/lib/server';
import { calculatePoints } from '@/lib/scoring';

export async function POST(req: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  try {
    const { id, action } = await params;
    const body = await req.json().catch(() => ({}));
    const admin = getAdmin();
    const token = String(body.hostToken ?? '');

    if (['start', 'next', 'end', 'play-again'].includes(action)) {
      if (!token) return jsonError('Host authorization required.', 401);
      const { data: session } = await validHost(admin, id, token);
      if (!session) return jsonError('Invalid host session.', 403);
    }

    const { data: quiz, error: quizError } = await admin.from('quizzes').select('*').eq('id', id).single();
    if (quizError || !quiz) return jsonError('Quiz not found.', 404);

    if (action === 'start') {
      const { count } = await admin.from('students').select('*', { count: 'exact', head: true }).eq('quiz_id', id);
      if (!count) return jsonError('At least one student must join first.');
      const { error } = await admin.from('quizzes').update({ status: 'active', current_question: 0, question_start_time: new Date().toISOString() }).eq('id', id);
      if (error) return jsonError(error.message, 500);
      return Response.json({ ok: true });
    }

    if (action === 'next') {
      const { count } = await admin.from('questions').select('*', { count: 'exact', head: true }).eq('quiz_id', id);
      const next = quiz.current_question + 1;
      if (!count || next >= count) {
        const { error } = await admin.from('quizzes').update({ status: 'finished', question_start_time: null }).eq('id', id);
        if (error) return jsonError(error.message, 500);
        return Response.json({ finished: true });
      }
      const { error } = await admin.from('quizzes').update({ status: 'active', current_question: next, question_start_time: new Date().toISOString() }).eq('id', id);
      if (error) return jsonError(error.message, 500);
      return Response.json({ ok: true, currentQuestion: next });
    }

    if (action === 'end') {
      const { error } = await admin.from('quizzes').update({ status: 'finished', question_start_time: null }).eq('id', id);
      if (error) return jsonError(error.message, 500);
      return Response.json({ ok: true });
    }

    if (action === 'play-again') {
      let newPin = '';
      for (let i = 0; i < 10; i++) {
        const candidate = String(Math.floor(100000 + Math.random() * 900000));
        const { data } = await admin.from('quizzes').select('id').eq('game_pin', candidate).maybeSingle();
        if (!data) { newPin = candidate; break; }
      }
      if (!newPin) return jsonError('Could not generate a new Game PIN.', 500);
      const { error: clearAnswers } = await admin.from('answers').delete().eq('quiz_id', id);
      if (clearAnswers) return jsonError(clearAnswers.message, 500);
      const { error: resetStudents } = await admin.from('students').update({ score: 0, total_response_time: 0 }).eq('quiz_id', id);
      if (resetStudents) return jsonError(resetStudents.message, 500);
      const { error } = await admin.from('quizzes').update({ game_pin: newPin, status: 'waiting', current_question: -1, question_start_time: null }).eq('id', id);
      if (error) return jsonError(error.message, 500);
      return Response.json({ ok: true, gamePin: newPin });
    }

    if (action === 'answer') {
      const studentId = String(body.studentId ?? '');
      const selected = String(body.selectedAnswer ?? '');
      if (!studentId || !['A','B','C','D'].includes(selected)) return jsonError('Invalid answer.');
      if (quiz.status !== 'active' || quiz.current_question < 0 || !quiz.question_start_time) return jsonError('This question is not accepting answers.');

      const { data: question } = await admin.from('questions').select('*').eq('quiz_id', id).eq('question_order', quiz.current_question).single();
      if (!question) return jsonError('Question not found.', 404);
      const start = new Date(quiz.question_start_time).getTime();
      const now = Date.now();
      const responseTime = (now - start) / 1000;
      if (responseTime > question.time_limit) return jsonError("Time's up.", 409);

      const { data: student } = await admin.from('students').select('id,score,total_response_time').eq('id', studentId).eq('quiz_id', id).single();
      if (!student) return jsonError('Student session not found.', 404);
      const { data: existing } = await admin.from('answers').select('id').eq('student_id', studentId).eq('question_id', question.id).maybeSingle();
      if (existing) return jsonError('You already answered this question.', 409);

      const correct = selected === question.correct_answer;
      const points = correct ? calculatePoints(question.base_points, question.time_limit, responseTime) : 0;
      const { error: answerError } = await admin.from('answers').insert({ quiz_id: id, question_id: question.id, student_id: studentId, selected_answer: selected, is_correct: correct, response_time: responseTime, points });
      if (answerError) return jsonError(answerError.message, 409);
      const { error: scoreError } = await admin.from('students').update({ score: student.score + points, total_response_time: Number(student.total_response_time) + responseTime }).eq('id', studentId);
      if (scoreError) return jsonError(scoreError.message, 500);
      return Response.json({ correct, points, responseTime });
    }

    return jsonError('Unknown action.', 404);
  } catch (error) {
    console.error(error);
    return jsonError('Server error.', 500);
  }
}
