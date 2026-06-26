'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import KnowledgeCard from '@/components/KnowledgeCard';
import { feedAPI, knowledgeAPI } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

export default function Home() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      knowledgeAPI.getDomains().then(res => {
        if (res.data) {
          setAvailableDomains(res.data.map((d: any) => d.domain));
        }
      }).catch(err => console.error("Failed to load domains:", err));
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadFeed();
    }
  }, [selectedDomains, user]);

  const extractAndAddDomains = (newCards: any[]) => {
    setAvailableDomains(prev => {
      const domains = new Set(prev);
      newCards.forEach(card => {
        if (card.domain) domains.add(card.domain);
      });
      return Array.from(domains);
    });
  };

  const loadFeed = async () => {
    try {
      setLoading(true);
      const data = selectedDomains.length > 0
        ? await feedAPI.getPersonalizedFeed(selectedDomains, 20, 0)
        : await feedAPI.getFeed(20, 0);
      
      const incomingCards = data.data || [];
      setCards(incomingCards);
      extractAndAddDomains(incomingCards);
      setOffset(20);
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    try {
      const data = selectedDomains.length > 0
        ? await feedAPI.getPersonalizedFeed(selectedDomains, 20, offset)
        : await feedAPI.getFeed(20, offset);
      
      const incomingCards = data.data || [];
      setCards([...cards, ...incomingCards]);
      extractAndAddDomains(incomingCards);
      setOffset(offset + 20);
    } catch (error) {
      console.error('Failed to load more:', error);
    }
  };

  const toggleDomain = (domain: string) => {
    setSelectedDomains(prev =>
      prev.includes(domain)
        ? prev.filter(d => d !== domain)
        : [...prev, domain]
    );
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-3">⏳</div>
          <p className="text-gray-500 font-medium">Memverifikasi sesi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📚 Knowledge Feed</h1>
            <p className="text-sm text-gray-500">Transform scrolling into knowledge</p>
          </div>
          <div className="flex gap-4 items-center">
            <Link href="/profile" className="text-blue-600 font-medium hover:underline">
              {user.name}
            </Link>
            <button onClick={logout} className="text-gray-500 hover:text-red-500 text-sm font-medium">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6 flex flex-wrap gap-2">
          {availableDomains.map(domain => (
            <button
              key={domain}
              onClick={() => toggleDomain(domain)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedDomains.includes(domain)
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {domain}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-gray-500">Loading knowledge...</p>
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500">No cards found</p>
          </div>
        ) : (
          <>
            {cards.map(card => (
              <KnowledgeCard key={card.id} card={card} />
            ))}
            <button
              onClick={loadMore}
              className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
            >
              Load More
            </button>
          </>
        )}
      </div>
    </div>
  );
}
