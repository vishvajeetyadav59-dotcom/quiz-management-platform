'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { loading, session, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/login');
    } else if (isAdmin) {
      router.replace('/admin/dashboard');
    } else {
      router.replace('/student/dashboard');
    }
  }, [loading, session, isAdmin, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
