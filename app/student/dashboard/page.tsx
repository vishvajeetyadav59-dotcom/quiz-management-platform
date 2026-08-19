'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DifficultyBadge } from '@/components/badges';
import { Attempt, Quiz } from '@/lib/types';
import { ClipboardList, Trophy, Clock, Target, TrendingUp, Award, ArrowRight, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function StudentDashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [stats, setStats] = useState({
    totalAttempts: 0,
    avgScore: 0,
    passed: 0,
    quizzesTaken: 0,
  });

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;

    const [attemptsRes, quizzesRes] = await Promise.all([
      supabase
        .from('attempts')
        .select('*, quiz:quizzes(*)')
        .eq('user_id', profile.id)
        .order('started_at', { ascending: false }),
      supabase
        .from('quizzes')
        .select('*, category:categories(*)')
        .eq('status', 'PUBLISHED')
        .order('created_at', { ascending: false }),
    ]);

    const userAttempts = (attemptsRes.data ?? []) as Attempt[];
    setAttempts(userAttempts);
    setAvailableQuizzes((quizzesRes.data ?? []) as Quiz[]);

    const avgScore = userAttempts.length > 0
      ? Math.round(userAttempts.reduce((s, a) => s + Number(a.percentage), 0) / userAttempts.length)
      : 0;
    const passed = userAttempts.filter((a) => a.status === 'PASSED').length;
    const uniqueQuizzes = new Set(userAttempts.map((a) => a.quiz_id)).size;
    setStats({
      totalAttempts: userAttempts.length,
      avgScore,
      passed,
      quizzesTaken: uniqueQuizzes,
    });

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const recentAttempts = attempts.slice(0, 5);
  const recommendedQuizzes = availableQuizzes.slice(0, 3);

  const chartData = attempts.slice(0, 10).reverse().map((a, i) => ({
    name: `#${i + 1}`,
    score: Number(a.percentage),
  }));

  const statCards = [
    { title: 'Quizzes Taken', value: stats.quizzesTaken, icon: ClipboardList, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Total Attempts', value: stats.totalAttempts, icon: Target, color: 'text-chart-4', bg: 'bg-chart-4/10' },
    { title: 'Average Score', value: `${stats.avgScore}%`, icon: Award, color: 'text-success', bg: 'bg-success/10' },
    { title: 'Quizzes Passed', value: stats.passed, icon: Trophy, color: 'text-warning', bg: 'bg-warning/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {profile?.name?.split(' ')[0]}</h1>
        <p className="text-muted-foreground mt-1">Here's an overview of your quiz activity</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Score Progress
            </CardTitle>
            <CardDescription>Your recent quiz scores over time</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Score %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <TrendingUp className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">Take your first quiz to see progress charts</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Attempts</CardTitle>
            <CardDescription>Your latest quiz results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAttempts.length > 0 ? (
              recentAttempts.map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attempt.quiz?.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(attempt.started_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{Number(attempt.percentage)}%</span>
                    {attempt.status === 'PASSED' ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <Trophy className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm text-center">No attempts yet. Start a quiz to see your results here!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recommended Quizzes</h2>
          <Button variant="ghost" size="sm" onClick={() => router.push('/student/quizzes')} className="gap-1">
            View All <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        {recommendedQuizzes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendedQuizzes.map((quiz) => (
              <Card key={quiz.id} className="hover:shadow-lg transition-shadow group cursor-pointer" onClick={() => router.push(`/student/quizzes/${quiz.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base group-hover:text-primary transition-colors">{quiz.title}</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground">{quiz.category?.name ?? 'Uncategorized'}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">{quiz.description ?? 'No description'}</p>
                  <div className="flex items-center flex-wrap gap-2">
                    <DifficultyBadge difficulty={quiz.difficulty} />
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" /> {quiz.duration}m
                    </Badge>
                  </div>
                  <Button size="sm" className="w-full gap-1">
                    Start Quiz <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No quizzes available yet. Check back soon!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
