'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ActiveFilter {
  type: 'all' | 'level1' | 'level2';
  value: string; // Nama filter ("Semua", "Formal Sciences", "coding", dll.)
  domains?: string[]; // Array Level 2 yang dicakup (kosong jika 'all')
}

interface FilterContextType {
  activeFilter: ActiveFilter;
  isFilterOpen: boolean;
  setFilter: (type: 'all' | 'level1' | 'level2', value: string, domains?: string[]) => void;
  toggleFilter: () => void;
  setFilterOpen: (open: boolean) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [activeFilter, setActiveFilterState] = useState<ActiveFilter>({
    type: 'all',
    value: 'Semua'
  });
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Restore active filter from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFilter = sessionStorage.getItem('active_filter_state');
      const savedFilterOpen = sessionStorage.getItem('is_filter_panel_open');
      
      if (savedFilter) {
        try {
          setActiveFilterState(JSON.parse(savedFilter));
        } catch (e) {
          console.error("Failed to parse saved filter state");
        }
      }
      
      if (savedFilterOpen) {
        setIsFilterOpen(savedFilterOpen === 'true');
      }
    }
  }, []);

  const setFilter = (type: 'all' | 'level1' | 'level2', value: string, domains?: string[]) => {
    const nextFilter: ActiveFilter = { type, value, domains };
    setActiveFilterState(nextFilter);
    sessionStorage.setItem('active_filter_state', JSON.stringify(nextFilter));
  };

  const toggleFilter = () => {
    setIsFilterOpen(prev => {
      const nextVal = !prev;
      sessionStorage.setItem('is_filter_panel_open', String(nextVal));
      return nextVal;
    });
  };

  const setFilterOpen = (open: boolean) => {
    setIsFilterOpen(open);
    sessionStorage.setItem('is_filter_panel_open', String(open));
  };

  return (
    <FilterContext.Provider value={{
      activeFilter,
      isFilterOpen,
      setFilter,
      toggleFilter,
      setFilterOpen
    }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
}
