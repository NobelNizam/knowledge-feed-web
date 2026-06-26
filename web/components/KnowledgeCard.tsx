'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { userAPI } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';

interface KnowledgeCardProps {
  card: {
    id: string;
    title: string;
    content: string;
    domain: string;
    tags?: string[];
    sourceName?: string;
    sourceUrl?: string;
    viewCount?: number;
    saveCount?: number;
  };
  isDetailView?: boolean;
}

const COLORS: Record<string, string> = {
  science: 'bg-blue-500',
  history: 'bg-amber-600',
  technology: 'bg-indigo-500',
  philosophy: 'bg-purple-500',
  arts: 'bg-pink-500',
  nature: 'bg-emerald-500',
};

const ICONS: Record<string, string> = {
  science: '🔬',
  history: '📜',
  technology: '💻',
  philosophy: '🤔',
  arts: '🎨',
  nature: '🌿',
};

export default function KnowledgeCard({ card, isDetailView = false }: KnowledgeCardProps) {
  const domainColor = COLORS[card.domain?.toLowerCase()] || 'bg-gray-500';
  const domainIcon = ICONS[card.domain?.toLowerCase()] || '📚';
  
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  
  useEffect(() => {
    if (user && user.savedCards) {
      setSaved(user.savedCards.some((c: any) => c.id === card.id));
    } else {
      setSaved(false);
    }
  }, [user, card.id]);
  
  // Mock counts based on Prisma defaults if not provided
  const [likeCount, setLikeCount] = useState(card.saveCount || 0); // Using saveCount as placeholder for likes
  const viewCount = card.viewCount || Math.floor(Math.random() * 100); 

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!liked) {
      setLiked(true);
      setLikeCount(prev => prev + 1);
      // await interactionAPI.likeCard(card.id); // Placeholder for future API
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Optimistic UI update
    setSaved(!saved);
    try {
      await userAPI.saveCard(card.id);
      await refreshUser(); // Update global state
    } catch (error) {
      setSaved(saved); // Revert on failure
      console.error('Failed to save card:', error);
    }
  };

  const cardContent = isDetailView ? card.content : (
    card.content.length > 150 ? card.content.substring(0, 150) + '...' : card.content
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4 hover:shadow-md transition-all">
      <Link href={`/card/${card.id}`} className="block">
        <div className="flex items-center justify-between mb-3">
          <div className={`${domainColor} text-white px-3 py-1 rounded-full inline-flex items-center gap-1 text-xs font-bold`}>
            <span>{domainIcon}</span>
            <span>{card.domain?.toUpperCase()}</span>
          </div>
          <div className="text-xs text-gray-400 font-medium flex items-center gap-1">
            <span>👁️ {viewCount}</span>
          </div>
        </div>

        <h2 className={`font-bold text-gray-900 mb-2 ${isDetailView ? 'text-2xl' : 'text-xl'}`}>
          {card.title}
        </h2>
        
        <p className={`text-gray-600 mb-4 leading-relaxed ${isDetailView ? 'text-lg' : 'text-base'}`}>
          {cardContent}
          {!isDetailView && card.content.length > 150 && (
            <span className="text-blue-500 font-medium ml-1 hover:underline">Read more</span>
          )}
        </p>

        {card.tags && card.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {card.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-xs bg-gray-50 text-gray-500 border border-gray-200 px-2 py-1 rounded-md">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </Link>

      {/* Interactions Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
          >
            <span className="text-lg">{liked ? '❤️' : '🤍'}</span>
            <span>{likeCount}</span>
          </button>
          
          <Link 
            href={`/card/${card.id}`}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-500 transition-colors"
          >
            <span className="text-lg">💬</span>
            <span>Komentar</span>
          </Link>
        </div>

        <button
          onClick={handleSave}
          className={`text-xl hover:scale-110 transition-transform ${saved ? 'text-blue-500' : 'text-gray-400'}`}
        >
          {saved ? '📑' : '🔖'}
        </button>
      </div>
    </div>
  );
}
