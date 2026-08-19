'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Quiz, Question, Option, Attempt } from '@/lib/types';
import { Clock, ChevronLeft, ChevronRight, Flag, Loader2, AlertTriangle, CheckCircle2, XCircle, Award, Target, FileQuestion, Home, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Phase = 'loading' | 'info' | 'taking' | 'submitting' | 'result';

export default function TakeQuizPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;

  const [phase, setPhase] = useState<Phase>('loading');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<Attempt | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    if (!profile) return;
    const { data: quizData, error: quizErr } = await supabase
      .from('quizzes')
      .select('*, category:categories(*)')
      .eq('id', quizId)
      .maybeSingle();
    if (quizErr || !quizData) {
      toast.error('Quiz not found');
      router.push('/student/quizzes');
      return;
    }
    setQuiz(quizData as Quiz);

    const { data: qData } = await supabase
      .from('questions')
      .select('*, options(*)')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: true });

    setQuestions((qData ?? []) as Question[]);

    const { count } = await supabase
      .from('attempts')
      .select('id', { count: 'exact', head: true })
      .eq('quiz_id', quizId)
      .eq('user_id', profile.id);
    setAttemptCount(count ?? 0);

    setPhase('info');
  }, [quizId, profile, router]);

  useEffect(() => { loadData(); }, [loadData]);

  const startQuiz = () => {
    if (questions.length === 0) {
      toast.error('This quiz has no questions yet');
      return;
    }
    const initialAnswers: Record<string, string | null> = {};
    questions.forEach((q) => { initialAnswers[q.id] = null; });
    setAnswers(initialAnswers);
    setTimeLeft(quiz!.duration * 60);
    startTimeRef.current = Date.now();
    setPhase('taking');
  };

  useEffect(() => {
    if (phase !== 'taking') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setShowTimeUpDialog(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.values(answers).filter((v) => v !== null).length;
  const progressPct = (answeredCount / questions.length) * 100;

  const selectAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const submitQuiz = async () => {
    if (!profile || !quiz) return;
    setPhase('submitting');
    setShowSubmitDialog(false);
    setShowTimeUpDialog(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;
    let totalMarks = 0;
    let earnedMarks = 0;

    questions.forEach((q) => {
      totalMarks += q.marks;
      const selectedId = answers[q.id];
      if (!selectedId) {
        unanswered++;
      } else {
        const option = q.options?.find((o) => o.id === selectedId);
        if (option?.is_correct) {
          correct++;
          earnedMarks += q.marks;
        } else {
          incorrect++;
        }
      }
    });

    const percentage = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0;
    const status = percentage >= quiz.passing_score ? 'PASSED' : 'FAILED';

    const { data: attempt, error: attemptErr } = await supabase
      .from('attempts')
      .insert({
        quiz_id: quiz.id,
        user_id: profile.id,
        score: earnedMarks,
        percentage,
        correct_answers: correct,
        incorrect_answers: incorrect,
        unanswered,
        time_taken: timeTaken,
        status,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (attemptErr) {
      toast.error('Failed to submit quiz');
      setPhase('taking');
      return;
    }

    const answerInserts: any[] = [];
    questions.forEach((q) => {
      const selectedId = answers[q.id];
      const option = selectedId ? q.options?.find((o) => o.id === selectedId) : null;
      answerInserts.push({
        attempt_id: attempt.id,
        question_id: q.id,
        selected_option_id: selectedId,
        is_correct: option?.is_correct ?? false,
      });
    });

    if (answerInserts.length > 0) {
      await supabase.from('answers').insert(answerInserts);
    }

    setResult(attempt as Attempt);
    setAttemptCount((prev) => prev + 1);
    setPhase('result');
  };

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (phase === 'info' && quiz) {
    const exhausted = attemptCount >= quiz.max_attempts;
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => router.push('/student/quizzes')} className="gap-1 mb-4">
          <ChevronLeft className="h-4 w-4" /> Back to quizzes
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{quiz.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{quiz.category?.name ?? 'Uncategorized'}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {quiz.description && <p className="text-muted-foreground">{quiz.description}</p>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border p-4 text-center">
                <FileQuestion className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{questions.length}</p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <Clock className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{quiz.duration}</p>
                <p className="text-xs text-muted-foreground">Minutes</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <Target className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{quiz.passing_score}%</p>
                <p className="text-xs text-muted-foreground">Passing</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <Award className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{attemptCount}/{quiz.max_attempts}</p>
                <p className="text-xs text-muted-foreground">Attempts</p>
              </div>
            </div>
            {exhausted ? (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-center">
                <AlertTriangle className="h-5 w-5 mx-auto text-warning mb-2" />
                <p className="text-sm font-medium">You've used all {quiz.max_attempts} attempts for this quiz.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-medium mb-2">Before you begin:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• You'll have {quiz.duration} minutes to complete {questions.length} questions</li>
                  <li>• You need {quiz.passing_score}% to pass</li>
                  <li>• The quiz will auto-submit when time runs out</li>
                  <li>• You can navigate between questions before submitting</li>
                </ul>
              </div>
            )}
            <Button className="w-full" size="lg" disabled={exhausted || questions.length === 0} onClick={startQuiz}>
              {questions.length === 0 ? 'No questions available' : 'Start Quiz'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'submitting') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Submitting your answers...</p>
      </div>
    );
  }

  if (phase === 'result' && quiz && result) {
    const passed = result.status === 'PASSED';
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className={cn(
              'flex h-20 w-20 mx-auto items-center justify-center rounded-full',
              passed ? 'bg-success/10' : 'bg-destructive/10'
            )}>
              {passed ? <CheckCircle2 className="h-10 w-10 text-success" /> : <XCircle className="h-10 w-10 text-destructive" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{passed ? 'Congratulations!' : 'Keep practicing!'}</h2>
              <p className="text-muted-foreground mt-1">{quiz.title}</p>
            </div>
            <div className="text-5xl font-bold">
              {Number(result.percentage)}%
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-md mx-auto">
              <div className="rounded-lg border p-3">
                <p className="text-xl font-bold text-success">{result.correct_answers}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xl font-bold text-destructive">{result.incorrect_answers}</p>
                <p className="text-xs text-muted-foreground">Incorrect</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xl font-bold text-muted-foreground">{result.unanswered}</p>
                <p className="text-xs text-muted-foreground">Unanswered</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xl font-bold">{Math.floor(result.time_taken / 60)}m</p>
                <p className="text-xs text-muted-foreground">Time</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button variant="outline" onClick={() => router.push('/student/dashboard')} className="gap-1.5">
                <Home className="h-4 w-4" /> Back to Dashboard
              </Button>
              <Button variant="outline" onClick={() => router.push('/student/results')}>View All Results</Button>
              <Button onClick={() => router.push('/student/quizzes')}>Browse More Quizzes</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Taking phase
  if (phase === 'taking' && quiz) {
    const currentQ = questions[currentIndex];
    const isLast = currentIndex === questions.length - 1;
    const timeUrgent = timeLeft < 60;
    return (
      <div className="max-w-3xl mx-auto animate-fade-in space-y-4">
        {/* Timer bar */}
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur border-b pb-3 -mx-4 px-4 lg:-mx-6 lg:px-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{quiz.title}</span>
              <Badge variant="secondary">{currentIndex + 1}/{questions.length}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex items-center gap-1.5 font-mono font-bold text-lg',
                timeUrgent ? 'text-destructive' : 'text-foreground'
              )}>
                <Clock className="h-4 w-4" />
                {formatTime(timeLeft)}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-destructive"
                onClick={() => setShowLeaveDialog(true)}
              >
                <LogOut className="h-4 w-4" /> Leave
              </Button>
            </div>
          </div>
          <Progress value={progressPct} className="h-1.5" />
        </div>

        {/* Question */}
        <Card className="min-h-[300px]">
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                {currentIndex + 1}
              </span>
              <CardTitle className="text-lg leading-relaxed">{currentQ.question_text}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={answers[currentQ.id] ?? ''}
              onValueChange={(val) => selectAnswer(currentQ.id, val)}
              className="space-y-3"
            >
              {currentQ.options?.map((option, idx) => (
                <div key={option.id}>
                  <Label
                    htmlFor={option.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all hover:bg-accent',
                      answers[currentQ.id] === option.id && 'border-primary bg-primary/5'
                    )}
                  >
                    <RadioGroupItem value={option.id} id={option.id} />
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-sm">{option.option_text}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>

          {/* Question dots */}
          <div className="flex gap-1.5 flex-wrap justify-center">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-all',
                  i === currentIndex && 'bg-primary text-primary-foreground',
                  i !== currentIndex && answers[q.id] && 'bg-success/20 text-success',
                  i !== currentIndex && !answers[q.id] && 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {isLast ? (
            <Button onClick={() => setShowSubmitDialog(true)} className="gap-1">
              <Flag className="h-4 w-4" /> Submit
            </Button>
          ) : (
            <Button onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))} className="gap-1">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {!isLast && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={() => setShowSubmitDialog(true)} className="text-muted-foreground">
              Submit early ({answeredCount}/{questions.length} answered)
            </Button>
          </div>
        )}

        {/* Leave quiz confirmation */}
        <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave this quiz?</AlertDialogTitle>
              <AlertDialogDescription>
                Your progress will be lost and this will not count as an attempt. Are you sure you want to leave?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay & Continue</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (timerRef.current) clearInterval(timerRef.current);
                  router.push('/student/dashboard');
                }}
              >
                <Home className="h-4 w-4 mr-1" /> Leave Quiz
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Submit confirmation */}
        <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit your quiz?</AlertDialogTitle>
              <AlertDialogDescription>
                {answeredCount === questions.length
                  ? 'You have answered all questions. Ready to see your results?'
                  : `You have ${questions.length - answeredCount} unanswered question(s). Submit anyway?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Going</AlertDialogCancel>
              <AlertDialogAction onClick={submitQuiz}>Submit Quiz</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Time up dialog */}
        <AlertDialog open={showTimeUpDialog} onOpenChange={(open) => { if (!open) return; }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Time's up!</AlertDialogTitle>
              <AlertDialogDescription>
                Your time has run out. Your answers will be submitted automatically.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={submitQuiz}>View Results</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return null;
}
