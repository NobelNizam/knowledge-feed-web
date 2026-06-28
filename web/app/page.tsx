'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { feedAPI, userAPI, knowledgeAPI } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { KnowledgeFeedCard } from '@/components/cards/KnowledgeFeedCard';
import { RefreshCw, CheckCircle2, ChevronRight, BookOpen, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Home() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  // State untuk Feed
  const [cards, setCards] = useState<any[]>([]);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 10;
  
  // State untuk Filter & UI
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  // Drag to scroll carousel
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Pull to refresh touch handlers
  const touchStartRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Restore state from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCards = sessionStorage.getItem('feed_cards');
      const savedOffset = sessionStorage.getItem('feed_offset');
      const savedDomain = sessionStorage.getItem('feed_domain');
      const savedScroll = sessionStorage.getItem('feed_scroll');
      const savedSeenIds = sessionStorage.getItem('feed_seenIds');
      
      if (savedCards) setCards(JSON.parse(savedCards));
      if (savedSeenIds) setSeenIds(JSON.parse(savedSeenIds));
      if (savedOffset) setOffset(Number(savedOffset));
      if (savedDomain) setActiveDomain(savedDomain === '__all__' ? null : savedDomain);
      
      if (savedScroll) {
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

  // Check auth and onboarding
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      if (!user.preferences?.domains || user.preferences.domains.length === 0) {
        setShowOnboarding(true);
        fetchAvailableDomains();
        setIsInitialized(true);
      } else {
        setShowOnboarding(false);
        fetchAvailableDomains().then(() => {
          setIsInitialized(true);
        });
      }
    }
  }, [user, authLoading, router]);

  // Load feed when activeDomain changes
  useEffect(() => {
    if (user && isInitialized && !isRestoring) {
      const savedDomain = sessionStorage.getItem('feed_domain');
      const savedCards = sessionStorage.getItem('feed_cards');
      const currentDomainKey = activeDomain ?? '__all__';
      
      if (savedCards && savedDomain === currentDomainKey) {
        setLoading(false);
      } else {
        loadFeed(0, true, activeDomain);
      }
      
      sessionStorage.setItem('feed_domain', currentDomainKey);
    }
  }, [activeDomain, user, isInitialized, isRestoring]);

  const fetchAvailableDomains = async () => {
    try {
      const res = await knowledgeAPI.getDomains();
      if (res.success) {
        setAvailableDomains(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch domains");
      // Fallback
      setAvailableDomains(['science', 'history', 'technology', 'philosophy', 'arts', 'nature']);
    }
  };

  const loadFeed = async (newOffset: number, reset = false, domain = activeDomain) => {
    if (!user) return;
    if (reset) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      let res;
      const querySeenIds = reset ? [] : seenIds;

      if (domain) {
        res = await feedAPI.getFeed(limit, newOffset, [domain], querySeenIds);
      } else {
        // Filter "Semua": Ambil secara acak dari seluruh bidang di DB, abaikan filter preferensi agar benar-benar acak semua bidang
        res = await feedAPI.getFeed(limit, newOffset, undefined, querySeenIds);
      }

      if (res.success) {
        const incomingCards = res.data || [];
        const incomingIds = incomingCards.map((c: any) => c.id);

        if (reset) {
          setCards(incomingCards);
          setSeenIds(incomingIds);
          sessionStorage.setItem('feed_cards', JSON.stringify(incomingCards));
          sessionStorage.setItem('feed_seenIds', JSON.stringify(incomingIds));
          sessionStorage.setItem('feed_offset', '0');
        } else {
          setCards((prev) => {
            const existingIds = new Set(prev.map(c => c.id));
            const newCards = incomingCards.filter((c: any) => !existingIds.has(c.id));
            const updated = [...prev, ...newCards];
            sessionStorage.setItem('feed_cards', JSON.stringify(updated));
            return updated;
          });
          setSeenIds((prev) => {
            const updated = [...prev, ...incomingIds];
            sessionStorage.setItem('feed_seenIds', JSON.stringify(updated));
            return updated;
          });
          sessionStorage.setItem('feed_offset', newOffset.toString());
        }
        
        setHasMore(incomingCards.length === limit);
        setOffset(newOffset);
      } else {
        setError(res.error || "Failed to load feed");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsRefreshing(false);
      setPullProgress(0);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await feedAPI.refreshFeed();
      if (res.success && res.data && res.data.length > 0) {
        const newCards = res.data;
        const newIds = newCards.map((c: any) => c.id);
        
        setCards(prev => {
          const updated = [...newCards, ...prev];
          sessionStorage.setItem('feed_cards', JSON.stringify(updated));
          return updated;
        });
        setSeenIds(prev => {
          const updated = [...newIds, ...prev];
          sessionStorage.setItem('feed_seenIds', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (e: any) {
      console.error("Refresh failed:", e);
      setError("Gagal memperbarui feed: " + (e.message || ""));
    } finally {
      setIsRefreshing(false);
      setPullProgress(0);
    }
  };

  const handleDomainSelect = (domain: string | null) => {
    if (domain === activeDomain) return; // Prevent double fetch
    setActiveDomain(domain);
    loadFeed(0, true, domain);
  };

  // --- Touch & Scroll Handlers ---
  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartRef.current = e.touches[0].clientY;
    } else {
      touchStartRef.current = 0;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current > 0 && window.scrollY <= 0) {
      const pull = e.touches[0].clientY - touchStartRef.current;
      if (pull > 0 && pull < 150) {
        setPullProgress(pull / 150); // 0 to 1
        if (e.cancelable) e.preventDefault();
      }
    }
  };

  const onTouchEnd = () => {
    if (pullProgress > 0.6 && !isRefreshing && !loading) {
      handleRefresh();
    } else {
      setPullProgress(0);
    }
    touchStartRef.current = 0;
  };

  // Carousel Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
  };
  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  if (authLoading) {
    return <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-muted-foreground w-8 h-8" /></div>;
  }

  if (showOnboarding) {
    return <OnboardingView 
      availableDomains={availableDomains} 
      onComplete={() => {
        refreshUser();
        setShowOnboarding(false);
        loadFeed(0, true);
      }} 
    />;
  }

  return (
    <div 
      className="flex flex-col flex-1 pb-20 md:pb-0"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Top action bar - Desktop refresh & Domain Filter */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
        {/* Pull to refresh indicator */}
        <div 
          className="w-full flex justify-center overflow-hidden transition-all duration-200 bg-muted"
          style={{ height: isRefreshing ? '40px' : `${pullProgress * 40}px` }}
        >
          <div className="flex items-center text-primary text-sm font-medium mt-2">
            <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing ? "animate-spin" : "")} 
                       style={{ transform: `rotate(${pullProgress * 180}deg)` }}/>
            {isRefreshing ? 'Memperbarui...' : pullProgress > 0.6 ? 'Lepas untuk memperbarui' : 'Tarik ke bawah'}
          </div>
        </div>

        <div className="flex items-center justify-between p-3">
          <div className="flex items-center">
            <h1 className="text-xl font-bold md:hidden">For You</h1>
            <div 
              ref={carouselRef}
              className="hidden md:flex overflow-x-auto no-scrollbar gap-2 cursor-grab active:cursor-grabbing px-2 py-1"
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
            >
              <button
                onClick={() => handleDomainSelect(null)}
                className={cn(
                  "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                  activeDomain === null 
                    ? "bg-foreground text-background border-foreground" 
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                )}
              >
                Semua
              </button>
              {availableDomains.map((domain) => (
                <button
                  key={domain}
                  onClick={() => handleDomainSelect(domain)}
                  className={cn(
                    "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize",
                    activeDomain === domain 
                      ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {domain}
                </button>
              ))}
            </div>
          </div>
          
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="hidden md:flex p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
            title="Refresh Feed"
          >
            <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
          </button>
        </div>

        {/* Mobile Domain Filter */}
        <div 
          className="md:hidden flex overflow-x-auto no-scrollbar gap-2 px-3 pb-3 pt-1 border-t border-border"
        >
          <button
            onClick={() => handleDomainSelect(null)}
            className={cn(
              "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
              activeDomain === null 
                ? "bg-foreground text-background border-foreground" 
                : "bg-background text-muted-foreground border-border"
            )}
          >
            Semua
          </button>
          {availableDomains.map((domain) => (
            <button
              key={domain}
              onClick={() => handleDomainSelect(domain)}
              className={cn(
                "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize",
                activeDomain === domain 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-background text-muted-foreground border-border"
              )}
            >
              {domain}
            </button>
          ))}
        </div>
      </div>

      {/* Main Feed Content */}
      <div className="flex-1 w-full max-w-2xl mx-auto">
        {error && !loading && (
          <div className="m-4 p-4 bg-destructive/10 text-destructive rounded-xl flex items-center border border-destructive/20">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {loading && cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <RefreshCw className="w-8 h-8 animate-spin mb-4" />
            <p className="font-medium">Menyiapkan pengetahuan untuk Anda...</p>
          </div>
        ) : cards.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
              <BookOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Belum ada konten</h3>
            <p className="text-muted-foreground max-w-md">
              Mungkin AI pipeline sedang memproses data baru. Coba segarkan halaman beberapa saat lagi.
            </p>
            <button 
              onClick={handleRefresh}
              className="mt-6 px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium shadow-sm hover:bg-primary/90 transition-all"
            >
              Segarkan Feed
            </button>
          </div>
        ) : (
          <div className="flex flex-col w-full pb-8">
            {cards.map((card, idx) => (
              <KnowledgeFeedCard key={`${card.id}-${idx}`} card={card} />
            ))}
            
            {hasMore && (
              <div className="flex justify-center p-8">
                <button
                  onClick={() => loadFeed(offset + limit)}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-full border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors flex items-center gap-2"
                >
                  {loadingMore ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Memuat...</>
                  ) : (
                    'Tampilkan Lebih Banyak'
                  )}
                </button>
              </div>
            )}
            
            {!hasMore && cards.length > 0 && (
              <div className="text-center py-12 pb-24 text-muted-foreground text-sm font-medium px-4">
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm max-w-md mx-auto">
                  <p className="font-bold text-foreground mb-1">🎉 Anda sudah melihat semua konten!</p>
                  <p className="text-xs text-muted-foreground">Tarik ke atas (atau klik tombol refresh di atas) untuk konten baru yang disiapkan AI.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Onboarding Component ---
function OnboardingView({ availableDomains, onComplete }: { availableDomains: string[], onComplete: () => void }) {
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleDomain = (domain: string) => {
    setSelectedDomains(prev => 
      prev.includes(domain) 
        ? prev.filter(d => d !== domain)
        : [...prev, domain]
    );
  };

  const handleSave = async () => {
    if (selectedDomains.length === 0) return;
    setIsSubmitting(true);
    try {
      await userAPI.updatePreferences(selectedDomains, 'intermediate');
      onComplete();
    } catch (err) {
      console.error("Failed to save preferences", err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-background">
      <div className="max-w-xl w-full bg-card p-8 rounded-3xl shadow-sm border border-border">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
          <BookOpen className="w-8 h-8 text-primary" />
        </div>
        
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">
          Pilih Minat Anda
        </h1>
        <p className="text-muted-foreground text-lg mb-8">
          Pilih topik yang ingin Anda pelajari. AI kami akan menyusun feed khusus untuk Anda.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
          {availableDomains.length > 0 ? availableDomains.map(domain => {
            const isSelected = selectedDomains.includes(domain);
            return (
              <button
                key={domain}
                onClick={() => toggleDomain(domain)}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 relative overflow-hidden",
                  isSelected 
                    ? "border-primary bg-primary/5 text-primary" 
                    : "border-border hover:border-primary/50 text-muted-foreground hover:bg-muted"
                )}
              >
                <span className="capitalize font-bold">{domain}</span>
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="w-4 h-4 text-primary fill-primary/20" />
                  </div>
                )}
              </button>
            )
          }) : (
            // Fallback skeleton
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse"></div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {selectedDomains.length} topik dipilih
          </p>
          <button
            onClick={handleSave}
            disabled={selectedDomains.length === 0 || isSubmitting}
            className={cn(
              "px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all shadow-sm",
              selectedDomains.length > 0
                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isSubmitting ? 'Menyimpan...' : 'Mulai Membaca'} 
            {!isSubmitting && <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
