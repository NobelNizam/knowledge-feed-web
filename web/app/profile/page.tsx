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
  const [showAllTopics, setShowAllTopics] = useState(false);
  
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
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{user.displayName}</h1>
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

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-sm font-medium text-muted-foreground mb-2">Topik Disukai</p>
          <div className="flex flex-wrap gap-2 items-center">
            {user.followedDomains && user.followedDomains.length > 0 ? (
              <>
                {user.followedDomains.slice(0, 5).map((fd: any) => (
                  <span key={fd.domain?.id || fd.domain?.name} className="capitalize text-xs px-2 py-1.5 bg-primary/10 text-primary rounded-md font-semibold select-none">
                    {fd.domain?.name}
                  </span>
                ))}
                {user.followedDomains.length > 5 && (
                  <button
                    onClick={() => setShowAllTopics(true)}
                    className="text-xs px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-md font-bold transition-all duration-200"
                  >
                    + {user.followedDomains.length - 5} Lainnya
                  </button>
                )}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Belum ada topik disukai</span>
            )}
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
            {user.savedCards.map((card, idx: number) => (
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
      {/* Pop-up Modal Detail Topik Disukai (YAGNI/Ponytail Glassmorphism) */}
      {showAllTopics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="w-full max-w-sm mx-4 bg-background/80 backdrop-blur-lg border border-border/85 p-6 rounded-2xl shadow-xl flex flex-col gap-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-foreground text-sm">Topik yang Disukai</h3>
              <button 
                onClick={() => setShowAllTopics(false)} 
                className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1 hover:bg-muted rounded-full w-6 h-6 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-muted-foreground">Berikut adalah daftar lengkap topik rumpun ilmu dan disiplin akademik yang Anda ikuti:</p>
            
            <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto p-1 scrollbar-thin">
              {user.followedDomains?.map((fd: any) => (
                <span key={fd.domain?.id || fd.domain?.name} className="capitalize text-xs px-2.5 py-1.5 bg-primary/10 text-primary rounded-md font-semibold select-none">
                  {fd.domain?.name}
                </span>
              ))}
            </div>

            <button
              onClick={() => setShowAllTopics(false)}
              className="mt-2 w-full py-2.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl transition-all"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
