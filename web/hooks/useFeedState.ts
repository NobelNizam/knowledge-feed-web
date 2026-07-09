'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { feedAPI } from '@/lib/api';
import { DOMAIN_LEVEL2_MAP } from '@/lib/domainMapping';
import type { CardData } from '@/lib/types';
import type { User } from '@/lib/AuthContext';
import type { ActiveFilter } from '@/lib/FilterContext';

export interface TabFeedState {
  cards: CardData[];
  seenIds: number[];
  offset: number;
  hasMore: boolean;
  scrollPosition: number;
}

interface UseFeedStateProps {
  user: User | null;
  isInitialized: boolean;
  activeFilter: ActiveFilter;
  currentDomainKey: string;
}

export function useFeedState({ user, isInitialized, activeFilter, currentDomainKey }: UseFeedStateProps) {
  const [feeds, setFeeds] = useState<Record<string, TabFeedState>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [isRestoring, setIsRestoring] = useState(true);

  // SSE Pipeline Generation States
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [estimatedSecondsLeft, setEstimatedSecondsLeft] = useState(0);

  const limit = 10;
  const touchStartRef = useRef(0);
  const prevPreferencesRef = useRef<string>('');
  // Effect for estimated time countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating && estimatedSecondsLeft > 0) {
      interval = setInterval(() => {
        setEstimatedSecondsLeft(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isGenerating, estimatedSecondsLeft]);
  // Extract current feed state
  const currentFeed = feeds[currentDomainKey] || {
    cards: [],
    seenIds: [],
    offset: 0,
    hasMore: true,
    scrollPosition: 0
  };

  const cards = currentFeed.cards;
  const offset = currentFeed.offset;
  const hasMore = currentFeed.hasMore;

  // Restore states from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedStates = sessionStorage.getItem('feed_tab_states');
      let parsedStates: Record<string, TabFeedState> = {};
      
      if (savedStates) {
        try {
          parsedStates = JSON.parse(savedStates);
          
          // Verify if cache is stale
          let isCacheStale = false;
          const allValidLevel2 = new Set(
            Object.values(DOMAIN_LEVEL2_MAP)
              .flat()
              .map(d => d.name.toLowerCase())
          );

          for (const tabState of Object.values(parsedStates)) {
            if (tabState.cards && tabState.cards.some(card => !allValidLevel2.has((card.domain || '').toLowerCase()))) {
              isCacheStale = true;
              break;
            }
          }

          if (isCacheStale) {
            console.log("[FeedCache] Stale domain cache detected. Clearing cache.");
            sessionStorage.removeItem('feed_tab_states');
            parsedStates = {};
          } else {
            // Restore scroll positions
            Object.keys(parsedStates).forEach(key => {
              const scrollVal = sessionStorage.getItem(`scroll_pos_${key}`);
              if (scrollVal) {
                parsedStates[key].scrollPosition = Number(scrollVal);
              }
            });
            setFeeds(parsedStates);
          }
        } catch (e) {
          console.error("Failed to parse saved filter state", e);
        }
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

  // Passive scroll listener to record position
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      // Debounce scroll storage to avoid excessive disk/render ops
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`scroll_pos_${currentDomainKey}`, window.scrollY.toString());
          
          setFeeds(prev => {
            const target = prev[currentDomainKey];
            if (target && target.scrollPosition !== window.scrollY) {
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
        }
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [currentDomainKey]);

  // Load feed implementation
  const loadFeed = useCallback(async (newOffset: number, reset = false, filter = activeFilter) => {
    if (!user) return;
    const domainKey = filter.type === 'all' ? '__all__' : `${filter.type}_${filter.value}`;
    
    if (reset) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const targetFeed: TabFeedState = feeds[domainKey] || { cards: [], seenIds: [], offset: 0, hasMore: true, scrollPosition: 0 };
      const querySeenIds = reset ? [] : targetFeed.seenIds;
      const filterDomains = filter.type !== 'all' ? filter.domains : undefined;
      
      const res = await feedAPI.getFeed(limit, newOffset, filterDomains, querySeenIds);

      if (res.success) {
        const incomingCards: CardData[] = res.data || [];
        const incomingIds = incomingCards.map(c => c.id);

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
            const newCards = incomingCards.filter(c => !existingIds.has(c.id));
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
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsRefreshing(false);
      setPullProgress(0);
    }
  }, [user, feeds]);

  // Reset feed cache if user preferences change
  useEffect(() => {
    if (user && isInitialized && !isRestoring) {
      const currentPreferencesString = JSON.stringify(user?.followedDomains || []);
      if (prevPreferencesRef.current && prevPreferencesRef.current !== currentPreferencesString) {
        console.log("[useFeedState] Preferences changed, resetting feed cache");
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('feed_tab_states');
        }
        setFeeds({});
        loadFeed(0, true, activeFilter);
      }
      prevPreferencesRef.current = currentPreferencesString;
    }
  }, [user, isInitialized, isRestoring, activeFilter, loadFeed]);

  // Load feed on active filter changes
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

  // Pull to refresh trigger (SSE-based)
  const handleRefresh = useCallback(async () => {
    if (isRefreshing || isGenerating) return;
    
    setIsRefreshing(true);
    setError(null);
    setGenerationStep('');
    setGenerationProgress(0);
    setEstimatedSecondsLeft(0);
    
    const domainKey = currentDomainKey;
    const targetFeed: TabFeedState = feeds[domainKey] || { cards: [], seenIds: [], offset: 0, hasMore: true, scrollPosition: 0 };
    
    const sseUrl = feedAPI.getRefreshSSEUrl(
      activeFilter.type, 
      activeFilter.value, 
      targetFeed.seenIds
    );

    console.log("[useFeedState] Opening EventSource connection to:", sseUrl);
    
    let eventSource: EventSource;
    try {
      eventSource = new EventSource(sseUrl, { withCredentials: true });
    } catch (e: unknown) {
      console.error("[useFeedState] EventSource failed to initialize:", e);
      setError("Gagal inisialisasi koneksi EventSource: " + (e instanceof Error ? e.message : ""));
      setIsRefreshing(false);
      return;
    }

    eventSource.addEventListener('start', (e: MessageEvent) => {
      console.log("[useFeedState] SSE event: start");
      try {
        const data = JSON.parse(e.data);
        setIsGenerating(true);
        setEstimatedSecondsLeft(data.estimatedSeconds || 20);
        setGenerationProgress(5);
        setGenerationStep('initialize');
      } catch (err) {
        console.error("[useFeedState] Failed to parse start data:", err);
      }
    });

    eventSource.addEventListener('progress', (e: MessageEvent) => {
      console.log("[useFeedState] SSE event: progress", e.data);
      try {
        const data = JSON.parse(e.data);
        setGenerationStep(data.step || '');
        setGenerationProgress(data.progress || 0);
        setEstimatedSecondsLeft(data.estimatedSeconds || 0);
      } catch (err) {
        console.error("[useFeedState] Failed to parse progress data:", err);
      }
    });

    eventSource.addEventListener('complete', (e: MessageEvent) => {
      console.log("[useFeedState] SSE event: complete");
      try {
        const data = JSON.parse(e.data);
        const newCards: CardData[] = data.cards || [];
        
        if (newCards.length > 0) {
          const newIds = newCards.map(c => c.id);
          
          setFeeds(prev => {
            const existingIds = new Set(targetFeed.cards.map(c => c.id));
            const filteredNewCards = newCards.filter(c => !existingIds.has(c.id));
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

          // Auto-scroll ke atas
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }, 100);
        }
      } catch (err) {
        console.error("[useFeedState] Failed to process complete event:", err);
      } finally {
        eventSource.close();
        setIsRefreshing(false);
        setIsGenerating(false);
        setGenerationStep('');
        setGenerationProgress(0);
        setEstimatedSecondsLeft(0);
      }
    });

    eventSource.addEventListener('error', (e: MessageEvent) => {
      console.error("[useFeedState] SSE event: error", e);
      let errMsg = "Koneksi ke AI Pipeline terputus.";
      if (e.data) {
        try {
          const parsed = JSON.parse(e.data);
          errMsg = parsed.message || errMsg;
        } catch (err) {}
      }
      
      setError(errMsg);
      eventSource.close();
      setIsRefreshing(false);
      setIsGenerating(false);
      setGenerationStep('');
      setGenerationProgress(0);
      setEstimatedSecondsLeft(0);
    });

  }, [currentDomainKey, activeFilter, feeds, isRefreshing, isGenerating]);

  // Touch Handlers for mobile pull-to-refresh
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartRef.current = e.touches[0].clientY;
    } else {
      touchStartRef.current = 0;
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartRef.current > 0 && window.scrollY <= 0) {
      const pull = e.touches[0].clientY - touchStartRef.current;
      if (pull > 0 && pull < 150) {
        setPullProgress(pull / 150);
        if (e.cancelable) e.preventDefault();
      }
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (pullProgress > 0.6 && !isRefreshing && !isGenerating && !loading) {
      handleRefresh();
    } else {
      setPullProgress(0);
    }
    touchStartRef.current = 0;
  }, [pullProgress, isRefreshing, isGenerating, loading, handleRefresh]);

  const loadMore = useCallback(() => {
    loadFeed(offset + limit);
  }, [offset, loadFeed]);

  return {
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
    setError,
    touchHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd
    }
  };
}
