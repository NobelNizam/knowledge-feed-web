'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KnowledgeFeedCard } from '@/components/cards/KnowledgeFeedCard';
import { useAuth } from '@/lib/AuthContext';
import { RefreshCw, Bookmark, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function Profile() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'reposts'>('bookmarks');
  
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
      
      <div className="p-3 sm:p-6 border-b border-border relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-full flex items-center justify-center text-3xl sm:text-4xl border border-border overflow-hidden select-none shrink-0">
              {user.avatarUrl ? user.avatarUrl : '👤'}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{user.displayName}</h1>
              <p className="text-muted-foreground text-sm">@{user.username}</p>
              {user.bio && (
                <p className="text-muted-foreground text-sm mt-1">{user.bio}</p>
              )}
              <div className="flex items-center gap-3 mt-1">
                <Link href={`/user/${user.id}/followers`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <span className="font-semibold text-foreground">{user.followerCount ?? 0}</span> Pengikut
                </Link>
                <Link href={`/user/${user.id}/following`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <span className="font-semibold text-foreground">{user.followingCount ?? 0}</span> Mengikuti
                </Link>
              </div>
            </div>
          </div>
          
          <Link 
            href="/profile/settings" 
            className="p-2.5 sm:p-2 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-200 border border-border/40 shadow-sm active:scale-95"
            title="Pengaturan Profil"
          >
            <Settings className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
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
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex">
            <button onClick={() => setActiveTab('bookmarks')} className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
              activeTab === 'bookmarks' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
              <Bookmark className="w-4 h-4 inline mr-1.5" />
              Bookmark ({user.bookmarks?.length || 0})
            </button>
            <button onClick={() => setActiveTab('reposts')} className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
              activeTab === 'reposts' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
              <RefreshCw className="w-4 h-4 inline mr-1.5" />
              Repost ({user.reposts?.length || 0})
            </button>
          </div>
        </div>

        {(() => {
          const tabCards = activeTab === 'bookmarks' ? (user.bookmarks || []) : (user.reposts || []);

          if (tabCards.length > 0) {
            return (
              <div className="flex flex-col w-full pb-8">
                {tabCards.map((card, idx: number) => (
                  <KnowledgeFeedCard key={`${card.id}-${idx}`} card={card} />
                ))}
              </div>
            );
          }

          return (
            <div className="text-center py-16 px-4">
              <h3 className="text-xl font-bold text-foreground mb-2">
                {activeTab === 'bookmarks' ? 'Belum ada konten tersimpan' : 'Belum ada repost'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {activeTab === 'bookmarks' 
                  ? 'Simpan postingan menarik dengan mengklik tombol bookmark pada feed.'
                  : 'Repost konten yang Anda suka agar muncul di profil.'}
              </p>
              <Link href="/" className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium shadow-sm hover:bg-primary/90 transition-all">
                Jelajahi Feed
              </Link>
            </div>
          );
        })()}
      </div>

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
