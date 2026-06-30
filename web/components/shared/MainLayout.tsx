'use client';

import { usePathname } from 'next/navigation';
import LeftSidebar from './LeftSidebar';
import RightFilterPanel from './RightFilterPanel';
import { FilterProvider } from '@/lib/FilterContext';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register';

  if (isAuthPage) {
    return <main className="flex min-h-screen flex-col">{children}</main>;
  }

  return (
    <FilterProvider>
      <main className="flex flex-row justify-between w-full relative">
        <LeftSidebar />
        
        <section className="flex min-h-screen flex-1 flex-col px-6 pb-10 pt-28 max-md:pb-24 sm:px-10 overflow-x-hidden">
          <div className="w-full max-w-2xl mx-auto">
            {children}
          </div>
        </section>
        
        <RightFilterPanel />
      </main>
    </FilterProvider>
  );
}
