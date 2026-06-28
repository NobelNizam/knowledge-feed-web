'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Bookmark, Share } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { userAPI } from '@/lib/api';

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
    createdAt?: string;
  };
  isDetailView?: boolean;
}

const DOMAIN_COLORS: Record<string, string> = {
  science: 'bg-blue-500',
  history: 'bg-amber-600',
  technology: 'bg-indigo-500',
  philosophy: 'bg-purple-500',
  arts: 'bg-pink-500',
  nature: 'bg-emerald-500',
};

const DOMAIN_ICONS: Record<string, string> = {
  science: '🔬',
  history: '📜',
  technology: '💻',
  philosophy: '🤔',
  arts: '🎨',
  nature: '🌿',
};

export function KnowledgeFeedCard({ card, isDetailView = false }: KnowledgeFeedCardProps) {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(card.saveCount || 0);

  const domainColor = DOMAIN_COLORS[card.domain?.toLowerCase()] || 'bg-neutral-500';
  const domainIcon = DOMAIN_ICONS[card.domain?.toLowerCase()] || '📚';
  
  // Set initial saved state based on user context
  useEffect(() => {
    if (user && user.savedCards) {
      setSaved(user.savedCards.some((c: any) => c.id === card.id));
    } else {
      setSaved(false);
    }
  }, [user, card.id]);

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!liked) {
      setLiked(true);
      setLikeCount(prev => prev + 1);
    } else {
      setLiked(false);
      setLikeCount(prev => prev - 1);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Optimistic UI
    setSaved(!saved);
    try {
      await userAPI.saveCard(card.id);
      await refreshUser();
    } catch (error) {
      setSaved(saved); // Revert
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
                Balas
              </span>
            </Link>

            <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-green-500/10 group transition-colors">
              <Share className="h-5 w-5 text-muted-foreground group-hover:text-green-500 transition-colors" />
            </button>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground mr-1">👁️ {card.viewCount || Math.floor(Math.random() * 100)}</span>
              <button 
                onClick={handleSave}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-primary/10 group transition-colors"
              >
                <Bookmark 
                  className={cn("h-5 w-5 transition-colors", saved ? "fill-primary text-primary" : "text-muted-foreground group-hover:text-primary")} 
                />
              </button>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
