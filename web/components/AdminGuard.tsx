'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'ADMIN') {
        router.push('/');
      } else {
        setAuthorized(true);
      }
    }
  }, [user, loading, router]);

  if (loading || !authorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-indigo-600 mb-4"></div>
        <p className="text-slate-500 font-medium">Verifying authorization...</p>
      </div>
    );
  }

  return <>{children}</>;
}
