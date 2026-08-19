import { QuizBuilder } from '@/components/quiz-builder';

export default function EditQuizPage({ params }: { params: { id: string } }) {
  return <QuizBuilder quizId={params.id} />;
}
