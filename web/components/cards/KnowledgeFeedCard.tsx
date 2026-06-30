'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Bookmark, Share } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { userAPI, interactionAPI } from '@/lib/api';
import { getParentDomain } from '@/lib/domainMapping';

export interface KnowledgeFeedCardProps {
  card: {
    id: string;
    title: string;
    content: string;
    domain: string;
    tags?: string[];
    sourceUrl?: string;
    sourceName?: string;
    viewCount?: number;
    saveCount?: number;
    likeCount?: number;
    shareCount?: number;
    liked?: boolean;
    saved?: boolean;
    commentsCount?: number;
    createdAt?: string;
  };
  isDetailView?: boolean;
}

const DOMAIN_COLORS: Record<string, string> = {
  'Formal Sciences': 'bg-blue-500',
  'Natural Sciences': 'bg-emerald-500',
  'Engineering & Technology': 'bg-indigo-500',
  'Medical & Health Sciences': 'bg-rose-500',
  'Agricultural & Environmental Sciences': 'bg-green-600',
  'Social Sciences': 'bg-amber-600',
  'Humanities & Arts': 'bg-pink-500',
  'Interdisciplinary Sciences': 'bg-cyan-500',
};

const DOMAIN_ICONS: Record<string, string> = {
  'Formal Sciences': '➗',
  'Natural Sciences': '🔬',
  'Engineering & Technology': '💻',
  'Medical & Health Sciences': '🏥',
  'Agricultural & Environmental Sciences': '🌾',
  'Social Sciences': '👥',
  'Humanities & Arts': '🎨',
  'Interdisciplinary Sciences': '🧬',
};

const updateCardInCache = (cardId: string, updates: any) => {
  if (typeof window === 'undefined') return;
  const savedStates = sessionStorage.getItem('feed_tab_states');
  if (!savedStates) return;
  try {
    const parsed = JSON.parse(savedStates);
    let changed = false;
    for (const key of Object.keys(parsed)) {
      const tabState = parsed[key];
      if (tabState.cards) {
        tabState.cards = tabState.cards.map((c: any) => {
          if (c.id === cardId) {
            changed = true;
            return { ...c, ...updates };
          }
          return c;
        });
      }
    }
    if (changed) {
      sessionStorage.setItem('feed_tab_states', JSON.stringify(parsed));
    }
  } catch (e) {
    console.error('Failed to update cache:', e);
  }
};

