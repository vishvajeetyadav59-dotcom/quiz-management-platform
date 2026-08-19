'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AttemptStatusBadge } from '@/components/badges';
import { Attempt } from '@/lib/types';
import { Search, Trophy, Eye, Loader2, Clock, Target } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

export default function AdminResultsPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewAttempt, setViewAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<any[]>([]);

  const loadAttempts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('attempts')
      .select('*, quiz:quizzes(*), user:profiles(*)')
      .order('started_at', { ascending: false });
    if (error) {
      toast.error('Failed to load results');
      setLoading(false);
      return;
    }
    setAttempts(data as Attempt[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAttempts();
  }, [loadAttempts]);

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

  const filteredAttempts = attempts.filter(
    (a) =>
      a.quiz?.title?.toLowerCase().includes(search.toLowerCase()) ||
      a.user?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">All Results</h1>
        <p className="text-muted-foreground mt-1">View all student quiz attempts and detailed answers</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by student or quiz..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredAttempts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Trophy className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No results found</h3>
            <p className="text-muted-foreground mt-1">
              {search ? 'Try a different search' : 'No quiz attempts have been recorded yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Quiz</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Correct</TableHead>
                <TableHead className="text-center">Time</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttempts.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell className="font-medium">{attempt.user?.name ?? 'Unknown'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{attempt.quiz?.title ?? 'Unknown'}</TableCell>
                  <TableCell className="text-center font-semibold">{Number(attempt.percentage)}%</TableCell>
                  <TableCell className="text-center">{attempt.correct_answers}</TableCell>
                  <TableCell className="text-center text-sm">{formatTime(attempt.time_taken)}</TableCell>
                  <TableCell className="text-center">
                    <AttemptStatusBadge status={attempt.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(attempt.started_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleView(attempt)} className="gap-1.5">
                      <Eye className="h-3.5 w-3.5" /> View
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
            <DialogTitle>Attempt Details</DialogTitle>
            <DialogDescription>
              {viewAttempt?.user?.name} — {viewAttempt?.quiz?.title}
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
                <h4 className="font-semibold text-sm">Answer Breakdown</h4>
                {answers.map((ans, i) => (
                  <div key={ans.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {i + 1}
                      </span>
                      <p className="text-sm font-medium flex-1">{ans.question?.question_text}</p>
                      <Badge variant={ans.is_correct ? 'default' : 'destructive'} className="shrink-0">
                        {ans.is_correct ? 'Correct' : 'Wrong'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground pl-8">
                      Selected: <span className="font-medium text-foreground">{ans.selected_option?.option_text ?? 'No answer'}</span>
                    </p>
                  </div>
                ))}
                {answers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No answer data available</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
