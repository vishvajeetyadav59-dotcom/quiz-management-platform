'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Users, Trophy, TrendingUp, FileQuestion, Award, BarChart2, Target } from 'lucide-react';
import { BarChart, ResponsiveContainer, XAxis, YAxis, Bar, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

interface Stats {
  totalQuizzes: number;
  publishedQuizzes: number;
  totalQuestions: number;
  totalStudents: number;
  totalAttempts: number;
  avgScore: number;
  passRate: number;
  totalCategories: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [quizAttempts, setQuizAttempts] = useState<{ name: string; attempts: number }[]>([]);
  const [difficultyDist, setDifficultyDist] = useState<{ name: string; value: number }[]>([]);
  const [recentTrend, setRecentTrend] = useState<{ date: string; attempts: number; avgScore: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const [quizzesRes, questionsRes, profilesRes, attemptsRes, categoriesRes] = await Promise.all([
      supabase.from('quizzes').select('id, status, difficulty, title'),
      supabase.from('questions').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id, role'),
      supabase.from('attempts').select('id, percentage, status, quiz_id, started_at, quizzes(title)'),
      supabase.from('categories').select('id', { count: 'exact', head: true }),
    ]);

    const quizzes = quizzesRes.data ?? [];
    const profiles = profilesRes.data ?? [];
    const attempts = attemptsRes.data ?? [];
    const students = profiles.filter((p: any) => p.role === 'STUDENT');
    const published = quizzes.filter((q: any) => q.status === 'PUBLISHED');
    const passed = attempts.filter((a: any) => a.status === 'PASSED');
    const avgPct = attempts.length > 0
      ? Math.round(attempts.reduce((sum: number, a: any) => sum + Number(a.percentage), 0) / attempts.length)
      : 0;
    const passRate = attempts.length > 0 ? Math.round((passed.length / attempts.length) * 100) : 0;

    setStats({
      totalQuizzes: quizzes.length,
      publishedQuizzes: published.length,
      totalQuestions: questionsRes.count ?? 0,
      totalStudents: students.length,
      totalAttempts: attempts.length,
      avgScore: avgPct,
      passRate,
      totalCategories: categoriesRes.count ?? 0,
    });

    const attemptsByQuiz: Record<string, number> = {};
    attempts.forEach((a: any) => {
      const title = a.quizzes?.title ?? 'Unknown';
      attemptsByQuiz[title] = (attemptsByQuiz[title] ?? 0) + 1;
    });
    setQuizAttempts(
      Object.entries(attemptsByQuiz)
        .map(([name, attempts]) => ({ name: name.length > 20 ? name.slice(0, 20) + '...' : name, attempts }))
        .sort((a, b) => b.attempts - a.attempts)
        .slice(0, 6)
    );

    const diffMap: Record<string, number> = { EASY: 0, INTERMEDIATE: 0, ADVANCED: 0 };
    quizzes.forEach((q: any) => { diffMap[q.difficulty] = (diffMap[q.difficulty] ?? 0) + 1; });
    setDifficultyDist([
      { name: 'Easy', value: diffMap.EASY },
      { name: 'Intermediate', value: diffMap.INTERMEDIATE },
      { name: 'Advanced', value: diffMap.ADVANCED },
    ]);

    const last7Days: { date: string; attempts: number; avgScore: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const dayAttempts = attempts.filter((a: any) => a.started_at?.slice(0, 10) === dayStr);
      const avg = dayAttempts.length > 0
        ? Math.round(dayAttempts.reduce((s: number, a: any) => s + Number(a.percentage), 0) / dayAttempts.length)
        : 0;
      last7Days.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short' }),
        attempts: dayAttempts.length,
        avgScore: avg,
      });
    }
    setRecentTrend(last7Days);

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Quizzes', value: stats?.totalQuizzes ?? 0, icon: ClipboardList, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Published', value: stats?.publishedQuizzes ?? 0, icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
    { title: 'Questions', value: stats?.totalQuestions ?? 0, icon: FileQuestion, color: 'text-warning', bg: 'bg-warning/10' },
    { title: 'Students', value: stats?.totalStudents ?? 0, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Attempts', value: stats?.totalAttempts ?? 0, icon: Target, color: 'text-chart-4', bg: 'bg-chart-4/10' },
    { title: 'Avg Score', value: `${stats?.avgScore ?? 0}%`, icon: Award, color: 'text-success', bg: 'bg-success/10' },
    { title: 'Pass Rate', value: `${stats?.passRate ?? 0}%`, icon: Trophy, color: 'text-warning', bg: 'bg-warning/10' },
    { title: 'Categories', value: stats?.totalCategories ?? 0, icon: BarChart2, color: 'text-primary', bg: 'bg-primary/10' },
  ];

  const PIE_COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your assessment platform</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <CardTitle className="text-lg">Attempts Over Last 7 Days</CardTitle>
            <CardDescription>Daily quiz attempts and average score trend</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={recentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="attempts" stroke="hsl(var(--primary))" strokeWidth={2} name="Attempts" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="avgScore" stroke="hsl(var(--success))" strokeWidth={2} name="Avg Score %" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quiz Difficulty Distribution</CardTitle>
            <CardDescription>Quizzes by difficulty level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={difficultyDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                >
                  {difficultyDist.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Most Attempted Quizzes</CardTitle>
          <CardDescription>Top quizzes by number of attempts</CardDescription>
        </CardHeader>
        <CardContent>
          {quizAttempts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={quizAttempts} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={140} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="attempts" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} name="Attempts" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              No quiz attempts yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
