'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export function RouteGuard({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { loading, session, profile, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    if (requireAdmin && !isAdmin) {
      router.replace('/student/dashboard');
      return;
    }
    if (!requireAdmin && isAdmin && profile) {
      router.replace('/admin/dashboard');
    }
  }, [loading, session, isAdmin, profile, requireAdmin, router]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requireAdmin && !isAdmin) return null;

  return <>{children}</>;
}
