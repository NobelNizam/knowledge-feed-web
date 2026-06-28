'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Za-z]/.test(pass) || !/[0-9]/.test(pass)) {
      return 'Password must contain both letters and numbers';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const passError = validatePassword(password);
    if (passError) {
      setError(passError);
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await authAPI.register({ name, email, password });
      if (res.success) {
        login(res.user);
        router.push('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to register. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-sm p-8 border border-border">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Create Account</h1>
          <p className="text-muted-foreground mt-2">Join Knowledge Feed today</p>
        </div>
        
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-6 text-sm text-center font-medium border border-destructive/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Full Name</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
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
              minLength={8}
              className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-2 font-medium">Must be at least 8 characters with letters and numbers</p>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3.5 text-primary-foreground rounded-xl font-bold transition-all mt-2 ${
              isSubmitting ? 'bg-primary/50 cursor-not-allowed' : 'bg-primary hover:bg-primary/90 hover:shadow-md'
            }`}
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-8 text-muted-foreground text-sm font-medium">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
