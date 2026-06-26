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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const cardRes = await knowledgeAPI.getCard(params.id);
        if (cardRes.success) {
          setCard(cardRes.data);
          // Mark as viewed
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
      const res = await interactionAPI.addComment(params.id, newComment);
      if (res.success && res.data) {
        setComments([{ ...res.data, isNew: true }, ...comments]);
        setNewComment('');
      }
    } catch (error) {
      console.error("Failed to add comment", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">⏳</div>
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

        {/* Comment Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>💬</span> Komentar ({comments.length})
          </h3>
          
          <form onSubmit={handleAddComment} className="mb-6 relative">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Apa pendapat Anda tentang fakta ini?"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[100px]"
              disabled={submitting}
            />
            <div className="flex justify-end mt-2">
              <button 
                type="submit" 
                disabled={submitting || !newComment.trim()}
                className="px-5 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Mengirim...' : 'Kirim Komentar'}
              </button>
            </div>
          </form>

          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-center text-gray-400 py-6">Belum ada komentar. Jadilah yang pertama!</p>
            ) : (
              comments.map((comment, i) => (
                <div key={comment.id || i} className={`flex gap-3 pb-4 ${i !== comments.length - 1 ? 'border-b border-gray-100' : ''} ${comment.isNew ? 'animate-pulse' : ''}`}>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold shrink-0">
                    U
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-gray-900">User Guest</span>
                      <span className="text-xs text-gray-400">Baru saja</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{comment.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
