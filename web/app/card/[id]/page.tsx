'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { knowledgeAPI } from '@/lib/api';
import { KnowledgeFeedCard } from '@/components/cards/KnowledgeFeedCard';
import { RefreshCw, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function CardDetail({ params }: { params: { id: string } }) {
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchCard = async () => {
      try {
        const res = await knowledgeAPI.getCard(params.id);
        if (res.success) {
          setCard(res.data);
        } else {
          setError(res.error || 'Failed to load card');
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load card');
      } finally {
        setLoading(false);
      }
    };
    fetchCard();
  }, [params.id]);

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
        
        {/* Placeholder untuk Komentar/Replies */}
        <div className="p-4 sm:p-6 border-b border-border bg-background">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            Balasan <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs">0</span>
          </h3>
          
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xl shrink-0">
              👤
            </div>
            <div className="flex-1">
              <textarea 
                className="w-full bg-background border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none min-h-[80px] text-foreground"
                placeholder="Balas postingan ini..."
              ></textarea>
              <div className="flex justify-end mt-2">
                <button className="px-5 py-2 bg-primary text-primary-foreground font-medium rounded-full shadow-sm hover:bg-primary/90 transition-colors">
                  Kirim
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center py-10">
            <p className="text-muted-foreground text-sm">Belum ada balasan.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
