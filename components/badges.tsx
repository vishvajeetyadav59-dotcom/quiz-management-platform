'use client';

import { Badge } from '@/components/ui/badge';
import { Difficulty, QuizStatus, AttemptStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const styles: Record<Difficulty, string> = {
    EASY: 'bg-success/10 text-success border-success/20',
    INTERMEDIATE: 'bg-warning/10 text-warning border-warning/20',
    ADVANCED: 'bg-destructive/10 text-destructive border-destructive/20',
  };
  return (
    <Badge variant="outline" className={cn('capitalize', styles[difficulty])}>
      {difficulty.toLowerCase()}
    </Badge>
  );
}

export function QuizStatusBadge({ status }: { status: QuizStatus }) {
  const styles: Record<QuizStatus, string> = {
    DRAFT: 'bg-muted text-muted-foreground border-border',
    PUBLISHED: 'bg-success/10 text-success border-success/20',
    UNPUBLISHED: 'bg-warning/10 text-warning border-warning/20',
  };
  return (
    <Badge variant="outline" className={cn('capitalize', styles[status])}>
      {status.toLowerCase()}
    </Badge>
  );
}

export function AttemptStatusBadge({ status }: { status: AttemptStatus }) {
  const styles: Record<AttemptStatus, string> = {
    PASSED: 'bg-success/10 text-success border-success/20',
    FAILED: 'bg-destructive/10 text-destructive border-destructive/20',
  };
  return (
    <Badge variant="outline" className={cn('capitalize', styles[status])}>
      {status.toLowerCase()}
    </Badge>
  );
}
