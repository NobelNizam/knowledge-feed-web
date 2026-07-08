'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setError('');
    setIsSubmitting(true);
    
    try {
      const res = await authAPI.login({ email, password });
      if (res.success) {
        login(res.user);
        router.push('/');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to login. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-sm p-8 border border-border">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Sign in to Knowledge Feed</p>
        </div>
        
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-6 text-sm text-center font-medium border border-destructive/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3.5 text-primary-foreground rounded-xl font-bold transition-all mt-2 ${
              isSubmitting ? 'bg-primary/50 cursor-not-allowed' : 'bg-primary hover:bg-primary/90 hover:shadow-md'
            }`}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center mt-8 text-muted-foreground text-sm font-medium">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
