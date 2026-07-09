'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { userAPI } from '@/lib/api';
import { RefreshCw, ArrowLeft, UserPlus, UserCheck } from 'lucide-react';

interface FollowerData {
  id: number;
  displayName: string;
  username: string;
  avatarUrl?: string;
  isFollowing?: boolean;
}

export default function FollowersPage({ params }: { params: { id: string } }) {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const userId = Number(params.id);

  const [followers, setFollowers] = useState<FollowerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);

  useEffect(() => {
    if (isNaN(userId)) return;
    (async () => {
      try {
        const res = await userAPI.getFollowers(userId);
        if (res.success) {
          setFollowers(res.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch followers:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const handleFollowToggle = async (targetId: number, current: boolean) => {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setToggling(targetId);
    const prev = followers.map(f => f.id === targetId ? { ...f, isFollowing: !current } : f);
    setFollowers(prev);
    try {
      await userAPI.toggleFollow(targetId);
    } catch {
      setFollowers(followers);
    } finally {
      setToggling(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="animate-spin text-muted-foreground w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 w-full max-w-2xl mx-auto border-x border-border min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-full hover:bg-muted transition-colors -ml-1">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold">Pengikut</h1>
      </div>

      {followers.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">Belum ada pengikut.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {followers.map((f) => (
            <div key={f.id} className="flex items-center gap-3 p-4 border-b border-border hover:bg-muted/50 transition-colors">
              <Link href={`/user/${f.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-xl shrink-0 select-none">
                  {f.avatarUrl || '👤'}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{f.displayName}</p>
                  <p className="text-xs text-muted-foreground">@{f.username}</p>
                </div>
              </Link>
              {currentUser && currentUser.id !== f.id && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleFollowToggle(f.id, f.isFollowing || false); }}
                  disabled={toggling === f.id}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    f.isFollowing
                      ? 'border border-border text-foreground hover:border-destructive hover:text-destructive'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {f.isFollowing ? (
                    <span className="flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> Mengikuti</span>
                  ) : (
                    <span className="flex items-center gap-1"><UserPlus className="w-3.5 h-3.5" /> Ikuti</span>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
