'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainCircuit, Mail, Lock, User, Loader2, ArrowRight, Shield, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { UserRole } from '@/lib/types';
import Link from 'next/link';

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, name, role);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Account created! Welcome to QuizMaster.');
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
        <div className="relative z-10 max-w-md text-primary-foreground">
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Join the learning community today
          </h1>
          <p className="text-lg text-primary-foreground/80 leading-relaxed">
            Create your account to start taking quizzes or managing assessments. Choose your role
            and begin your journey.
          </p>
          <div className="mt-8 space-y-3">
            {['Free to get started', 'Admin & Student roles', 'Detailed performance analytics'].map((f) => (
              <div key={f} className="flex items-center gap-3 text-primary-foreground/90">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-foreground/20">
                  <ArrowRight className="h-3 w-3" />
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-primary/5 via-background to-accent/10">
        <div className="w-full max-w-md animate-slide-up">
          <div className="flex items-center gap-2 mb-8 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <span className="font-bold text-xl">QuizMaster</span>
          </div>

          <Card className="border-border/60 shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Create your account</CardTitle>
              <CardDescription>Choose your role and get started in seconds</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>I am a:</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('STUDENT')}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all',
                        role === 'STUDENT'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <GraduationCap className="h-6 w-6" />
                      <span className="text-sm font-medium">Student</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('ADMIN')}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all',
                        role === 'ADMIN'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <Shield className="h-6 w-6" />
                      <span className="text-sm font-medium">Admin</span>
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      className="pl-9"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="At least 6 characters"
                      className="pl-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Create Account <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Already have an account?{' '}
                <Link href="/login" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
