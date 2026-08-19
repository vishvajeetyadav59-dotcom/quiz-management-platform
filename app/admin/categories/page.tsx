'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Category } from '@/lib/types';
import { Plus, Pencil, Trash2, FolderTree, Loader2, Save, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [quizCounts, setQuizCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) {
      toast.error('Failed to load categories');
      setLoading(false);
      return;
    }
    setCategories(data as Category[]);

    const { data: quizzes } = await supabase.from('quizzes').select('category_id');
    const counts: Record<string, number> = {};
    (quizzes ?? []).forEach((q: any) => {
      if (q.category_id) counts[q.category_id] = (counts[q.category_id] ?? 0) + 1;
    });
    setQuizCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const openCreate = () => {
    setEditId(null);
    setName('');
    setDescription('');
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditId(cat.id);
    setName(cat.name);
    setDescription(cat.description ?? '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Category name is required');
      return;
    }
    setSaving(true);
    if (editId) {
      const { error } = await supabase.from('categories').update({ name, description: description || null }).eq('id', editId);
      if (error) {
        toast.error(error.message.includes('duplicate') ? 'A category with this name already exists' : 'Failed to update category');
        setSaving(false);
        return;
      }
      toast.success('Category updated');
    } else {
      const { error } = await supabase.from('categories').insert({ name, description: description || null });
      if (error) {
        toast.error(error.message.includes('duplicate') ? 'A category with this name already exists' : 'Failed to create category');
        setSaving(false);
        return;
      }
      toast.success('Category created');
    }
    setSaving(false);
    setDialogOpen(false);
    loadCategories();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('categories').delete().eq('id', deleteId);
    if (error) {
      toast.error('Failed to delete category');
      return;
    }
    toast.success('Category deleted');
    setDeleteId(null);
    loadCategories();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-1">Organize quizzes into categories</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> New Category
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <FolderTree className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No categories yet</h3>
            <p className="text-muted-foreground mt-1 mb-4">Create categories to organize your quizzes</p>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Create Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Card key={cat.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FolderTree className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base">{cat.name}</CardTitle>
                  </div>
                  <Badge variant="secondary">{quizCounts[cat.id] ?? 0} quizzes</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground min-h-[2.5rem] mb-3">
                  {cat.description ?? 'No description'}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="gap-1.5 flex-1" onClick={() => openEdit(cat)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(cat.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Category' : 'New Category'}</DialogTitle>
            <DialogDescription>
              {editId ? 'Update the category details' : 'Create a new category to organize quizzes'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name *</Label>
              <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Mathematics" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea id="cat-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What topics does this category cover?" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editId ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the category. Quizzes in this category will also be deleted due to the cascade relationship.
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
