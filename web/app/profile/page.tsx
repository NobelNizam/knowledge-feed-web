'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import KnowledgeCard from '@/components/KnowledgeCard';
import { useAuth } from '@/lib/AuthContext';

export default function Profile() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  
  // Protect route
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
            <Link href="/" className="text-sm text-blue-500 hover:underline">← Back to Feed</Link>
          </div>
          <button onClick={logout} className="text-gray-500 hover:text-red-500 text-sm font-medium">
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Account Information</h2>
          <div className="space-y-4">
            <div>
              <span className="block text-sm font-medium text-gray-500">Name</span>
              <span className="text-gray-900">{user.name}</span>
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-500">Email</span>
              <span className="text-gray-900">{user.email}</span>
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-500">Reading Level</span>
              <span className="text-gray-900 capitalize">{user.preferences?.readingLevel || 'Intermediate'}</span>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Saved Cards ({user.savedCards?.length || 0})
          </h2>
          {user.savedCards && user.savedCards.length > 0 ? (
            <div className="space-y-4">
              {user.savedCards.map((card: any) => (
                <KnowledgeCard key={card.id} card={card} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="text-4xl mb-3">🔖</div>
              <p className="text-gray-500">You haven't saved any cards yet.</p>
              <Link href="/" className="text-blue-500 hover:underline mt-2 inline-block">
                Explore the feed
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
