'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { knowledgeAPI, interactionAPI } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { KnowledgeFeedCard } from '@/components/cards/KnowledgeFeedCard';
import { RefreshCw, ArrowLeft, AlertCircle } from 'lucide-react';
import { updateCardInCache } from '@/lib/cache';
import type { CardData, CommentData } from '@/lib/types';

export default function CardDetail({ params }: { params: { id: string } }) {
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<CommentData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchCardAndData = async () => {
      try {
        const res = await knowledgeAPI.getCard(params.id);
        if (res.success) {
          setCard(res.data);
          
          // Rekam view
          const viewRes = await interactionAPI.viewCard(params.id);
          if (viewRes.success && viewRes.viewCount !== undefined) {
            setCard(prev => prev ? { ...prev, viewCount: viewRes.viewCount } : null);
            
            // Sync dengan feed utama dan cache
            window.dispatchEvent(new CustomEvent('card-interaction', {
              detail: { cardId: params.id, viewCount: viewRes.viewCount }
            }));
            updateCardInCache(params.id, { viewCount: viewRes.viewCount });
          }
        } else {
          setError(res.error || 'Failed to load card');
        }
      } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load card');
      } finally {
        setLoading(false);
      }
    };
    
    const fetchComments = async () => {
      try {
        const res = await interactionAPI.getComments(params.id);
        if (res.success) {
          setComments(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load comments:', err);
      }
    };

    fetchCardAndData();
    fetchComments();
  }, [params.id]);

  const handleSubmitComment = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (!newCommentText.trim()) return;
    
    setSubmitting(true);
    try {
      const res = await interactionAPI.addComment(
        params.id, 
        newCommentText, 
        replyingTo ? replyingTo.id : undefined
      );
      
      if (res.success) {
        setNewCommentText('');
        setReplyingTo(null);
        
        // Refresh comments list
        const refreshed = await interactionAPI.getComments(params.id);
        const newCommentsCount = refreshed.data ? refreshed.data.length : 0;
        
        if (refreshed.success) {
          setComments(refreshed.data || []);
        }

        // Increment comments count di card state
        setCard(prev => {
          if (!prev) return null;
          return {
            ...prev,
            commentsCount: newCommentsCount
          };
        });

        // Sync dengan feed utama dan cache
        window.dispatchEvent(new CustomEvent('card-interaction', {
          detail: { cardId: params.id, commentsCount: newCommentsCount }
        }));
        updateCardInCache(params.id, { commentsCount: newCommentsCount });
      }
    } catch (err) {
      console.error('Failed to submit comment:', err);
      alert('Gagal mengirim balasan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="animate-spin text-muted-foreground w-8 h-8" />
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="p-4 max-w-2xl mx-auto w-full">
        <button onClick={() => router.back()} className="flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-1" />
          Kembali
        </button>
        <div className="bg-destructive/10 text-destructive p-6 rounded-xl border border-destructive/20 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-10 h-10 mb-2" />
          <h2 className="text-xl font-bold mb-1">Terjadi Kesalahan</h2>
          <p>{error || 'Konten tidak ditemukan.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 w-full max-w-2xl mx-auto border-x border-border min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border p-4 flex items-center">
        <button onClick={() => router.back()} className="mr-4 p-2 rounded-full hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold">Postingan</h1>
      </div>

      <div className="pb-8">
        <KnowledgeFeedCard card={card} isDetailView={true} />
        
        {/* Fitur Komentar/Replies */}
        <div className="p-4 sm:p-6 border-b border-border bg-background">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            Balasan <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs">{card.commentsCount !== undefined ? card.commentsCount : comments.length}</span>
          </h3>
          
          <div className="flex items-start gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xl shrink-0">
              👤
            </div>
            <div className="flex-1">
              {replyingTo && (
                <div className="mb-2 p-2 bg-muted rounded-lg flex justify-between items-center text-xs text-muted-foreground">
                  <span>Membalas <strong>@{replyingTo.user?.name || 'User'}</strong>: "{replyingTo.content.substring(0, 30)}..."</span>
                  <button onClick={() => setReplyingTo(null)} className="text-destructive font-bold ml-2">Batal</button>
                </div>
              )}
              <textarea 
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="w-full bg-background border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none min-h-[80px] text-foreground"
                placeholder={replyingTo ? "Tulis balasan Anda..." : "Balas postingan ini..."}
                disabled={submitting}
              ></textarea>
              <div className="flex justify-end mt-2">
                <button 
                  onClick={handleSubmitComment}
                  disabled={submitting || !newCommentText.trim()}
                  className="px-5 py-2 bg-primary text-primary-foreground font-medium rounded-full shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Mengirim...' : 'Kirim'}
                </button>
              </div>
            </div>
          </div>
          
          {comments.length === 0 ? (
            <div className="mt-8 text-center py-10">
              <p className="text-muted-foreground text-sm">Belum ada balasan.</p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-6">
              {comments.map((comment) => (
                <div key={comment.id} className="flex flex-col border-b border-border/50 pb-4 last:border-0 last:pb-0">
                  {/* Komentar Utama */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm shrink-0 font-bold">
                      {(comment.user?.name || 'U').substring(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-foreground">
                          {comment.user?.name || 'Pengguna'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-foreground/90 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                      
                      {/* Tombol Reply */}
                      <button 
                        onClick={() => {
                          setReplyingTo(comment);
                          // Scroll ke textarea
                          const txtArea = document.querySelector('textarea');
                          if (txtArea) {
                            txtArea.focus();
                            window.scrollTo({ top: txtArea.getBoundingClientRect().top + window.scrollY - 150, behavior: 'smooth' });
                          }
                        }}
                        className="mt-2 text-xs font-semibold text-primary hover:underline"
                      >
                        Balas
                      </button>
                    </div>
                  </div>

                  {/* Reply Comments (Indented) */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 pl-8 flex flex-col gap-3 border-l-2 border-border ml-4">
                      {comment.replies.map((reply: CommentData) => (
                        <div key={reply.id} className="flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs shrink-0 font-bold">
                            {(reply.user?.name || 'U').substring(0, 1).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-foreground">
                                {reply.user?.name || 'Pengguna'}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(reply.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-foreground/90 whitespace-pre-wrap">
                              {reply.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
