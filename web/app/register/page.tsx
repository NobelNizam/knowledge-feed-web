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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-2">Join Knowledge Feed today</p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              required
              minLength={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-2">Must be at least 8 characters with letters and numbers</p>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 text-white rounded-lg font-medium transition-colors ${
              isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
