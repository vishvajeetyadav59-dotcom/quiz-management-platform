'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Loader2, TrendingUp, Award, Users, Target } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [scoreDist, setScoreDist] = useState<{ range: string; count: number }[]>([]);
  const [passFail, setPassFail] = useState<{ name: string; value: number }[]>([]);
  const [difficultyPerformance, setDifficultyPerformance] = useState<{ difficulty: string; avgScore: number }[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; attempts: number; avgScore: number }[]>([]);
  const [topStudents, setTopStudents] = useState<{ name: string; avgScore: number; attempts: number }[]>([]);
  [topStudents];
  const [summary, setSummary] = useState({
    totalAttempts: 0,
    avgScore: 0,
    passRate: 0,
    activeStudents: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    const { data: attempts } = await supabase
      .from('attempts')
      .select('*, user:profiles(name), quiz:quizzes(difficulty)')
      .order('started_at', { ascending: true });

    if (!attempts) {
      setLoading(false);
      return;
    }

    const ranges = [
      { range: '0-20%', min: 0, max: 20, count: 0 },
      { range: '21-40%', min: 21, max: 40, count: 0 },
      { range: '41-60%', min: 41, max: 60, count: 0 },
      { range: '61-80%', min: 61, max: 80, count: 0 },
      { range: '81-100%', min: 81, max: 100, count: 0 },
    ];
    attempts.forEach((a: any) => {
      const pct = Number(a.percentage);
      const r = ranges.find((r) => pct >= r.min && pct <= r.max);
      if (r) r.count++;
    });
    setScoreDist(ranges.map((r) => ({ range: r.range, count: r.count })));

    const passed = attempts.filter((a: any) => a.status === 'PASSED').length;
    const failed = attempts.filter((a: any) => a.status === 'FAILED').length;
    setPassFail([
      { name: 'Passed', value: passed },
      { name: 'Failed', value: failed },
    ]);

    const diffMap: Record<string, number[]> = {};
    attempts.forEach((a: any) => {
      const diff = a.quiz?.difficulty ?? 'UNKNOWN';
      if (!diffMap[diff]) diffMap[diff] = [];
      diffMap[diff].push(Number(a.percentage));
    });
    setDifficultyPerformance(
      Object.entries(diffMap).map(([difficulty, scores]) => ({
        difficulty: difficulty.charAt(0) + difficulty.slice(1).toLowerCase(),
        avgScore: Math.round(scores.reduce((s, n) => s + n, 0) / scores.length),
      }))
    );

    const months: { month: string; attempts: number; avgScore: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = d.toISOString().slice(0, 7);
      const monthAttempts = attempts.filter((a: any) => a.started_at?.slice(0, 7) === monthKey);
      const avg = monthAttempts.length > 0
        ? Math.round(monthAttempts.reduce((s, a: any) => s + Number(a.percentage), 0) / monthAttempts.length)
        : 0;
      months.push({
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        attempts: monthAttempts.length,
        avgScore: avg,
      });
    }
    setMonthlyTrend(months);

    const studentMap: Record<string, { name: string; scores: number[]; attempts: number }> = {};
    attempts.forEach((a: any) => {
      const uid = a.user_id;
      if (!studentMap[uid]) {
        studentMap[uid] = { name: a.user?.name ?? 'Unknown', scores: [], attempts: 0 };
      }
      studentMap[uid].scores.push(Number(a.percentage));
      studentMap[uid].attempts++;
    });
    setTopStudents(
      Object.entries(studentMap)
        .map(([_, s]) => ({
          name: s.name,
          avgScore: Math.round(s.scores.reduce((n, x) => n + x, 0) / s.scores.length),
          attempts: s.attempts,
        }))
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 8)
    );

    const avgScore = attempts.length > 0
      ? Math.round(attempts.reduce((s, a) => s + Number(a.percentage), 0) / attempts.length)
      : 0;
    setSummary({
      totalAttempts: attempts.length,
      avgScore,
      passRate: attempts.length > 0 ? Math.round((passed / attempts.length) * 100) : 0,
      activeStudents: Object.keys(studentMap).length,
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

  const PIE_COLORS = ['hsl(var(--success))', 'hsl(var(--destructive))'];
  const summaryCards = [
    { title: 'Total Attempts', value: summary.totalAttempts, icon: Target, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Average Score', value: `${summary.avgScore}%`, icon: Award, color: 'text-success', bg: 'bg-success/10' },
    { title: 'Pass Rate', value: `${summary.passRate}%`, icon: TrendingUp, color: 'text-warning', bg: 'bg-warning/10' },
    { title: 'Active Students', value: summary.activeStudents, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">Deep insights into quiz performance and student progress</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((stat) => {
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Score Distribution</CardTitle>
            <CardDescription>How students score across all attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={scoreDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Students" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pass vs Fail Rate</CardTitle>
            <CardDescription>Overall pass/fail distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={passFail} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}>
                  {passFail.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Attempt Trends</CardTitle>
            <CardDescription>Attempts and average score over 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorAttempts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Legend />
                <Area type="monotone" dataKey="attempts" stroke="hsl(var(--primary))" fill="url(#colorAttempts)" strokeWidth={2} name="Attempts" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance by Difficulty</CardTitle>
            <CardDescription>Average scores across difficulty levels</CardDescription>
          </CardHeader>
          <CardContent>
            {difficultyPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={difficultyPerformance}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="difficulty" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" fontSize={10} domain={[0, 100]} />
                  <Radar name="Avg Score" dataKey="avgScore" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                No attempt data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {topStudents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Performing Students</CardTitle>
            <CardDescription>Students ranked by average score</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topStudents} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={120} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="avgScore" fill="hsl(var(--success))" radius={[0, 6, 6, 0]} name="Avg Score %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
