'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { userAPI, knowledgeAPI } from '@/lib/api';
import { DOMAIN_LEVEL1_LIST, DOMAIN_LEVEL2_MAP } from '@/lib/domainMapping';
import { ArrowLeft, Save, Loader2, Check } from 'lucide-react';
import Link from 'next/link';

const EMOJI_AVATARS = ['👤', '🧑‍💻', '🔬', '💻', '🏥', '🌾', '👥', '🎨', '🧬', '🪐', '🧠', '🚀', '🐱', '🦊', '🦁'];

export default function ProfileSettings() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👤');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Protect route & init data
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      setName(user.name || '');
      setSelectedAvatar(user.avatarUrl || '👤');
      setSelectedDomains(user.preferences?.domains || []);
      
      // Fetch Level 3 tags
      const fetchTagsAndData = async () => {
        try {
          const res = await knowledgeAPI.getTags();
          if (res.success) {
            setAvailableTags(res.data || []);
          }
        } catch (err) {
          console.error('Failed to load Level 3 tags:', err);
        } finally {
          setLoadingData(false);
        }
      };
      fetchTagsAndData();
    }
  }, [user, authLoading, router]);

  const toggleDomain = (domain: string) => {
    setSelectedDomains(prev => 
      prev.includes(domain) 
        ? prev.filter(d => d !== domain)
        : [...prev, domain]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama tidak boleh kosong');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Update nama profil & avatar
      const profileRes = await userAPI.updateProfile(name.trim(), selectedAvatar);
      if (!profileRes.success) {
        throw new Error(profileRes.error || 'Gagal memperbarui profil');
      }

      // 2. Update preferensi domain (onboarding/minat)
      const prefRes = await userAPI.updatePreferences(selectedDomains, user?.preferences?.readingLevel || 'intermediate');
      if (!prefRes.success) {
        throw new Error(prefRes.error || 'Gagal memperbarui preferensi');
      }

      // Refresh data user di context
      await refreshUser();
      setSuccess(true);
      
      // Clear cache feed agar preferensi baru diterapkan
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('feed_tab_states');
      }

      setTimeout(() => {
        router.push('/profile');
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Terjadi kesalahan saat menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || (!user && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-muted-foreground w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 w-full max-w-2xl mx-auto border-x border-border min-h-screen bg-background pb-12">
      {/* Top Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border p-4 flex items-center gap-3">
        <Link href="/profile" className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-foreground">Pengaturan Profil</h1>
          <p className="text-xs text-muted-foreground">Kustomisasi akun dan minat bacaan Anda</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="p-6 flex flex-col gap-8">
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20 font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-500/10 text-emerald-500 text-sm rounded-xl border border-emerald-500/20 font-medium flex items-center gap-2">
            <Check className="w-4 h-4" /> Pengaturan berhasil disimpan! Mengalihkan...
          </div>
        )}

        {/* Seksi 1: Akun & Avatar */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-bold text-primary tracking-wider uppercase">1. Profil & Avatar</h2>
          <div className="bg-card border border-border p-5 rounded-2xl flex flex-col gap-6">
            {/* Pemilihan Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center text-5xl border-2 border-primary/20 shadow-inner select-none">
                {selectedAvatar}
              </div>
              <span className="text-xs text-muted-foreground font-medium">Pilih Emoji Avatar</span>
              
              <div className="flex flex-wrap justify-center gap-2 max-w-md mt-1">
                {EMOJI_AVATARS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedAvatar(emoji)}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl text-xl border transition-all ${
                      selectedAvatar === emoji
                        ? 'border-primary bg-primary/10 text-primary scale-110 shadow-sm'
                        : 'border-border hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Nama Input */}
            <div className="flex flex-col gap-2">
              <label htmlFor="name-input" className="text-xs font-semibold text-muted-foreground">Nama Tampilan (Unik)</label>
              <input
                id="name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama tampilan unik Anda..."
                className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:border-primary text-foreground text-sm font-medium transition-colors"
                required
              />
            </div>
          </div>
        </div>

        {/* Seksi 2: Preferensi Minat (Level 1 & 2) */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-bold text-primary tracking-wider uppercase">2. Minat Topik Rumpun Ilmu (Level 1 & 2)</h2>
          <p className="text-xs text-muted-foreground -mt-2">Pilih rumpun bidang ilmu dan disiplin akademik yang ingin Anda baca di timeline.</p>
          
          <div className="flex flex-col gap-4">
            {DOMAIN_LEVEL1_LIST.map((level1) => {
              const subDomains = DOMAIN_LEVEL2_MAP[level1.name] || [];
              return (
                <div key={level1.name} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  {/* Level 1 Group Header */}
                  <div className="p-4 bg-muted/40 border-b border-border flex items-start gap-3">
                    <input
                      type="checkbox"
                      id={`level1-${level1.name}`}
                      checked={subDomains.every(sub => selectedDomains.includes(sub.name))}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const subNames = subDomains.map(s => s.name);
                        setSelectedDomains(prev => {
                          const base = prev.filter(d => !subNames.includes(d));
                          return checked ? [...base, ...subNames] : base;
                        });
                      }}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div>
                      <label htmlFor={`level1-${level1.name}`} className="font-bold text-foreground text-sm cursor-pointer select-none">{level1.name}</label>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{level1.description}</p>
                    </div>
                  </div>

                  {/* Level 2 Sub-list */}
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-card/65">
                    {subDomains.map((discipline) => {
                      const isSelected = selectedDomains.includes(discipline.name);
                      return (
                        <button
                          key={discipline.name}
                          type="button"
                          onClick={() => toggleDomain(discipline.name)}
                          className={`p-3 text-left rounded-xl border transition-all flex items-start gap-2.5 relative ${
                            isSelected
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-border/60 hover:border-primary/50 text-muted-foreground hover:bg-muted/40'
                          }`}
                        >
                          <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                          }`}>
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground">{discipline.name}</span>
                            <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{discipline.description}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Seksi 3: Tags / Subtopik Spesifik (Level 3) */}
        {availableTags.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-bold text-primary tracking-wider uppercase">3. Subtopik Spesifik & Tags (Level 3)</h2>
            <p className="text-xs text-muted-foreground -mt-2">Pilih kata kunci atau tag khusus yang paling memicu rasa ingin tahu Anda.</p>
            
            <div className="bg-card border border-border p-5 rounded-2xl flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isSelected = selectedDomains.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleDomain(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <span>#{tag}</span>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md hover:bg-primary/95 transition-all flex items-center justify-center gap-2 text-sm disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin w-4 h-4" />
              Menyimpan Perubahan...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Simpan Pengaturan
            </>
          )}
        </button>
      </form>
    </div>
  );
}