export function KnowledgeFeedCard({ card, isDetailView = false }: KnowledgeFeedCardProps) {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const [liked, setLiked] = useState(card.liked || false);
  const [saved, setSaved] = useState(card.saved || false);
  const [likeCount, setLikeCount] = useState(card.likeCount || 0);
  const [saveCount, setSaveCount] = useState(card.saveCount || 0);
  const [viewCount, setViewCount] = useState(card.viewCount || 0);
  const [commentsCount, setCommentsCount] = useState(card.commentsCount || 0);
  const [showShareModal, setShowShareModal] = useState(false);

  const parentDomain = getParentDomain(card.domain);
  const domainColor = DOMAIN_COLORS[parentDomain] || 'bg-neutral-500';
  const domainIcon = DOMAIN_ICONS[parentDomain] || '📚';
  
  // Set initial saved state based on user context
  useEffect(() => {
    if (user && user.savedCards) {
      setSaved(user.savedCards.some((c: any) => c.id === card.id));
    } else {
      setSaved(card.saved || false);
    }
  }, [user, card.id, card.saved]);

  // Sinkronisasi status liked/likeCount jika properti card berubah
  useEffect(() => {
    if (card.liked !== undefined) setLiked(card.liked);
    if (card.likeCount !== undefined) setLikeCount(card.likeCount);
    if (card.saved !== undefined) setSaved(card.saved);
    if (card.saveCount !== undefined) setSaveCount(card.saveCount);
    if (card.viewCount !== undefined) setViewCount(card.viewCount);
    if (card.commentsCount !== undefined) setCommentsCount(card.commentsCount);
  }, [card.liked, card.likeCount, card.saved, card.saveCount, card.viewCount, card.commentsCount]);

  // Global Event Listener untuk sinkronisasi antar komponen secara real-time
  useEffect(() => {
    const handleInteraction = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.cardId === card.id) {
        const { liked: newLiked, likeCount: newLikeCount, saved: newSaved, saveCount: newSaveCount, viewCount: newViewCount, commentsCount: newCommentsCount } = customEvent.detail;
        if (newLiked !== undefined) setLiked(newLiked);
        if (newLikeCount !== undefined) setLikeCount(newLikeCount);
        if (newSaved !== undefined) setSaved(newSaved);
        if (newSaveCount !== undefined) setSaveCount(newSaveCount);
        if (newViewCount !== undefined) setViewCount(newViewCount);
        if (newCommentsCount !== undefined) setCommentsCount(newCommentsCount);
      }
    };

    window.addEventListener('card-interaction', handleInteraction);
    return () => window.removeEventListener('card-interaction', handleInteraction);
  }, [card.id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    const previousLiked = liked;
    const previousLikeCount = likeCount;
    const newLiked = !liked;
    const newLikeCount = liked ? likeCount - 1 : likeCount + 1;

    setLiked(newLiked);
    setLikeCount(newLikeCount);

    // Broadcast & Update Cache
    window.dispatchEvent(new CustomEvent('card-interaction', {
      detail: { cardId: card.id, liked: newLiked, likeCount: newLikeCount }
    }));
    updateCardInCache(card.id, { liked: newLiked, likeCount: newLikeCount });

    try {
      const res = await interactionAPI.likeCard(card.id);
      if (res.success) {
        setLiked(res.liked);
        setLikeCount(res.likeCount);
        
        window.dispatchEvent(new CustomEvent('card-interaction', {
          detail: { cardId: card.id, liked: res.liked, likeCount: res.likeCount }
        }));
        updateCardInCache(card.id, { liked: res.liked, likeCount: res.likeCount });
      }
    } catch (error) {
      setLiked(previousLiked);
      setLikeCount(previousLikeCount);
      
      window.dispatchEvent(new CustomEvent('card-interaction', {
        detail: { cardId: card.id, liked: previousLiked, likeCount: previousLikeCount }
      }));
      updateCardInCache(card.id, { liked: previousLiked, likeCount: previousLikeCount });
      console.error('Failed to toggle like:', error);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowShareModal(true);
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push('/login');
      return;
    }
    
    const previousSaved = saved;
    const previousSaveCount = saveCount;
    const newSaved = !saved;
    const newSaveCount = saved ? saveCount - 1 : saveCount + 1;

    setSaved(newSaved);
    setSaveCount(newSaveCount);
    
    // Broadcast & Update Cache
    window.dispatchEvent(new CustomEvent('card-interaction', {
      detail: { cardId: card.id, saved: newSaved, saveCount: newSaveCount }
    }));
    updateCardInCache(card.id, { saved: newSaved, saveCount: newSaveCount });

    try {
      await userAPI.saveCard(card.id);
      await refreshUser();
      
      window.dispatchEvent(new CustomEvent('card-interaction', {
        detail: { cardId: card.id, saved: newSaved, saveCount: newSaveCount }
      }));
    } catch (error) {
      setSaved(previousSaved);
      setSaveCount(previousSaveCount);
      
      window.dispatchEvent(new CustomEvent('card-interaction', {
        detail: { cardId: card.id, saved: previousSaved, saveCount: previousSaveCount }
      }));
      updateCardInCache(card.id, { saved: previousSaved, saveCount: previousSaveCount });
      console.error('Failed to save card:', error);
    }
  };

  // Truncate content for feed view
  const displayContent = isDetailView 
    ? card.content 
    : card.content.length > 200 
      ? card.content.substring(0, 200) + '...' 
      : card.content;

  // Format date if exists
  const formattedDate = card.createdAt 
    ? new Date(card.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    : 'Baru saja';

  return (
    <article className="flex w-full flex-col border-b border-border bg-background px-4 py-4 sm:px-6">
      <Link href={`/card/${card.id}`} className="flex w-full">
        {/* Left column: Vertical line aesthetic */}
        <div className="flex flex-col items-center mr-4">
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-border flex items-center justify-center text-xl bg-card">
            {domainIcon}
          </div>
          {!isDetailView && <div className="mt-2 w-0.5 grow rounded-full bg-border" />}
        </div>

        {/* Right column: Content */}
        <div className="flex w-full flex-col">
          {/* Header */}
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <span className={cn('px-2 py-0.5 text-xs font-bold text-white rounded-full', domainColor)}>
                {card.domain?.toUpperCase()}
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span>{formattedDate}</span>
            </div>
          </div>

          {/* Title */}
          <h2 className={cn("mt-2 font-bold text-foreground", isDetailView ? "text-xl md:text-2xl" : "text-base md:text-lg")}>
            {card.title}
          </h2>

          {/* Body */}
          <div className={cn("mt-2 text-foreground/90 whitespace-pre-line leading-relaxed", isDetailView ? "text-base" : "text-sm")}>
            {displayContent}
          </div>

          {/* Tags */}
          {card.tags && card.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {card.tags.slice(0, 4).map((tag, i) => (
                <span key={i} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Source Link */}
          {isDetailView && card.sourceUrl && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground font-medium mb-1">Sumber:</p>
              <a href={card.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 break-all">
                🔗 {card.sourceName || card.sourceUrl}
              </a>
            </div>
          )}

          {/* Interaction Bar */}
          <div className="mt-4 flex items-center gap-6">
            <button 
              onClick={handleLike}
              className="flex items-center gap-1.5 group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full group-hover:bg-red-500/10 transition-colors">
                <Heart 
                  className={cn("h-5 w-5 transition-colors", liked ? "fill-red-500 text-red-500" : "text-muted-foreground group-hover:text-red-500")} 
                />
              </div>
              <span className={cn("text-xs font-medium", liked ? "text-red-500" : "text-muted-foreground group-hover:text-red-500")}>
                {likeCount > 0 ? likeCount : ''}
              </span>
            </button>

            <Link href={`/card/${card.id}`} className="flex items-center gap-1.5 group" onClick={(e) => isDetailView && e.preventDefault()}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full group-hover:bg-blue-500/10 transition-colors">
                <MessageCircle className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
              </div>
              <span className="text-xs font-medium text-muted-foreground group-hover:text-blue-500">
                {commentsCount > 0 ? `${commentsCount} Balasan` : 'Balas'}
              </span>
            </Link>

            <button 
              onClick={handleShare}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-green-500/10 group transition-colors"
            >
              <Share className="h-5 w-5 text-muted-foreground group-hover:text-green-500 transition-colors" />
            </button>

            <div className="ml-auto flex items-center gap-4">
              <span className="text-xs text-muted-foreground mr-1">👁️ {viewCount}</span>
              
              <button 
                onClick={handleSave}
                className="flex items-center gap-1 group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full group-hover:bg-primary/10 transition-colors">
                  <Bookmark 
                    className={cn("h-5 w-5 transition-colors", saved ? "fill-primary text-primary" : "text-muted-foreground group-hover:text-primary")} 
                  />
                </div>
                <span className={cn("text-xs font-medium", saved ? "text-primary" : "text-muted-foreground group-hover:text-primary")}>
                  {saveCount > 0 ? saveCount : ''}
                </span>
              </button>
            </div>
          </div>
        </div>
      </Link>

      {/* Share Modal Glassmorphism (Ponytail/YAGNI) */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="w-full max-w-sm mx-4 bg-background/80 backdrop-blur-lg border border-border/80 p-6 rounded-2xl shadow-xl flex flex-col gap-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-foreground text-sm">Bagikan Postingan</h3>
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowShareModal(false); }} 
                className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1 hover:bg-muted rounded-full w-6 h-6 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-muted-foreground">Salin tautan di bawah ini untuk membagikan ilmu pengetahuan:</p>
            
            <div className="flex items-center gap-2 bg-muted/65 p-2 rounded-xl border border-border/50">
              <input 
                type="text" 
                readOnly 
                value={`${window.location.origin}/card/${card.id}`}
                className="flex-1 bg-transparent text-xs text-foreground focus:outline-none overflow-x-auto select-all"
              />
              <button 
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    await navigator.clipboard.writeText(`${window.location.origin}/card/${card.id}`);
                    const res = await interactionAPI.shareCard(card.id);
                    if (res.success && res.shareCount !== undefined) {
                      updateCardInCache(card.id, { shareCount: res.shareCount });
                    }
                    alert('Tautan berhasil disalin ke papan klip!');
                    setShowShareModal(false);
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/95 transition-colors shrink-0"
              >
                Salin
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
