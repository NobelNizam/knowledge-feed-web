'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KnowledgeFeedCard } from '@/components/cards/KnowledgeFeedCard';
import { useAuth } from '@/lib/AuthContext';
import { userAPI } from '@/lib/api';
import { RefreshCw, UserPlus, UserCheck, Bookmark } from 'lucide-react';
import type { CardData } from '@/lib/types';

interface ProfileData {
  id: number;
  displayName: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  bookmarks?: CardData[];
  reposts?: CardData[];
}

export default function UserProfile({ params }: { params: { id: string } }) {
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const userId = Number(params.id);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (!authLoading && currentUser && currentUser.id === userId) {
      router.replace('/profile');
      return;
    }
  }, [currentUser, userId, authLoading, router]);

  useEffect(() => {
    if (isNaN(userId)) return;
    (async () => {
      try {
        const res = await userAPI.getProfile(userId);
        if (res.success) {
          setProfile(res.data);
          setIsFollowing(res.data.isFollowing || false);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const handleToggleFollow = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setFollowLoading(true);
    const prev = isFollowing;
    setIsFollowing(!prev);
    try {
      await userAPI.toggleFollow(userId);
    } catch {
      setIsFollowing(prev);
    } finally {
      setFollowLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="animate-spin text-muted-foreground w-8 h-8" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Pengguna tidak ditemukan.</p>
      </div>
    );
  }

  const isOwnProfile = currentUser && currentUser.id === profile.id;

  const combinedFeed = [
    ...(profile.reposts || []).map(c => ({ ...c, _type: 'repost' as const })),
    ...(profile.bookmarks || []).map(c => ({ ...c, _type: 'bookmark' as const })),
  ];

  return (
    <div className="flex flex-col flex-1 w-full max-w-2xl mx-auto border-x border-border min-h-screen bg-background">

      {/* Profile Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center text-4xl border border-border overflow-hidden shrink-0 select-none">
            {profile.avatarUrl ? profile.avatarUrl : '👤'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground tracking-tight truncate">{profile.displayName}</h1>
            <p className="text-muted-foreground text-sm">@{profile.username}</p>
            {profile.bio && (
              <p className="text-muted-foreground text-sm mt-1">{profile.bio}</p>
            )}
            <div className="flex items-center gap-4 mt-3">
              <Link href={`/user/${userId}/followers`} className="text-sm hover:underline group">
                <span className="font-bold text-foreground">{profile.followersCount ?? 0}</span>
                <span className="text-muted-foreground ml-1 group-hover:text-foreground">Pengikut</span>
              </Link>
              <Link href={`/user/${userId}/following`} className="text-sm hover:underline group">
                <span className="font-bold text-foreground">{profile.followingCount ?? 0}</span>
                <span className="text-muted-foreground ml-1 group-hover:text-foreground">Mengikuti</span>
              </Link>
            </div>
          </div>

          {!isOwnProfile && (
            <button
              onClick={handleToggleFollow}
              disabled={followLoading}
              className={`shrink-0 px-5 py-2 rounded-full font-bold text-sm transition-colors ${
                isFollowing
                  ? 'border border-border text-foreground hover:border-destructive hover:text-destructive hover:bg-destructive/10'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {isFollowing ? (
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" /> Mengikuti
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" /> Ikuti
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Feed Section */}
      <div className="flex-1">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border p-3 px-4 flex justify-between items-center">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Bookmark className="w-4 h-4" /> Konten ({combinedFeed.length})
          </h2>
        </div>

        {combinedFeed.length > 0 ? (
          <div className="flex flex-col w-full pb-8">
            {combinedFeed.map((card, idx) => (
              <KnowledgeFeedCard key={`${card.id}-${idx}`} card={card} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Bookmark className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Belum ada konten</h3>
            <p className="text-muted-foreground mb-6">Pengguna ini belum menyimpan atau merepost konten apapun.</p>
            <Link href="/" className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium shadow-sm hover:bg-primary/90 transition-all">
              Jelajahi Feed
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
