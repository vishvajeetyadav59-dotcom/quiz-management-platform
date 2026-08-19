'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AttemptStatusBadge, DifficultyBadge } from '@/components/badges';
import { Attempt } from '@/lib/types';
import { Trophy, Clock, Target, Award, Loader2, CheckCircle2, XCircle, Eye, TrendingUp, Home } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function StudentResultsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewAttempt, setViewAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('attempts')
      .select('*, quiz:quizzes(*, category:categories(*))')
      .eq('user_id', profile.id)
      .order('started_at', { ascending: false });
    setAttempts((data ?? []) as Attempt[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadAnswers = async (attemptId: string) => {
    const { data: ans } = await supabase
      .from('answers')
      .select('*, question:questions(*), selected_option:options(*)')
      .eq('attempt_id', attemptId);
    setAnswers(ans ?? []);
  };

  const handleView = (attempt: Attempt) => {
    setViewAttempt(attempt);
    loadAnswers(attempt.id);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const totalAttempts = attempts.length;
  const avgScore = totalAttempts > 0 ? Math.round(attempts.reduce((s, a) => s + Number(a.percentage), 0) / totalAttempts) : 0;
  const passed = attempts.filter((a) => a.status === 'PASSED').length;
  const passRate = totalAttempts > 0 ? Math.round((passed / totalAttempts) * 100) : 0;

  const statCards = [
    { title: 'Total Attempts', value: totalAttempts, icon: Target, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Average Score', value: `${avgScore}%`, icon: Award, color: 'text-success', bg: 'bg-success/10' },
    { title: 'Quizzes Passed', value: passed, icon: Trophy, color: 'text-warning', bg: 'bg-warning/10' },
    { title: 'Pass Rate', value: `${passRate}%`, icon: TrendingUp, color: 'text-chart-4', bg: 'bg-chart-4/10' },
  ];

  const chartData = attempts.slice(0, 15).reverse().map((a, i) => ({
    name: `#${i + 1}`,
    score: Number(a.percentage),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Results</h1>
          <p className="text-muted-foreground mt-1">Track your quiz performance and progress</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/student/dashboard')} className="gap-1.5">
          <Home className="h-4 w-4" /> Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${stat.bg}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Score Trend</CardTitle>
            <CardDescription>Your quiz scores over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} name="Score %" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {attempts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Trophy className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No results yet</h3>
            <p className="text-muted-foreground mt-1 mb-4">Take your first quiz to see results here</p>
            <Button onClick={() => router.push('/student/quizzes')} className="gap-2">
              Browse Quizzes
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quiz</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Correct</TableHead>
                <TableHead className="text-center">Time</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{attempt.quiz?.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{attempt.quiz?.category?.name ?? '-'}</TableCell>
                  <TableCell className="text-center font-semibold">{Number(attempt.percentage)}%</TableCell>
                  <TableCell className="text-center">{attempt.correct_answers}</TableCell>
                  <TableCell className="text-center text-sm">{formatTime(attempt.time_taken)}</TableCell>
                  <TableCell className="text-center"><AttemptStatusBadge status={attempt.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(attempt.started_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleView(attempt)} className="gap-1.5">
                      <Eye className="h-3.5 w-3.5" /> Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!viewAttempt} onOpenChange={(open) => !open && setViewAttempt(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewAttempt?.quiz?.title}</DialogTitle>
            <DialogDescription>
              Detailed review of your answers
            </DialogDescription>
          </DialogHeader>
          {viewAttempt && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <Target className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xl font-bold">{Number(viewAttempt.percentage)}%</p>
                  <p className="text-xs text-muted-foreground">Score</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xl font-bold text-success">{viewAttempt.correct_answers}</p>
                  <p className="text-xs text-muted-foreground">Correct</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xl font-bold text-destructive">{viewAttempt.incorrect_answers}</p>
                  <p className="text-xs text-muted-foreground">Incorrect</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <Clock className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xl font-bold">{Math.floor(viewAttempt.time_taken / 60)}m</p>
                  <p className="text-xs text-muted-foreground">Time</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 py-2">
                <AttemptStatusBadge status={viewAttempt.status} />
                <Badge variant="outline">Passing: {viewAttempt.quiz?.passing_score}%</Badge>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Answer Review</h4>
                {answers.map((ans, i) => (
                  <div key={ans.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {i + 1}
                      </span>
                      <p className="text-sm font-medium flex-1">{ans.question?.question_text}</p>
                      {ans.is_correct ? (
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground pl-8">
                      Your answer: <span className={`font-medium ${ans.is_correct ? 'text-success' : 'text-destructive'}`}>
                        {ans.selected_option?.option_text ?? 'No answer selected'}
                      </span>
                    </p>
                    {!ans.is_correct && ans.question?.options && (
                      <p className="text-xs text-muted-foreground pl-8">
                        Correct answer: <span className="font-medium text-success">
                          {ans.question.options.find((o: any) => o.is_correct)?.option_text ?? 'N/A'}
                        </span>
                      </p>
                    )}
                    {ans.question?.explanation && (
                      <p className="text-xs text-muted-foreground pl-8 pt-1 border-t">
                        <span className="font-medium">Explanation: </span>{ans.question.explanation}
                      </p>
                    )}
                  </div>
                ))}
                {answers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No answer data available</p>
                )}
              </div>
              <div className="flex gap-2 justify-center pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => router.push('/student/dashboard')} className="gap-1.5">
                  <Home className="h-4 w-4" /> Back to Dashboard
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.push('/student/quizzes')} className="gap-1.5">
                  Browse More Quizzes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
