'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DifficultyBadge } from '@/components/badges';
import { Category, Difficulty, Quiz, Question, Option, QuizStatus } from '@/lib/types';
import { ArrowLeft, Plus, Trash2, Save, Loader2, FileQuestion, GripVertical, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface QuestionDraft {
  id?: string;
  question_text: string;
  marks: number;
  explanation: string;
  difficulty: Difficulty | '';
  options: OptionDraft[];
  isNew?: boolean;
}

interface OptionDraft {
  id?: string;
  option_text: string;
  is_correct: boolean;
  isNew?: boolean;
}

export function QuizBuilder({ quizId }: { quizId?: string }) {
  const router = useRouter();
  const isEdit = !!quizId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('EASY');
  const [duration, setDuration] = useState(30);
  const [passingScore, setPassingScore] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [status, setStatus] = useState<QuizStatus>('DRAFT');
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
    if (quizId) loadQuiz();
  }, [quizId]);

  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories(data as Category[]);
  };

  const loadQuiz = async () => {
    if (!quizId) return;
    const { data: quiz, error: quizErr } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .maybeSingle();
    if (quizErr || !quiz) {
      toast.error('Quiz not found');
      router.push('/admin/quizzes');
      return;
    }
    setTitle(quiz.title);
    setDescription(quiz.description ?? '');
    setCategoryId(quiz.category_id ?? '');
    setDifficulty(quiz.difficulty);
    setDuration(quiz.duration);
    setPassingScore(quiz.passing_score);
    setMaxAttempts(quiz.max_attempts);
    setStatus(quiz.status);

    const { data: questionsData } = await supabase
      .from('questions')
      .select('*, options(*)')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: true });

    if (questionsData) {
      setQuestions(
        questionsData.map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          marks: q.marks,
          explanation: q.explanation ?? '',
          difficulty: q.difficulty ?? '',
          options: q.options.map((o: any) => ({
            id: o.id,
            option_text: o.option_text,
            is_correct: o.is_correct,
          })),
        }))
      );
    }
    setLoading(false);
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        question_text: '',
        marks: 1,
        explanation: '',
        difficulty: '',
        options: [
          { option_text: '', is_correct: false, isNew: true },
          { option_text: '', is_correct: false, isNew: true },
        ],
        isNew: true,
      },
    ]);
  };

  const updateQuestion = (index: number, field: keyof QuestionDraft, value: any) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, [field]: value } : q)));
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const addOption = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? { ...q, options: [...q.options, { option_text: '', is_correct: false, isNew: true }] }
          : q
      )
    );
  };

  const updateOption = (qIndex: number, oIndex: number, field: keyof OptionDraft, value: any) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: q.options.map((o, oi) => (oi === oIndex ? { ...o, [field]: value } : o)),
            }
          : q
      )
    );
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? { ...q, options: q.options.filter((_, oi) => oi !== oIndex) }
          : q
      )
    );
  };

  const setCorrectOption = (qIndex: number, oIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: q.options.map((o, oi) => ({ ...o, is_correct: oi === oIndex })),
            }
          : q
      )
    );
  };

  const validate = (): string | null => {
    if (!title.trim()) return 'Quiz title is required';
    if (duration < 1) return 'Duration must be at least 1 minute';
    if (passingScore < 1 || passingScore > 100) return 'Passing score must be between 1 and 100';
    if (maxAttempts < 1) return 'Max attempts must be at least 1';
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) return `Question ${i + 1}: question text is required`;
      if (q.options.length < 2) return `Question ${i + 1}: needs at least 2 options`;
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].option_text.trim()) return `Question ${i + 1}, Option ${j + 1}: option text is required`;
      }
      if (!q.options.some((o) => o.is_correct)) return `Question ${i + 1}: mark at least one correct answer`;
    }
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      let currentQuizId = quizId;

      if (isEdit && currentQuizId) {
        const { error: updateErr } = await supabase
          .from('quizzes')
          .update({
            title,
            description: description || null,
            category_id: categoryId || null,
            difficulty,
            duration,
            passing_score: passingScore,
            max_attempts: maxAttempts,
            status,
          })
          .eq('id', currentQuizId);
        if (updateErr) throw updateErr;
      } else {
        const { data: newQuiz, error: insertErr } = await supabase
          .from('quizzes')
          .insert({
            title,
            description: description || null,
            category_id: categoryId || null,
            difficulty,
            duration,
            passing_score: passingScore,
            max_attempts: maxAttempts,
            status,
          })
          .select()
          .single();
        if (insertErr) throw insertErr;
        currentQuizId = newQuiz.id;
      }

      for (const q of questions) {
        if (q.id && !q.isNew) {
          const { error: qUpdErr } = await supabase
            .from('questions')
            .update({
              question_text: q.question_text,
              marks: q.marks,
              explanation: q.explanation || null,
              difficulty: q.difficulty || null,
            })
            .eq('id', q.id);
          if (qUpdErr) throw qUpdErr;

          for (const o of q.options) {
            if (o.id && !o.isNew) {
              const { error: oUpdErr } = await supabase
                .from('options')
                .update({ option_text: o.option_text, is_correct: o.is_correct })
                .eq('id', o.id);
              if (oUpdErr) throw oUpdErr;
            } else {
              const { error: oInsErr } = await supabase.from('options').insert({
                question_id: q.id,
                option_text: o.option_text,
                is_correct: o.is_correct,
              });
              if (oInsErr) throw oInsErr;
            }
          }
        } else {
          const { data: newQ, error: qInsErr } = await supabase
            .from('questions')
            .insert({
              quiz_id: currentQuizId,
              question_text: q.question_text,
              marks: q.marks,
              explanation: q.explanation || null,
              difficulty: q.difficulty || null,
            })
            .select()
            .single();
          if (qInsErr) throw qInsErr;

          for (const o of q.options) {
            const { error: oInsErr } = await supabase.from('options').insert({
              question_id: newQ.id,
              option_text: o.option_text,
              is_correct: o.is_correct,
            });
            if (oInsErr) throw oInsErr;
          }
        }
      }

      const deletedQIds = questions.filter((q) => q.id && !q.isNew).map((q) => q.id!);
      if (isEdit && deletedQIds.length > 0) {
        const { data: existingQs } = await supabase.from('questions').select('id').eq('quiz_id', currentQuizId);
        const toDelete = (existingQs ?? []).filter((eq: any) => !deletedQIds.includes(eq.id)).map((eq: any) => eq.id);
        if (toDelete.length > 0) {
          await supabase.from('questions').delete().in('id', toDelete);
        }
      }

      toast.success(isEdit ? 'Quiz updated successfully' : 'Quiz created successfully');
      router.push('/admin/quizzes');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/quizzes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isEdit ? 'Edit Quiz' : 'Create New Quiz'}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEdit ? 'Modify quiz details and questions' : 'Set up your quiz and add questions'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quiz Details</CardTitle>
          <CardDescription>Basic information about this quiz</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., JavaScript Fundamentals" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of what this quiz covers" rows={3} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EASY">Easy</SelectItem>
                  <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                  <SelectItem value="ADVANCED">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input id="duration" type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passingScore">Passing Score (%)</Label>
              <Input id="passingScore" type="number" min={1} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxAttempts">Max Attempts</Label>
              <Input id="maxAttempts" type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as QuizStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="UNPUBLISHED">Unpublished</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Questions</h2>
            <Badge variant="secondary">{questions.length}</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={addQuestion} className="gap-2">
            <Plus className="h-4 w-4" /> Add Question
          </Button>
        </div>

        {questions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileQuestion className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No questions yet. Add your first question to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((q, qIndex) => (
              <Card key={qIndex} className="border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                        {qIndex + 1}
                      </span>
                      <span className="font-medium text-sm">Question {qIndex + 1}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => removeQuestion(qIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Question Text *</Label>
                    <Textarea
                      value={q.question_text}
                      onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                      placeholder="Enter your question..."
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Marks</Label>
                      <Input type="number" min={1} value={q.marks} onChange={(e) => updateQuestion(qIndex, 'marks', Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Difficulty</Label>
                      <Select value={q.difficulty} onValueChange={(v) => updateQuestion(qIndex, 'difficulty', v as Difficulty)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EASY">Easy</SelectItem>
                          <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                          <SelectItem value="ADVANCED">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Explanation (optional)</Label>
                    <Textarea
                      value={q.explanation}
                      onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                      placeholder="Shown to students after answering..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Options * (click the circle to mark correct)</Label>
                      <Button variant="ghost" size="sm" onClick={() => addOption(qIndex)} className="gap-1 h-7 text-xs">
                        <Plus className="h-3 w-3" /> Add Option
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {q.options.map((o, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCorrectOption(qIndex, oIndex)}
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                              o.is_correct
                                ? 'border-success bg-success text-success-foreground'
                                : 'border-border hover:border-success/50'
                            )}
                          >
                            {o.is_correct && <CheckCircle2 className="h-4 w-4" />}
                          </button>
                          <Input
                            value={o.option_text}
                            onChange={(e) => updateOption(qIndex, oIndex, 'option_text', e.target.value)}
                            placeholder={`Option ${oIndex + 1}`}
                            className={cn(o.is_correct && 'border-success/40 bg-success/5')}
                          />
                          {q.options.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10"
                              onClick={() => removeOption(qIndex, oIndex)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 sticky bottom-4 bg-background/95 backdrop-blur p-3 rounded-lg border shadow-lg">
        <Button variant="outline" onClick={() => router.push('/admin/quizzes')}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-[120px]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? 'Save Changes' : 'Create Quiz'}
        </Button>
      </div>
    </div>
  );
}
