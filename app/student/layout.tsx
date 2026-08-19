'use client';

import { RouteGuard } from '@/components/route-guard';
import { Navbar } from '@/components/navbar';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="container mx-auto px-4 lg:px-6 py-6 max-w-7xl">{children}</main>
      </div>
    </RouteGuard>
  );
}
