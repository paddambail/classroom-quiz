import { getAdmin, jsonError } from '@/lib/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const admin = getAdmin();
    const { data: quiz, error } = await admin.from('quizzes').select('id,current_question,status,question_start_time').eq('id', id).single();
    if (error || !quiz) return jsonError('Quiz not found.', 404);
    if (quiz.current_question < 0) return Response.json({ question: null });
    const { data: question, error: qError } = await admin.from('questions').select('id,quiz_id,question_order,question_type,question,option_a,option_b,option_c,option_d,time_limit,base_points,image_url').eq('quiz_id', id).eq('question_order', quiz.current_question).single();
    if (qError || !question) return jsonError('Question not found.', 404);
    return Response.json({ quiz, question });
  } catch (error) {
    console.error(error);
    return jsonError('Unable to load question.', 500);
  }
}
