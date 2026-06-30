'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KnowledgeFeedCard } from '@/components/cards/KnowledgeFeedCard';
import { useAuth } from '@/lib/AuthContext';
import { RefreshCw, Bookmark, User as UserIcon } from 'lucide-react';
import Link from 'next/link';

export default function Profile() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  
  // Protect route
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="animate-spin text-muted-foreground w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 w-full max-w-2xl mx-auto border-x border-border min-h-screen bg-background">
      
      {/* Profile Header section */}
      <div className="p-6 border-b border-border relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center text-4xl border border-border overflow-hidden select-none">
              {user.avatarUrl ? user.avatarUrl : '👤'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{user.name}</h1>
              <p className="text-muted-foreground text-sm">{user.email}</p>
            </div>
          </div>
          
          {/* Tombol gerigi tanpa caption di pojok kanan setelah username (YAGNI/Ponytail) */}
          <Link 
            href="/profile/settings" 
            className="p-2.5 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-200 border border-border/40 shadow-sm"
            title="Pengaturan Profil"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings animate-hover-spin">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-border grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Topik Disukai</p>
            <div className="flex flex-wrap gap-2">
              {user.preferences?.domains?.map((domain: string) => (
                <span key={domain} className="capitalize text-xs px-2 py-1 bg-primary/10 text-primary rounded-md font-medium">
                  {domain}
                </span>
              )) || <span className="text-sm text-muted-foreground">Belum ada</span>}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Tingkat Bacaan</p>
            <p className="capitalize font-bold text-foreground">
              {user.preferences?.readingLevel || 'Menengah'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border p-3 px-4 flex justify-between items-center">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Bookmark className="w-4 h-4" /> Tersimpan ({user.savedCards?.length || 0})
          </h2>
        </div>

        {user.savedCards && user.savedCards.length > 0 ? (
          <div className="flex flex-col w-full pb-8">
            {user.savedCards.map((card: any, idx: number) => (
              <KnowledgeFeedCard key={`${card.id}-${idx}`} card={card} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Bookmark className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Belum ada konten tersimpan</h3>
            <p className="text-muted-foreground mb-6">
              Simpan postingan menarik dengan mengklik tombol bookmark pada feed.
            </p>
            <Link href="/" className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium shadow-sm hover:bg-primary/90 transition-all">
              Jelajahi Feed
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
