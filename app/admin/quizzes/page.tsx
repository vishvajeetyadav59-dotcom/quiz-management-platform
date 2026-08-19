'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DifficultyBadge, QuizStatusBadge } from '@/components/badges';
import { Quiz, Category } from '@/lib/types';
import { Plus, Search, Pencil, Trash2, FileQuestion, Clock, Target, Eye, EyeOff, Loader2, ClipboardList } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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

export default function AdminQuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quizzes')
      .select('*, category:categories(*)')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to load quizzes');
      setLoading(false);
      return;
    }
    setQuizzes(data as Quiz[]);
    setLoading(false);
  }, []);

  const loadCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories(data as Category[]);
  }, []);

  useEffect(() => {
    loadQuizzes();
    loadCategories();
  }, [loadQuizzes, loadCategories]);

  const filteredQuizzes = quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.category?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('quizzes').delete().eq('id', deleteId);
    if (error) {
      toast.error('Failed to delete quiz');
      return;
    }
    toast.success('Quiz deleted successfully');
    setDeleteId(null);
    loadQuizzes();
  };

  const toggleStatus = async (quiz: Quiz) => {
    const newStatus = quiz.status === 'PUBLISHED' ? 'UNPUBLISHED' : 'PUBLISHED';
    const { error } = await supabase.from('quizzes').update({ status: newStatus }).eq('id', quiz.id);
    if (error) {
      toast.error('Failed to update quiz status');
      return;
    }
    toast.success(`Quiz ${newStatus === 'PUBLISHED' ? 'published' : 'unpublished'}`);
    loadQuizzes();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quiz Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage your quizzes</p>
        </div>
        <Button onClick={() => router.push('/admin/quizzes/new')} className="gap-2">
          <Plus className="h-4 w-4" /> New Quiz
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search quizzes by title or category..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No quizzes found</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              {search ? 'Try a different search term' : 'Get started by creating your first quiz'}
            </p>
            <Button onClick={() => router.push('/admin/quizzes/new')} className="gap-2">
              <Plus className="h-4 w-4" /> Create Quiz
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredQuizzes.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-lg transition-shadow group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{quiz.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{quiz.category?.name ?? 'Uncategorized'}</p>
                  </div>
                  <QuizStatusBadge status={quiz.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                  {quiz.description ?? 'No description provided'}
                </p>
                <div className="flex items-center flex-wrap gap-2">
                  <DifficultyBadge difficulty={quiz.difficulty} />
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" /> {quiz.duration}m
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Target className="h-3 w-3" /> {quiz.passing_score}%
                  </Badge>
                </div>
                <div className="flex items-center gap-1 pt-2 border-t">
                  <Button variant="ghost" size="sm" className="gap-1.5 flex-1" onClick={() => router.push(`/admin/quizzes/${quiz.id}`)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => toggleStatus(quiz)}
                    title={quiz.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                  >
                    {quiz.status === 'PUBLISHED' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(quiz.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the quiz along with all its questions, options, and past attempts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
