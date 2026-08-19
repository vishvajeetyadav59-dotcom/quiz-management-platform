'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BrainCircuit, LayoutDashboard, ClipboardList, FolderTree, BarChart3, GraduationCap, LogOut, User, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function Navbar() {
  const { profile, signOut, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const adminLinks = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/quizzes', label: 'Quizzes', icon: ClipboardList },
    { href: '/admin/categories', label: 'Categories', icon: FolderTree },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/results', label: 'Results', icon: Trophy },
  ];

  const studentLinks = [
    { href: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/student/quizzes', label: 'Browse Quizzes', icon: ClipboardList },
    { href: '/student/results', label: 'My Results', icon: Trophy },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Signed out', description: 'You have been logged out successfully.' });
    router.replace('/login');
  };

  const initials = profile?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'U';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 lg:px-6">
        <div className="flex items-center gap-2 font-bold text-lg">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <span className="hidden sm:inline">QuizMaster</span>
        </div>

        <nav className="ml-8 hidden md:flex items-center gap-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Button
                key={link.href}
                variant={active ? 'secondary' : 'ghost'}
                size="sm"
                className={cn('gap-2', active && 'font-semibold')}
                onClick={() => router.push(link.href)}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {isAdmin && (
            <Badge variant="secondary" className="hidden sm:inline-flex gap-1">
              <User className="h-3 w-3" /> Admin
            </Badge>
          )}
          {!isAdmin && (
            <Badge variant="outline" className="hidden sm:inline-flex gap-1">
              <GraduationCap className="h-3 w-3" /> Student
            </Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{profile?.name}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <nav className="flex md:hidden items-center gap-1 overflow-x-auto px-4 pb-2 scrollbar-thin">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Button
              key={link.href}
              variant={active ? 'secondary' : 'ghost'}
              size="sm"
              className={cn('gap-2 shrink-0', active && 'font-semibold')}
              onClick={() => router.push(link.href)}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Button>
          );
        })}
      </nav>
    </header>
  );
}
