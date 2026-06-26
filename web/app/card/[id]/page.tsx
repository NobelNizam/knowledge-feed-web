'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import KnowledgeCard from '@/components/KnowledgeCard';
import { knowledgeAPI, interactionAPI } from '@/lib/api';

export default function CardDetailPage({ params }: { params: { id: string } }) {
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const cardRes = await knowledgeAPI.getCard(params.id);
        if (cardRes.success) {
          setCard(cardRes.data);
          await interactionAPI.viewCard(params.id);
        }
        
        const commentsRes = await interactionAPI.getComments(params.id);
        if (commentsRes.success) {
          setComments(commentsRes.data || []);
        }
      } catch (error) {
        console.error("Failed to load card details", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [params.id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    try {
      setSubmitting(true);
      const res = await interactionAPI.addComment(params.id, newComment, replyingTo || undefined);
      if (res.success && res.data) {
        setComments([{ ...res.data, isNew: true }, ...comments]);
        setNewComment('');
        setReplyingTo(null);
      }
    } catch (error) {
      console.error("Failed to add comment", error);
    } finally {
      setSubmitting(false);
    }
  };

  const CommentItem = ({ comment, depth = 0 }: { comment: any, depth?: number }) => {
    const childComments = comments.filter(c => c.parentId === comment.id);
    
    return (
      <div className={`pt-4 ${depth > 0 ? 'ml-6 md:ml-12 border-l-2 border-gray-100 pl-4 mt-2' : ''} ${comment.isNew ? 'animate-pulse bg-blue-50/50 -mx-4 px-4 rounded-xl' : ''}`}>
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold shrink-0 text-sm">
            U
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-gray-900">User Guest</span>
              <span className="text-xs text-gray-400">Baru saja</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{comment.text}</p>
            <div className="mt-2 flex gap-4">
              <button className="text-xs font-medium text-gray-500 hover:text-red-500 transition-colors">❤️ Suka</button>
              <button 
                onClick={() => { setReplyingTo(comment.id); document.getElementById('comment-input')?.focus(); }}
                className="text-xs font-medium text-gray-500 hover:text-blue-500 transition-colors"
              >
                ↩️ Balas
              </button>
            </div>
          </div>
        </div>
        
        {/* Render child comments recursively */}
        {childComments.length > 0 && (
          <div className="mt-2">
            {childComments.map(child => (
              <CommentItem key={child.id} comment={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">⏳</div>
          <p className="text-gray-500">Memuat pengetahuan...</p>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Kartu Tidak Ditemukan</h1>
        <p className="text-gray-500 mb-6">Mungkin kartu ini sudah dihapus atau URL tidak valid.</p>
        <Link href="/" className="px-6 py-2 bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600 transition-colors">
          Kembali ke Feed
        </Link>
      </div>
    );
  }

  // Root comments are those without a parentId
  const rootComments = comments.filter(c => !c.parentId);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-gray-900 transition-colors flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Detail Pengetahuan</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <KnowledgeCard card={card} isDetailView={true} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>💬</span> Diskusi ({comments.length})
          </h3>
          
          <form onSubmit={handleAddComment} className="mb-8 relative border border-gray-200 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
            {replyingTo && (
              <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex justify-between items-center text-sm text-blue-700">
                <span>Membalas komentar...</span>
                <button type="button" onClick={() => setReplyingTo(null)} className="font-bold hover:text-blue-900">✕</button>
              </div>
            )}
            <textarea
              id="comment-input"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? "Tulis balasan Anda..." : "Apa pendapat Anda tentang fakta ini?"}
              className="w-full bg-transparent px-4 py-3 text-gray-700 focus:outline-none resize-none min-h-[90px]"
              disabled={submitting}
            />
            <div className="flex justify-end bg-gray-50 px-3 py-2 border-t border-gray-100">
              <button 
                type="submit" 
                disabled={submitting || !newComment.trim()}
                className="px-5 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Mengirim...' : 'Kirim'}
              </button>
            </div>
          </form>

          <div className="space-y-2 divide-y divide-gray-100">
            {rootComments.length === 0 ? (
              <p className="text-center text-gray-400 py-6">Belum ada diskusi. Jadilah yang pertama berkomentar!</p>
            ) : (
              rootComments.map(comment => (
                <CommentItem key={comment.id} comment={comment} />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
