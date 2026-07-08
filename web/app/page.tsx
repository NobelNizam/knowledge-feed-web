'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useFilter } from '@/lib/FilterContext';
import { knowledgeAPI } from '@/lib/api';
import { DOMAIN_LEVEL1_LIST, getDisciplineDescription } from '@/lib/domainMapping';
import { KnowledgeFeedCard } from '@/components/cards/KnowledgeFeedCard';
import { SkeletonCard } from '@/components/cards/SkeletonCard';
import { OnboardingView } from '@/components/OnboardingView';
import { useFeedState } from '@/hooks/useFeedState';
import { RefreshCw, BookOpen, AlertCircle, Filter, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { activeFilter, toggleFilter } = useFilter();

  const [isInitialized, setIsInitialized] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [availableDomains, setAvailableDomains] = useState<{id: number, name: string}[]>([]);

  const currentDomainKey = activeFilter.type === 'all' 
    ? '__all__' 
    : `${activeFilter.type}_${activeFilter.value}`;

  // Use custom hook for managing feed states and actions
  const {
    cards,
    loading,
    loadingMore,
    error,
    hasMore,
    isRefreshing,
    pullProgress,
    isRestoring,
    isGenerating,
    generationStep,
    generationProgress,
    estimatedSecondsLeft,
    loadMore,
    handleRefresh,
    touchHandlers
  } = useFeedState({
    user,
    isInitialized,
    activeFilter,
    currentDomainKey
  });

  // Verify authentication and onboarding needs — runs once only
  useEffect(() => {
    if (isInitialized) return;
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      if (!user.followedDomains || user.followedDomains.length === 0) {
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
  }, [user, authLoading, router, isInitialized]);

  const fetchAvailableDomains = async () => {
    try {
      const res = await knowledgeAPI.getDomains();
      if (res.success && res.data?.length > 0) {
        setAvailableDomains(res.data);
        return;
      }
    } catch (err) {
      console.error("Failed to fetch domains");
    }
    setAvailableDomains([{id: 0, name: 'Science'}, {id: 0, name: 'History'}, {id: 0, name: 'Technology'}, {id: 0, name: 'Philosophy'}, {id: 0, name: 'Arts'}, {id: 0, name: 'Nature'}]);
  };

  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <RefreshCw className="animate-spin text-muted-foreground w-8 h-8" />
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingView 
        availableDomains={availableDomains} 
        onComplete={() => {
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('feed_tab_states');
          }
          setShowOnboarding(false);
        }} 
      />
    );
  }

  return (
    <div 
      className="flex flex-col flex-1 pb-20 md:pb-0"
      {...touchHandlers}
    >
      {/* Top Action Bar / Header */}
      <div className="sticky top-0 z-10 bg-background/70 backdrop-blur-md border-b border-border/55 shadow-sm">
        {/* Pull-to-refresh Indicator */}
        <div 
          className="w-full flex justify-center overflow-hidden transition-all duration-200 bg-muted/40"
          style={{ height: isRefreshing ? '40px' : `${pullProgress * 40}px` }}
        >
          <div className="flex items-center text-primary text-sm font-semibold mt-2">
            <RefreshCw 
              className={cn("w-4 h-4 mr-2", isRefreshing ? "animate-spin" : "")} 
              style={{ transform: `rotate(${pullProgress * 180}deg)` }}
            />
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
              disabled={isRefreshing || isGenerating}
              className="p-2 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Refresh Feed"
            >
              <RefreshCw className={cn("w-5 h-5", (isRefreshing || isGenerating) && "animate-spin")} />
            </button>
            
            <button
              onClick={toggleFilter}
              className="p-2 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors lg:hidden"
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
              disabled={isRefreshing || isGenerating}
              className="mt-6 px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefreshing || isGenerating ? 'Sedang Memproses...' : 'Segarkan Feed'}
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
                  onClick={loadMore}
                  disabled={loadingMore || isGenerating}
                  className="px-6 py-2.5 rounded-full border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
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

      {/* Glassmorphism AI Pipeline Generation Loading Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-md transition-all duration-300 animate-in fade-in">
          <div className="bg-card/75 border border-border/80 p-8 rounded-3xl shadow-2xl max-w-md w-full mx-4 flex flex-col items-center relative overflow-hidden backdrop-blur-lg">
            {/* Background decorative glow */}
            <div className="absolute -right-16 -top-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
            
            {/* Spinner Icon */}
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary animate-pulse">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            
            <span className="text-[10px] font-bold text-primary tracking-widest uppercase mb-1">AI Pipeline Processing</span>
            <h3 className="text-xl font-extrabold text-foreground tracking-tight text-center mb-2">Menyiapkan Konten Pengetahuan</h3>
            
            {/* Step Description */}
            <p className="text-sm text-muted-foreground text-center mb-6 min-h-[40px] px-2 leading-relaxed">
              {getStepDescription(generationStep)}
            </p>
            
            {/* Progress Bar */}
            <div className="w-full bg-muted/60 h-2.5 rounded-full overflow-hidden mb-4 border border-border/20">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
            
            <div className="flex justify-between w-full text-xs font-semibold text-muted-foreground px-1">
              <span>Progres: {generationProgress}%</span>
              {estimatedSecondsLeft > 0 ? (
                <span className="text-foreground font-bold">~{estimatedSecondsLeft} detik sisa</span>
              ) : (
                <span className="text-foreground font-bold">Menyelesaikan...</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Deskripsi langkah-langkah AI Pipeline untuk loading overlay
function getStepDescription(step: string): string {
  switch (step) {
    case 'initialize':
      return 'Menginisialisasi basis pengetahuan...';
    case 'crawl':
      return 'Mengunduh referensi jurnal ilmiah terpercaya dari arXiv...';
    case 'clean':
      return 'Membersihkan dan menyaring duplikasi dokumen...';
    case 'save_sources':
      return 'Menyimpan dokumen referensi ke database...';
    case 'chunk':
      return 'Memecah dokumen menjadi bagian-bagian kecil (chunking)...';
    case 'embed':
      return 'Membuat vektor embedding dari dokumen...';
    case 'store_vectors':
      return 'Menyimpan vektor dokumen ke Vector Store (PGVector)...';
    case 'retrieve_generate':
      return 'Melakukan RAG & merumuskan konten feed dengan AI...';
    case 'fact_check':
      return 'Memverifikasi kebenaran fakta klaim konten secara ilmiah...';
    case 'moderate':
      return 'Melakukan moderasi keamanan konten dan toksisitas...';
    case 'publish':
      return 'Menerbitkan kartu pengetahuan ke timeline Anda...';
    case 'invalidate_cache':
      return 'Menyinkronkan cache feed...';
    case 'generate_fallback':
      return 'Menyiapkan konten pengetahuan (mode cepat)...';
    default:
      return 'Menghubungkan ke AI pipeline...';
  }
}
