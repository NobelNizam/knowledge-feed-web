'use client';

import { useState, useEffect } from 'react';
import { knowledgeAPI } from '@/lib/api';
import { KnowledgeFeedCard } from '@/components/cards/KnowledgeFeedCard';
import { Search as SearchIcon, RefreshCw, AlertCircle, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import type { CardData } from '@/lib/types';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  
  const [results, setResults] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Debounce input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(handler);
  }, [query]);

  // Fetch Domains
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const res = await knowledgeAPI.getDomains();
        if (res.success) {
          setAvailableDomains(res.data);
        }
      } catch (err) {
        setAvailableDomains(['science', 'history', 'technology', 'philosophy', 'arts', 'nature']);
      }
    };
    fetchDomains();
  }, []);

  // Perform search
  useEffect(() => {
    const doSearch = async () => {
      if (!debouncedQuery.trim() && !activeDomain) {
        setResults([]);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const res = await knowledgeAPI.search(debouncedQuery, activeDomain || undefined);
        if (res.success) {
          setResults(res.data);
        } else {
          setError(res.error || 'Gagal melakukan pencarian');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mencari');
      } finally {
        setLoading(false);
      }
    };
    
    doSearch();
  }, [debouncedQuery, activeDomain]);

  if (authLoading) return null;

  return (
    <div className="flex flex-col flex-1 w-full max-w-2xl mx-auto border-x border-border min-h-screen bg-background">
      
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border p-4">
        {/* Search Bar */}
        <div className="relative mb-3">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-input rounded-2xl leading-5 bg-muted/50 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-colors"
            placeholder="Cari pengetahuan..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Domain Filters */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
          <button
            onClick={() => setActiveDomain(null)}
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
              onClick={() => setActiveDomain(domain)}
              className={cn(
                "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize",
                activeDomain === domain 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {domain}
            </button>
          ))}
        </div>
      </div>

      {/* Results Area */}
      <div className="flex-1 w-full pb-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <RefreshCw className="w-8 h-8 animate-spin mb-4" />
            <p className="font-medium">Mencari...</p>
          </div>
        )}

        {error && !loading && (
          <div className="m-4 p-4 bg-destructive/10 text-destructive rounded-xl flex items-center border border-destructive/20">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && results.length === 0 && (query || activeDomain) && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <SearchIcon className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Tidak ada hasil</h3>
            <p className="text-muted-foreground max-w-md">
              Kami tidak menemukan apa pun yang cocok dengan pencarian Anda. Coba kata kunci yang berbeda.
            </p>
          </div>
        )}

        {!loading && !error && results.length === 0 && !query && !activeDomain && (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
              <SearchIcon className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Pencarian</h3>
            <p className="text-muted-foreground max-w-sm">
              Cari topik, judul, atau kata kunci tertentu untuk mengeksplorasi pengetahuan.
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="flex flex-col w-full">
            <div className="px-4 py-3 border-b border-border text-sm font-bold text-muted-foreground">
              Menampilkan {results.length} hasil
            </div>
            {results.map((card, idx) => (
              <KnowledgeFeedCard key={`${card.id}-${idx}`} card={card} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
