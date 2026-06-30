'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { userAPI, knowledgeAPI } from '@/lib/api';
import { DOMAIN_LEVEL1_LIST, DOMAIN_LEVEL2_MAP } from '@/lib/domainMapping';
import { ArrowLeft, Save, Loader2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

const EMOJI_AVATARS = ['👤', '🧑‍💻', '🔬', '💻', '🏥', '🌾', '👥', '🎨', '🧬', '🪐', '🧠', '🚀', '🐱', '🦊', '🦁'];

export default function ProfileSettings() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👤');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);

  // Accordion state (YAGNI/Ponytail)
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Protect route & init data
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      setName(user.name || '');
      setSelectedAvatar(user.avatarUrl || '👤');
      setSelectedDomains(user.preferences?.domains || []);
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



  const toggleAccordion = (domainName: string) => {
    setExpandedDomain(prev => prev === domainName ? null : domainName);
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

      <form onSubmit={handleSave} className="p-6 flex flex-col gap-6">
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
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-primary tracking-wider uppercase">1. Profil & Avatar</h2>
          <div className="bg-card border border-border p-5 rounded-2xl flex flex-col gap-5">
            {/* Pemilihan Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center text-4xl border border-border select-none">
                {selectedAvatar}
              </div>
              <span className="text-[11px] text-muted-foreground font-semibold">Pilih Emoji Avatar</span>

              <div className="flex flex-wrap justify-center gap-1.5 max-w-md">
                {EMOJI_AVATARS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedAvatar(emoji)}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-lg border transition-all ${selectedAvatar === emoji
                        ? 'border-primary bg-primary/10 text-primary scale-105'
                        : 'border-border hover:bg-muted text-muted-foreground'
                      }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Nama Input */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name-input" className="text-xs font-semibold text-muted-foreground">Nama Tampilan (Unik)</label>
              <input
                id="name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama tampilan unik..."
                className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary text-foreground text-sm font-medium transition-colors"
                required
              />
            </div>
          </div>
        </div>

        {/* Seksi 2: Preferensi Minat (Dropdown Accordion - Lvl 1 s.d Lvl 3) */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold text-primary tracking-wider uppercase">2. Preferensi Topik</h2>
            <span className="text-[11px] text-muted-foreground font-medium">{selectedDomains.length} terpilih</span>
          </div>
          <p className="text-xs text-muted-foreground -mt-1.5">Klik pada bidang ilmu untuk membuka daftar disiplin ilmu terkait.</p>

          <div className="flex flex-col gap-2">
            {DOMAIN_LEVEL1_LIST.map((level1) => {
              const isExpanded = expandedDomain === level1.name;
              const subDomains = DOMAIN_LEVEL2_MAP[level1.name] || [];
              const subNames = subDomains.map(s => s.name);

              // Hitung jumlah terpilih dalam rumpun ini
              const selectedCount = subDomains.filter(s => selectedDomains.includes(s.name)).length;

              return (
                <div key={level1.name} className="bg-card border border-border rounded-xl overflow-hidden transition-all duration-200">
                  {/* Accordion Header (YAGNI / Ponytail) */}
                  <div
                    onClick={() => toggleAccordion(level1.name)}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-muted/30 select-none transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox Rumpun */}
                      <input
                        type="checkbox"
                        checked={subDomains.every(sub => selectedDomains.includes(sub.name))}
                        onChange={(e) => {
                          e.stopPropagation(); // Cegah toggle accordion
                          const checked = e.target.checked;
                          setSelectedDomains(prev => {
                            const base = prev.filter(d => !subNames.includes(d));
                            return checked ? [...base, ...subNames] : base;
                          });
                        }}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary relative z-10 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-foreground text-sm block truncate">{level1.name}</span>
                        <span className="text-[10px] text-muted-foreground block truncate max-w-sm mt-0.5">{level1.description}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {selectedCount > 0 && (
                        <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                          {selectedCount}
                        </span>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Accordion Content (Dropdown collapse) */}
                  {isExpanded && (
                    <div className="p-4 border-t border-border/60 bg-muted/10 flex flex-col gap-3 animate-in slide-in-from-top duration-200">
                      {/* Level 2 Sub-Domains */}
                      {subDomains.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Disiplin Ilmu (Level 2)</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {subDomains.map((discipline) => {
                              const isSelected = selectedDomains.includes(discipline.name);
                              return (
                                <button
                                  key={discipline.name}
                                  type="button"
                                  onClick={() => toggleDomain(discipline.name)}
                                  className={`p-2.5 text-left rounded-lg border text-xs transition-all flex items-start gap-2 relative ${isSelected
                                      ? 'border-primary bg-primary/5 text-primary'
                                      : 'border-border/60 hover:border-primary/50 text-muted-foreground hover:bg-muted/40'
                                    }`}
                                >
                                  <div className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                                    }`}>
                                    {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-foreground truncate">{discipline.name}</span>
                                    <span className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1">{discipline.description}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Tidak ada sub-disiplin.</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-md hover:bg-primary/95 transition-all flex items-center justify-center gap-2 text-sm disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
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
