'use client';

import React, { useState, useEffect } from 'react';
import { useFilter } from '@/lib/FilterContext';
import { DOMAIN_LEVEL1_LIST, DOMAIN_LEVEL2_MAP } from '@/lib/domainMapping';
import { ChevronDown, ChevronRight, X, BookOpen, Layers, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RightFilterPanel() {
  const { activeFilter, isFilterOpen, setFilter, setFilterOpen } = useFilter();
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({});

  // Secara otomatis ekspansi rumpun induk Level 1 jika ada disiplin Level 2 yang aktif saat mount/perubahan filter
  useEffect(() => {
    if (activeFilter.type === 'level2') {
      const parent = Object.keys(DOMAIN_LEVEL2_MAP).find(key => 
        DOMAIN_LEVEL2_MAP[key].some(sub => sub.name.toLowerCase() === activeFilter.value.toLowerCase())
      );
      if (parent) {
        setExpandedDomains(prev => ({ ...prev, [parent]: true }));
      }
    }
  }, [activeFilter]);

  const toggleExpand = (domainName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Mencegah pemicu klik filter Level 1 saat klik chevron
    setExpandedDomains(prev => ({
      ...prev,
      [domainName]: !prev[domainName]
    }));
  };

  const handleLevel1Click = (domainName: string) => {
    // Ambil seluruh nama disiplin Level 2 di bawah Level 1 ini secara statis
    const subDomains = DOMAIN_LEVEL2_MAP[domainName]?.map(d => d.name) || [];
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
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setFilterOpen(false)}
        />
      )}

      {/* Panel Sidebar Kanan */}
      <aside
        className={cn(
          // Base styles (common for mobile & desktop)
          "z-20 flex w-[290px] shrink-0 flex-col border border-border/60 bg-card/60 backdrop-blur-md rounded-2xl p-5 overflow-y-auto transition-all duration-300 shadow-sm",
          // Desktop specific layout (sticky)
          "lg:sticky lg:top-[108px] lg:h-[calc(100vh-140px)]",
          // Mobile specific layout (fixed drawer)
          "max-lg:fixed max-lg:top-0 max-lg:right-0 max-lg:h-screen max-lg:w-[300px] max-lg:z-40 max-lg:bg-background max-lg:border-l max-lg:border-border max-lg:rounded-none max-lg:p-6 max-lg:shadow-2xl",
          // Open/Close state management
          isFilterOpen 
            ? "translate-x-0 opacity-100 lg:flex" 
            : "max-lg:translate-x-full lg:hidden max-lg:opacity-0"
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
            className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors lg:hidden"
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
              All Domains
            </span>
            {activeFilter.type === 'all' && <Check className="h-4 w-4" />}
          </button>

          <div className="h-px bg-border/40 my-2 shrink-0" />

          {/* List Domain Utama (Level 1) */}
          <div className="flex flex-col gap-1.5">
            {DOMAIN_LEVEL1_LIST.map((level1) => {
              const subDisciplines = DOMAIN_LEVEL2_MAP[level1.name] || [];
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
                  {isExpanded && subDisciplines.length > 0 && (
                    <div className="flex flex-col pl-6 mt-1 border-l border-border/40 ml-4 gap-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      {subDisciplines.map((level2) => {
                        const isSubSelected = activeFilter.type === 'level2' && activeFilter.value.toLowerCase() === level2.name.toLowerCase();
                        return (
                          <button
                            key={level2.name}
                            onClick={() => handleLevel2Click(level2.name)}
                            className={cn(
                              "text-left px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
                              isSubSelected
                                ? "text-primary bg-primary/5 font-bold"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                          >
                            {level2.name}
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
