'use client';

import React, { useState } from 'react';
import { BookOpen, CheckCircle2, ChevronRight } from 'lucide-react';
import { userAPI } from '@/lib/api';
import { cn } from '@/lib/utils';

interface OnboardingViewProps {
  availableDomains: string[];
  onComplete: () => void;
}

export function OnboardingView({ availableDomains, onComplete }: OnboardingViewProps) {
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleDomain = (domain: string) => {
    setSelectedDomains(prev => 
      prev.includes(domain) 
        ? prev.filter(d => d !== domain)
        : [...prev, domain]
    );
  };

  const handleSave = async () => {
    if (selectedDomains.length === 0) return;
    setIsSubmitting(true);
    try {
      await userAPI.updatePreferences(selectedDomains, 'intermediate');
      onComplete();
    } catch (err) {
      console.error("Failed to save preferences", err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-background">
      <div className="max-w-xl w-full bg-card p-8 rounded-3xl shadow-sm border border-border">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
          <BookOpen className="w-8 h-8 text-primary" />
        </div>
        
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">
          Pilih Minat Anda
        </h1>
        <p className="text-muted-foreground text-lg mb-8">
          Pilih topik yang ingin Anda pelajari. AI kami akan menyusun feed khusus untuk Anda.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
          {availableDomains.length > 0 ? availableDomains.map(domain => {
            const isSelected = selectedDomains.includes(domain);
            return (
              <button
                key={domain}
                onClick={() => toggleDomain(domain)}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 relative overflow-hidden",
                  isSelected 
                    ? "border-primary bg-primary/5 text-primary" 
                    : "border-border hover:border-primary/50 text-muted-foreground hover:bg-muted"
                )}
              >
                <span className="capitalize font-bold">{domain}</span>
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="w-4 h-4 text-primary fill-primary/20" />
                  </div>
                )}
              </button>
            )
          }) : (
            // Fallback skeleton
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse animate-in fade-in"></div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {selectedDomains.length} topik dipilih
          </p>
          <button
            onClick={handleSave}
            disabled={selectedDomains.length === 0 || isSubmitting}
            className={cn(
              "px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all shadow-sm",
              selectedDomains.length > 0
                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isSubmitting ? 'Menyimpan...' : 'Mulai Membaca'} 
            {!isSubmitting && <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingView;
