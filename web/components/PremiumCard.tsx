'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { userAPI } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { DOMAIN_LEVEL2_MAP } from '@/lib/domainMapping';

interface PremiumCardProps {
  card: {
    id: string;
    title: string;
    content: string;
    domain: string;
    tags?: string[];
    viewCount?: number;
    saveCount?: number;
  };
  isDetailView?: boolean;
}

const COLORS: Record<string, string> = {
  'Formal Sciences': 'bg-gradient-to-br from-blue-500 to-indigo-600',
  'Natural Sciences': 'bg-gradient-to-br from-emerald-500 to-teal-600',
  'Engineering & Technology': 'bg-gradient-to-br from-purple-500 to-indigo-700',
  'Medical & Health Sciences': 'bg-gradient-to-br from-rose-500 to-pink-600',
  'Agricultural & Environmental Sciences': 'bg-gradient-to-br from-green-600 to-amber-700',
  'Social Sciences': 'bg-gradient-to-br from-amber-500 to-orange-600',
  'Humanities & Arts': 'bg-gradient-to-br from-pink-500 to-rose-700',
  'Interdisciplinary Sciences': 'bg-gradient-to-br from-cyan-500 to-blue-600',
};

const ICONS: Record<string, string> = {
  'Formal Sciences': '➗',
  'Natural Sciences': '🔬',
  'Engineering & Technology': '💻',
  'Medical & Health Sciences': '🏥',
  'Agricultural & Environmental Sciences': '🌾',
  'Social Sciences': '👥',
  'Humanities & Arts': '🎨',
  'Interdisciplinary Sciences': '🧬',
};

function getParentDomain(disciplineName: string): string {
  if (!disciplineName) return 'Interdisciplinary Sciences';
  const normalized = disciplineName.toLowerCase();
  
  for (const [parent, disciplines] of Object.entries(DOMAIN_LEVEL2_MAP)) {
    if (disciplines.some(d => d.name.toLowerCase() === normalized)) {
      return parent;
    }
  }
  
  // Custom check if not found in list (e.g. if LLM returned slight variation or lowercase)
  if (normalized.includes('science')) {
    if (normalized.includes('social')) return 'Social Sciences';
    if (normalized.includes('computer') || normalized.includes('information')) return 'Formal Sciences';
    return 'Natural Sciences';
  }
  if (normalized.includes('tech') || normalized.includes('engineering') || normalized.includes('intelligence')) {
    return 'Engineering & Technology';
  }
  if (normalized.includes('health') || normalized.includes('medical') || normalized.includes('medicine')) {
    return 'Medical & Health Sciences';
  }
  if (normalized.includes('art') || normalized.includes('music') || normalized.includes('history') || normalized.includes('philosophy') || normalized.includes('linguistics')) {
    return 'Humanities & Arts';
  }
  
  return 'Interdisciplinary Sciences';
}

export default function PremiumCard({ card, isDetailView = false }: PremiumCardProps) {
  const parentDomain = getParentDomain(card.domain);
  const domainColorClass = COLORS[parentDomain] || 'bg-gradient-to-br from-slate-500 to-slate-700';
  const domainIcon = ICONS[parentDomain] || '📚';
  
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
  
  const [likeCount, setLikeCount] = useState(card.saveCount || 0);
  const viewCount = card.viewCount || Math.floor(Math.random() * 500); 

  const handleLike = async (e: React.MouseEvent) => {
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
    
    setSaved(!saved);
    try {
      await userAPI.saveCard(card.id);
      await refreshUser();
    } catch (error) {
      setSaved(saved);
      console.error('Failed to save card:', error);
    }
  };

  const cardContent = isDetailView ? card.content : (
    card.content.length > 150 ? card.content.substring(0, 150) + '...' : card.content
  );

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[20px] p-6 mb-6 transition-all duration-300 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 hover:bg-white/90 cursor-pointer relative overflow-hidden group">
      <Link href={`/card/${card.id}`} className="block relative z-10">
        <div className="flex justify-between items-center mb-3">
          <div className={`${domainColorClass} text-white px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-sm`}>
            <span>{domainIcon}</span>
            <span>{card.domain?.toUpperCase()}</span>
          </div>
          <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <span>👁️ {viewCount}</span>
          </div>
        </div>

        <h2 className={`font-extrabold text-slate-900 mt-4 mb-3 leading-snug ${isDetailView ? 'text-3xl' : 'text-2xl'}`}>
          {card.title}
        </h2>
        
        <p className={`text-slate-600 leading-relaxed mb-5 ${isDetailView ? 'text-lg' : 'text-base'}`}>
          {cardContent}
        </p>

        {card.tags && card.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {card.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-xs bg-slate-100 text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg font-semibold">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </Link>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100 relative z-10">
        <div className="flex gap-4">
          <button 
            onClick={handleLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
              liked 
                ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                : 'text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className={`text-base ${liked ? 'animate-pop' : ''}`}>
              {liked ? '❤️' : '🤍'}
            </span>
            <span>{likeCount}</span>
          </button>
          
          <Link 
            href={`/card/${card.id}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <span className="text-base">💬</span>
            <span>Discuss</span>
          </Link>
        </div>

        <button
          onClick={handleSave}
          className={`text-2xl transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 ${
            saved 
              ? 'text-blue-500 animate-pop' 
              : 'text-slate-300 hover:text-blue-500'
          }`}
        >
          {saved ? '📑' : '🔖'}
        </button>
      </div>
    </div>
  );
}
