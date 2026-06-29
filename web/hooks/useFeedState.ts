'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { feedAPI } from '@/lib/api';
import { DOMAIN_LEVEL2_MAP } from '@/lib/domainMapping';

export interface TabFeedState {
  cards: any[];
  seenIds: string[];
  offset: number;
  hasMore: boolean;
  scrollPosition: number;
}

interface UseFeedStateProps {
  user: any;
  isInitialized: boolean;
  activeFilter: any;
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

  const limit = 10;
  const touchStartRef = useRef(0);

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
            if (tabState.cards && tabState.cards.some((card: any) => !allValidLevel2.has((card.domain || '').toLowerCase()))) {
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
      const targetFeed = feeds[domainKey] || { cards: [], seenIds: [], offset: 0, hasMore: true, scrollPosition: 0 };
      const querySeenIds = reset ? [] : targetFeed.seenIds;
      const filterDomains = filter.type !== 'all' ? filter.domains : undefined;
      
      const res = await feedAPI.getFeed(limit, newOffset, filterDomains, querySeenIds);

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
  }, [user, feeds]);

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

  // Pull to refresh trigger
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    const domainKey = currentDomainKey;
    const targetFeed = feeds[domainKey] || { cards: [], seenIds: [], offset: 0, hasMore: true, scrollPosition: 0 };
    
    try {
      const res = await feedAPI.refreshFeed(activeFilter.type, activeFilter.value);
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
  }, [currentDomainKey, activeFilter, feeds]);

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
    if (pullProgress > 0.6 && !isRefreshing && !loading) {
      handleRefresh();
    } else {
      setPullProgress(0);
    }
    touchStartRef.current = 0;
  }, [pullProgress, isRefreshing, loading, handleRefresh]);

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
