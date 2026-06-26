'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Virtuoso } from 'react-virtuoso';
import KnowledgeCard from '@/components/KnowledgeCard';
import { feedAPI, knowledgeAPI, userAPI } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function Home() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const debouncedSelectedDomains = useDebounce(selectedDomains, 500);
  const [offset, setOffset] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  // Referensi untuk carousel
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [initialScrollLeft, setInitialScrollLeft] = useState(0);

  // Restore state from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCards = sessionStorage.getItem('feed_cards');
      const savedOffset = sessionStorage.getItem('feed_offset');
      const savedDomains = sessionStorage.getItem('feed_domains');
      const savedScroll = sessionStorage.getItem('feed_scroll');
      
      if (savedCards) setCards(JSON.parse(savedCards));
      if (savedOffset) setOffset(Number(savedOffset));
      if (savedDomains) setSelectedDomains(JSON.parse(savedDomains));
      
      if (savedScroll) {
        // Wait for DOM to render cards, then scroll
        setTimeout(() => window.scrollTo(0, Number(savedScroll)), 100);
      }
    }
    setIsRestoring(false);
  }, []);

  // Save scroll position constantly
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('feed_scroll', window.scrollY.toString());
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      knowledgeAPI.getDomains().then(res => {
        if (res.data) setAvailableDomains(res.data.map((d: any) => d.domain));
        setIsInitialized(true);
      }).catch(err => console.error("Failed to load domains:", err));
    }
  }, [user]);

  useEffect(() => {
    if (user && isInitialized && !isRestoring) {
      // If we restored cards and domains haven't changed, skip initial fetch
      const savedDomains = sessionStorage.getItem('feed_domains');
      const savedCards = sessionStorage.getItem('feed_cards');
      
      if (savedCards && savedDomains === JSON.stringify(debouncedSelectedDomains)) {
        setLoading(false);
      } else {
        loadFeed(debouncedSelectedDomains);
      }
      
      // Save current selected domains
      sessionStorage.setItem('feed_domains', JSON.stringify(debouncedSelectedDomains));
      
      // Simpan perubahan filter ke database di latar belakang
      if (user.id) {
        userAPI.updatePreferences(debouncedSelectedDomains).catch(err => {
          console.error("Gagal menyimpan preferensi:", err);
        });
      }
    }
  }, [debouncedSelectedDomains, user, isInitialized, isRestoring]);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        carousel.scrollLeft += e.deltaY;
      }
    };
    carousel.addEventListener('wheel', handleWheel, { passive: false });
    return () => carousel.removeEventListener('wheel', handleWheel);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setInitialScrollLeft(carouselRef.current.scrollLeft);
  };
  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    carouselRef.current.scrollLeft = initialScrollLeft - walk;
  };

  const extractAndAddDomains = (newCards: any[]) => {
    setAvailableDomains(prev => {
      const domains = new Set(prev);
      newCards.forEach(card => {
        if (card.domain) domains.add(card.domain);
      });
      return Array.from(domains);
    });
  };

  const loadFeed = async (domainsToFetch: string[]) => {
    try {
      setLoading(true);
      const data = domainsToFetch.length > 0
        ? await feedAPI.getPersonalizedFeed(domainsToFetch, 20, 0)
        : await feedAPI.getFeed(20, 0);
      
      const incomingCards = data.data || [];
      setCards(incomingCards);
      extractAndAddDomains(incomingCards);
      setOffset(20);
      
      // Save to sessionStorage
      sessionStorage.setItem('feed_cards', JSON.stringify(incomingCards));
      sessionStorage.setItem('feed_offset', '20');
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore) return;
    try {
      setLoadingMore(true);
      const data = debouncedSelectedDomains.length > 0
        ? await feedAPI.getPersonalizedFeed(debouncedSelectedDomains, 20, offset)
        : await feedAPI.getFeed(20, offset);
      
      const incomingCards = data.data || [];
      if (incomingCards.length > 0) {
        setCards(prev => {
          const newCards = [...prev, ...incomingCards];
          sessionStorage.setItem('feed_cards', JSON.stringify(newCards));
          return newCards;
        });
        extractAndAddDomains(incomingCards);
        setOffset(prev => {
          const newOffset = prev + 20;
          sessionStorage.setItem('feed_offset', newOffset.toString());
          return newOffset;
        });
      }
    } catch (error) {
      console.error('Failed to load more:', error);
    } finally {
      setLoadingMore(false);
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
          <div className="text-4xl mb-3 animate-pulse">⏳</div>
          <p className="text-gray-500 font-medium">Memverifikasi sesi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-20">
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

      <div className="max-w-2xl mx-auto px-4 py-6 w-full">
        {/* Filter Section with Carousel and Dropdown */}
        <div className="mb-6 flex items-center gap-2 relative">
          <div 
            ref={carouselRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className="flex overflow-x-auto pb-2 touch-pan-x gap-2 flex-1 cursor-grab active:cursor-grabbing"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style jsx>{`
              div::-webkit-scrollbar { display: none; }
            `}</style>
            {availableDomains.map(domain => (
              <button
                key={domain}
                onClick={() => toggleDomain(domain)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0 ${
                  selectedDomains.includes(domain)
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {domain}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="shrink-0 p-2 bg-white border border-gray-200 rounded-full text-gray-600 hover:bg-gray-50 shadow-sm transition-colors z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          {showDropdown && (
            <div className="absolute top-12 right-0 bg-white border border-gray-200 shadow-xl rounded-xl p-4 w-64 z-30 flex flex-wrap gap-2">
              <div className="w-full text-xs font-bold text-gray-400 mb-1">SEMUA KATEGORI</div>
              {availableDomains.map(domain => (
                <button
                  key={`drop-${domain}`}
                  onClick={() => toggleDomain(domain)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedDomains.includes(domain)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {domain}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-full">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3 animate-pulse">⏳</div>
              <p className="text-gray-500">Loading knowledge...</p>
            </div>
          ) : cards.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-500">No cards found</p>
            </div>
          ) : (
            <Virtuoso
              useWindowScroll
              data={cards}
              overscan={1000}
              itemContent={(_index, card) => (
                <div className="pb-4">
                  <KnowledgeCard card={card} />
                </div>
              )}
              components={{
                Footer: () => (
                  <div className="py-6 pb-12 flex justify-center items-center">
                    {loadingMore ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500"></div>
                        <p className="text-gray-500 text-sm font-medium">Memanggil AI...</p>
                      </div>
                    ) : (
                      <button
                        onClick={loadMore}
                        className="w-full max-w-sm py-3 px-6 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 active:scale-95 transition-all shadow-sm hover:shadow-md"
                      >
                        Tampilkan Lebih Banyak
                      </button>
                    )}
                  </div>
                )
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
