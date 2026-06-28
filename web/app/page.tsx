'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { feedAPI, userAPI, knowledgeAPI } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useFilter } from '@/lib/FilterContext';
import { DOMAIN_LEVEL1_LIST, getDisciplineDescription } from '@/lib/domainMapping';
import { KnowledgeFeedCard } from '@/components/cards/KnowledgeFeedCard';
import { RefreshCw, CheckCircle2, ChevronRight, BookOpen, AlertCircle, Filter, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Home() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const { activeFilter, toggleFilter } = useFilter();

  // Interface untuk state feed per tab
  interface TabFeedState {
    cards: any[];
    seenIds: string[];
    offset: number;
    hasMore: boolean;
    scrollPosition: number;
  }

  // State untuk seluruh Feed per filter
  const [feeds, setFeeds] = useState<Record<string, TabFeedState>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State untuk UI
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  // Selector helper untuk feed domain aktif
  const currentDomainKey = activeFilter.type === 'all' 
    ? '__all__' 
    : `${activeFilter.type}_${activeFilter.value}`;

  const currentFeed = feeds[currentDomainKey] || {
    cards: [],
    seenIds: [],
    offset: 0,
    hasMore: true,
    scrollPosition: 0
  };
  const cards = currentFeed.cards;
  const seenIds = currentFeed.seenIds;
  const offset = currentFeed.offset;
  const hasMore = currentFeed.hasMore;

  const limit = 10;
  
  // Pull to refresh touch handlers
  const touchStartRef = useRef(0);

  // Restore state from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedStates = sessionStorage.getItem('feed_tab_states');
      
      let parsedStates: Record<string, TabFeedState> = {};
      if (savedStates) {
        parsedStates = JSON.parse(savedStates);
        
        // Pulihkan scroll position dari fallback key jika tersimpan
        Object.keys(parsedStates).forEach(key => {
          const scrollVal = sessionStorage.getItem(`scroll_pos_${key}`);
          if (scrollVal) {
            parsedStates[key].scrollPosition = Number(scrollVal);
          }
        });
        
        setFeeds(parsedStates);
      }
      
      const activeState = parsedStates[currentDomainKey];
      if (activeState && activeState.cards.length > 0) {
        const scrollVal = sessionStorage.getItem(`scroll_pos_${currentDomainKey}`);
        const scrollPos = scrollVal ? Number(scrollVal) : (activeState.scrollPosition || 0);
        setTimeout(() => window.scrollTo(0, scrollPos), 100);
      }
    }
    setIsRestoring(false);
  }, []);

  // Save scroll position constantly to sessionStorage to minimize React re-renders
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem(`scroll_pos_${currentDomainKey}`, window.scrollY.toString());
      
      // Update juga di tab state secara pasif
      setFeeds(prev => {
        const target = prev[currentDomainKey];
        if (target) {
          return {
            ...prev,
            [currentDomainKey]: {
              ...target,
              scrollPosition: window.scrollY
            }
          };
        }
        return prev;
      });
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentDomainKey]);

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

  // Load feed ketika filter global berubah
  useEffect(() => {
    if (user && isInitialized && !isRestoring) {
      const targetFeed = feeds[currentDomainKey];
      
      if (targetFeed && targetFeed.cards.length > 0) {
        setLoading(false);
        const scrollVal = sessionStorage.getItem(`scroll_pos_${currentDomainKey}`);
        const scrollPos = scrollVal ? Number(scrollVal) : (targetFeed.scrollPosition || 0);
        setTimeout(() => window.scrollTo(0, scrollPos), 50);
      } else {
        loadFeed(0, true, activeFilter);
      }
    }
  }, [currentDomainKey, user, isInitialized, isRestoring]);

  const fetchAvailableDomains = async () => {
    try {
      const res = await knowledgeAPI.getDomains();
      if (res.success) {
        setAvailableDomains(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch domains");
      setAvailableDomains(['science', 'history', 'technology', 'philosophy', 'arts', 'nature']);
    }
  };

  const loadFeed = async (newOffset: number, reset = false, filter = activeFilter) => {
    if (!user) return;
    const domainKey = filter.type === 'all' ? '__all__' : `${filter.type}_${filter.value}`;
    
    if (reset) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      let res;
      const targetFeed = feeds[domainKey] || { cards: [], seenIds: [], offset: 0, hasMore: true, scrollPosition: 0 };
      const querySeenIds = reset ? [] : targetFeed.seenIds;

      const filterDomains = filter.type !== 'all' ? filter.domains : undefined;
      res = await feedAPI.getFeed(limit, newOffset, filterDomains, querySeenIds);

      if (res.success) {
        const incomingCards = res.data || [];
        const incomingIds = incomingCards.map((c: any) => c.id);

        setFeeds((prev) => {
          let updatedFeed: TabFeedState;
          if (reset) {
            updatedFeed = {
              cards: incomingCards,
              seenIds: incomingIds,
              offset: 0,
              hasMore: incomingCards.length === limit,
              scrollPosition: 0
            };
          } else {
            const existingIds = new Set(targetFeed.cards.map(c => c.id));
            const newCards = incomingCards.filter((c: any) => !existingIds.has(c.id));
            const updatedCards = [...targetFeed.cards, ...newCards];
            const updatedSeenIds = [...targetFeed.seenIds, ...incomingIds];
            
            updatedFeed = {
              cards: updatedCards,
              seenIds: updatedSeenIds,
              offset: newOffset,
              hasMore: incomingCards.length === limit,
              scrollPosition: targetFeed.scrollPosition
            };
          }
          
          const updated = {
            ...prev,
            [domainKey]: updatedFeed
          };
          
          sessionStorage.setItem('feed_tab_states', JSON.stringify(updated));
          return updated;
        });
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
    const domainKey = currentDomainKey;
    const targetFeed = feeds[domainKey] || { cards: [], seenIds: [], offset: 0, hasMore: true, scrollPosition: 0 };
    
    try {
      const res = await feedAPI.refreshFeed();
      if (res.success && res.data && res.data.length > 0) {
        const newCards = res.data;
        const newIds = newCards.map((c: any) => c.id);
        
        setFeeds(prev => {
          const existingIds = new Set(targetFeed.cards.map(c => c.id));
          const filteredNewCards = newCards.filter((c: any) => !existingIds.has(c.id));
          const updatedCards = [...filteredNewCards, ...targetFeed.cards];
          const updatedSeenIds = [...newIds, ...targetFeed.seenIds];
          
          const updatedFeed = {
            ...targetFeed,
            cards: updatedCards,
            seenIds: updatedSeenIds,
            scrollPosition: 0
          };
          
          const updated = {
            ...prev,
            [domainKey]: updatedFeed
          };
          
          sessionStorage.setItem('feed_tab_states', JSON.stringify(updated));
          sessionStorage.setItem(`scroll_pos_${domainKey}`, '0');
          return updated;
        });
        
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
      }
    } catch (e: any) {
      console.error("Refresh failed:", e);
      setError("Gagal memperbarui feed: " + (e.message || ""));
    } finally {
      setIsRefreshing(false);
      setPullProgress(0);
    }
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
        setPullProgress(pull / 150);
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
      {/* Top action bar - Mobile/Desktop Feed Header */}
      <div className="sticky top-0 z-10 bg-background/70 backdrop-blur-md border-b border-border/55 shadow-sm">
        {/* Pull to refresh indicator */}
        <div 
          className="w-full flex justify-center overflow-hidden transition-all duration-200 bg-muted/40"
          style={{ height: isRefreshing ? '40px' : `${pullProgress * 40}px` }}
        >
          <div className="flex items-center text-primary text-sm font-semibold mt-2">
            <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing ? "animate-spin" : "")} 
                       style={{ transform: `rotate(${pullProgress * 180}deg)` }}/>
            {isRefreshing ? 'Memperbarui...' : pullProgress > 0.6 ? 'Lepas untuk memperbarui' : 'Tarik ke bawah'}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 max-w-2xl mx-auto w-full">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-primary tracking-wider uppercase">Feeds</span>
            <h1 className="text-xl font-extrabold text-foreground capitalize tracking-tight">
              {activeFilter.type === 'all' ? 'For You' : activeFilter.value}
            </h1>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh Feed"
            >
              <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
            </button>
            
            {/* Tombol Filter Khusus Mobile */}
            <button
              onClick={toggleFilter}
              className="p-2 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors md:hidden"
              title="Toggle Filter"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Feed Content */}
      <div className="flex-1 w-full max-w-2xl mx-auto">
        {/* Level 1 Domain Info Card */}
        {activeFilter.type === 'level1' && (
          <div className="m-4 p-5 bg-card/45 border border-border/80 rounded-2xl animate-in slide-in-from-top duration-300 shadow-sm relative overflow-hidden flex gap-4">
            <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none" />
            <div className="p-3 h-fit rounded-xl bg-primary/10 text-primary shrink-0">
              <Info className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-primary tracking-wider uppercase">Domain Rumpun Ilmu</span>
              <h2 className="text-lg font-bold text-foreground mt-0.5">{activeFilter.value}</h2>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {DOMAIN_LEVEL1_LIST.find(d => d.name === activeFilter.value)?.description || 
                 "Cabang rumpun ilmu pengetahuan terintegrasi."}
              </p>
            </div>
          </div>
        )}

        {/* Level 2 Discipline Info Card */}
        {activeFilter.type === 'level2' && (
          <div className="m-4 p-5 bg-card/45 border border-border/80 rounded-2xl animate-in slide-in-from-top duration-300 shadow-sm relative overflow-hidden flex gap-4">
            <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none" />
            <div className="p-3 h-fit rounded-xl bg-primary/10 text-primary shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-primary tracking-wider uppercase">Disiplin Ilmu</span>
              <h2 className="text-lg font-bold text-foreground mt-0.5">{activeFilter.value}</h2>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {getDisciplineDescription(activeFilter.value)}
              </p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="m-4 p-4 bg-destructive/10 text-destructive rounded-xl flex items-center border border-destructive/20 animate-in fade-in">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {loading && cards.length === 0 ? (
          <div className="flex flex-col w-full pb-8">
            {Array(3).fill(0).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : cards.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in">
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

// --- Skeleton Card Component ---
function SkeletonCard() {
  return (
    <article className="flex w-full border-b border-border/40 bg-background px-4 py-5 sm:px-6 animate-pulse">
      {/* Left column */}
      <div className="flex flex-col items-center mr-4">
        <div className="h-10 w-10 rounded-full bg-muted/65" />
        <div className="mt-2 w-0.5 grow rounded-full bg-muted/30 min-h-[60px]" />
      </div>
      
      {/* Right column */}
      <div className="flex w-full flex-col">
        {/* Header */}
        <div className="flex justify-between items-center w-full">
          <div className="h-4 w-20 bg-muted/60 rounded-full" />
          <div className="h-3 w-12 bg-muted/40 rounded-full" />
        </div>
        
        {/* Title */}
        <div className="mt-3 h-5 w-3/4 bg-muted/75 rounded-md" />
        
        {/* Content Lines */}
        <div className="mt-3 space-y-2">
          <div className="h-4 w-full bg-muted/50 rounded-md" />
          <div className="h-4 w-full bg-muted/50 rounded-md" />
          <div className="h-4 w-5/6 bg-muted/50 rounded-md" />
        </div>
        
        {/* Tags */}
        <div className="mt-4 flex gap-2">
          <div className="h-5 w-12 bg-muted/45 rounded-md" />
          <div className="h-5 w-16 bg-muted/45 rounded-md" />
        </div>
      </div>
    </article>
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
