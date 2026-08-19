'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DifficultyBadge } from '@/components/badges';
import { Quiz, Category, Attempt } from '@/lib/types';
import { Search, Clock, Target, FileQuestion, ArrowRight, Loader2, ClipboardList, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StudentQuizzesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeDifficulty, setActiveDifficulty] = useState<string>('all');

  const loadData = useCallback(async () => {
    if (!profile) return;
    const [quizRes, catRes, attemptRes] = await Promise.all([
      supabase.from('quizzes').select('*, category:categories(*)').eq('status', 'PUBLISHED').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
      supabase.from('attempts').select('*, quiz:quizzes(*)').eq('user_id', profile.id).order('started_at', { ascending: false }),
    ]);
    setQuizzes((quizRes.data ?? []) as Quiz[]);
    setCategories((catRes.data ?? []) as Category[]);
    setAttempts((attemptRes.data ?? []) as Attempt[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  const getAttemptCount = (quizId: string) => attempts.filter((a) => a.quiz_id === quizId).length;
  const getBestScore = (quizId: string) => {
    const quizAttempts = attempts.filter((a) => a.quiz_id === quizId);
    if (quizAttempts.length === 0) return null;
    return Math.max(...quizAttempts.map((a) => Number(a.percentage)));
  };

  const filtered = quizzes.filter((q) => {
    const matchSearch = q.title.toLowerCase().includes(search.toLowerCase()) || q.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'all' || q.category_id === activeCategory;
    const matchDiff = activeDifficulty === 'all' || q.difficulty === activeDifficulty;
    return matchSearch && matchCat && matchDiff;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Browse Quizzes</h1>
          <p className="text-muted-foreground mt-1">Find a quiz to test your knowledge</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/student/dashboard')} className="gap-1.5">
          <Home className="h-4 w-4" /> Dashboard
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search quizzes..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant={activeCategory === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setActiveCategory('all')}>All</Button>
          {categories.map((c) => (
            <Button key={c.id} variant={activeCategory === c.id ? 'default' : 'outline'} size="sm" onClick={() => setActiveCategory(c.id)}>
              {c.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'EASY', 'INTERMEDIATE', 'ADVANCED'].map((d) => (
          <Button key={d} variant={activeDifficulty === d ? 'default' : 'outline'} size="sm" onClick={() => setActiveDifficulty(d)} className="capitalize">
            {d === 'all' ? 'All Levels' : d.toLowerCase()}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No quizzes found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your filters or search term</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((quiz) => {
            const attemptCount = getAttemptCount(quiz.id);
            const bestScore = getBestScore(quiz.id);
            const exhausted = attemptCount >= quiz.max_attempts;
            return (
              <Card key={quiz.id} className="hover:shadow-lg transition-shadow group flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base group-hover:text-primary transition-colors">{quiz.title}</CardTitle>
                    <DifficultyBadge difficulty={quiz.difficulty} />
                  </div>
                  <p className="text-xs text-muted-foreground">{quiz.category?.name ?? 'Uncategorized'}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">{quiz.description ?? 'No description'}</p>
                  <div className="flex items-center flex-wrap gap-2">
                    <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> {quiz.duration}m</Badge>
                    <Badge variant="outline" className="gap-1"><Target className="h-3 w-3" /> Pass: {quiz.passing_score}%</Badge>
                    <Badge variant="outline" className="gap-1"><FileQuestion className="h-3 w-3" /> Max: {quiz.max_attempts}</Badge>
                  </div>
                  {bestScore !== null && (
                    <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                      <span className="text-muted-foreground">Best score: </span>
                      <span className="font-bold">{bestScore}%</span>
                      <span className="text-muted-foreground ml-2">({attemptCount}/{quiz.max_attempts} attempts)</span>
                    </div>
                  )}
                  <Button
                    className="w-full gap-1 mt-auto"
                    disabled={exhausted}
                    onClick={() => router.push(`/student/quizzes/${quiz.id}`)}
                  >
                    {exhausted ? 'Max attempts reached' : bestScore !== null ? 'Retry Quiz' : 'Start Quiz'}
                    {!exhausted && <ArrowRight className="h-3.5 w-3.5" />}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
