'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

export default function Login() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { login: doLogin } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setError('');
    setIsSubmitting(true);
    
    try {
      const res = await authAPI.login({ login, password });
      if (res.success) {
        doLogin(res.user ?? res.data);
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
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Bishamon!</h1>
          <p className="text-muted-foreground mt-2">Are you ready to ride, noble one?</p>
        </div>
        
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-6 text-sm text-center font-medium border border-destructive/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Username or Email</label>
            <input
              type="text"
              required
              placeholder="Which one?"
              className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Password</label>
            <input
              type="password"
              required
              placeholder="Did you remember?"
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
            {isSubmitting ? 'Mounting...' : 'Ready'}
          </button>
        </form>

        <p className="text-center mt-8 text-muted-foreground text-sm font-medium">
          I don&apos;t have a horse yet.{' '}
          <Link href="/register" className="text-primary hover:underline">
            Summon one.
          </Link>
        </p>
      </div>
    </div>
  );
}
