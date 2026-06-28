'use client';

import React, { useEffect, useState } from 'react';
import { useFilter } from '@/lib/FilterContext';
import { knowledgeAPI } from '@/lib/api';
import { buildDomainTree, DOMAIN_LEVEL1_LIST } from '@/lib/domainMapping';
import { ChevronDown, ChevronRight, X, BookOpen, Layers, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RightFilterPanel() {
  const { activeFilter, isFilterOpen, setFilter, setFilterOpen } = useFilter();
  const [dbDomains, setDbDomains] = useState<string[]>([]);
  const [domainTree, setDomainTree] = useState<Record<string, string[]>>({});
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({});

  // Fetch domain list from backend database
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const res = await knowledgeAPI.getDomains();
        if (res.success && res.data) {
          setDbDomains(res.data);
          const tree = buildDomainTree(res.data);
          setDomainTree(tree);
          
          // Secara default, perluas domain Level 1 yang aktif jika ada
          if (activeFilter.type === 'level2') {
            // Temukan induk Level 1 dari Level 2 aktif
            const parent = Object.keys(tree).find(key => 
              tree[key].some(sub => sub.toLowerCase() === activeFilter.value.toLowerCase())
            );
            if (parent) {
              setExpandedDomains(prev => ({ ...prev, [parent]: true }));
            }
          }
        }
      } catch (err) {
        console.error("Failed to load domains in RightFilterPanel", err);
      }
    };
    fetchDomains();
  }, [activeFilter]);

  const toggleExpand = (domainName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Mencegah pemicu klik filter Level 1 saat klik chevron
    setExpandedDomains(prev => ({
      ...prev,
      [domainName]: !prev[domainName]
    }));
  };

  const handleLevel1Click = (domainName: string) => {
    // Ambil seluruh disiplin Level 2 di bawah Level 1 ini yang ada di DB
    const subDomains = domainTree[domainName] || [];
    setFilter('level1', domainName, subDomains);
  };

  const handleLevel2Click = (disciplineName: string) => {
    setFilter('level2', disciplineName, [disciplineName]);
  };

  const handleClearFilter = () => {
    setFilter('all', 'Semua', []);
  };

  return (
    <>
      {/* Overlay hitam transparan untuk mobile ketika filter terbuka */}
      {isFilterOpen && (
        <div 
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm transition-opacity sm:hidden"
          onClick={() => setFilterOpen(false)}
        />
      )}

      {/* Panel Sidebar Kanan */}
      <aside
        className={cn(
          // Posisi & layout default (desktop)
          "sticky top-[108px] right-0 z-20 flex h-[calc(100vh-140px)] w-[280px] shrink-0 flex-col border border-border/60 bg-card/60 backdrop-blur-md rounded-2xl p-5 overflow-y-auto transition-all duration-300 shadow-sm hidden md:flex",
          // Posisi & layout ketika mobile (slide-over drawer dari kanan)
          "max-md:fixed max-md:top-0 max-md:right-0 max-md:h-screen max-md:w-[300px] max-md:z-40 max-md:bg-background max-md:border-l max-md:border-border max-md:rounded-none max-md:p-6 max-md:shadow-2xl",
          // Buka-tutup panel di mobile & desktop
          isFilterOpen 
            ? "max-md:translate-x-0 md:flex md:opacity-100" 
            : "max-md:translate-x-full md:hidden md:opacity-0"
        )}
      >
        {/* Header Panel */}
        <div className="flex items-center justify-between pb-4 border-b border-border/40 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Filter Pengetahuan</h2>
          </div>
          <button
            onClick={() => setFilterOpen(false)}
            className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors md:hidden"
            title="Tutup Filter"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Isi Filter Tree */}
        <div className="flex flex-col flex-1 gap-2">
          {/* Opsi Tampilkan Semua */}
          <button
            onClick={handleClearFilter}
            className={cn(
              "flex items-center justify-between w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
              activeFilter.type === 'all'
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Semua Bidang
            </span>
            {activeFilter.type === 'all' && <Check className="h-4 w-4" />}
          </button>

          <div className="h-px bg-border/40 my-2 shrink-0" />

          {/* List Domain Utama (Level 1) */}
          <div className="flex flex-col gap-1.5">
            {DOMAIN_LEVEL1_LIST.map((level1) => {
              const subDomains = domainTree[level1.name] || [];
              // Domain Level 1 ini hanya ditampilkan jika memiliki Level 2 aktif di DB
              if (subDomains.length === 0) return null;

              const isExpanded = !!expandedDomains[level1.name];
              const isSelected = activeFilter.type === 'level1' && activeFilter.value === level1.name;

              return (
                <div key={level1.name} className="flex flex-col">
                  {/* Domain Utama Row */}
                  <div
                    onClick={() => handleLevel1Click(level1.name)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer",
                      isSelected
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <span className="truncate pr-2">{level1.name}</span>
                    <button
                      onClick={(e) => toggleExpand(level1.name, e)}
                      className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-all shrink-0"
                      title={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {/* Disiplin Level 2 Sub-list */}
                  {isExpanded && subDomains.length > 0 && (
                    <div className="flex flex-col pl-6 mt-1 border-l border-border/40 ml-4 gap-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      {subDomains.map((level2) => {
                        const isSubSelected = activeFilter.type === 'level2' && activeFilter.value.toLowerCase() === level2.toLowerCase();
                        return (
                          <button
                            key={level2}
                            onClick={() => handleLevel2Click(level2)}
                            className={cn(
                              "text-left px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
                              isSubSelected
                                ? "text-primary bg-primary/5 font-bold"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                          >
                            {level2}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
