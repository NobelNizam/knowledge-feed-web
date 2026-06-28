'use client';

import { Home, Search, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function Bottombar() {
  const pathname = usePathname();

  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <section className="fixed bottom-0 z-10 w-full rounded-t-3xl bg-background/80 p-4 backdrop-blur-md sm:hidden border-t border-border">
      <div className="flex items-center justify-around gap-3 px-2">
        <Link href="/" className="flex flex-col items-center gap-2 p-2">
          <Home className={`h-6 w-6 ${pathname === '/' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} />
        </Link>
        <Link href="/search" className="flex flex-col items-center gap-2 p-2">
          <Search className={`h-6 w-6 ${pathname === '/search' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} />
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-2 p-2">
          <User className={`h-6 w-6 ${pathname === '/profile' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} />
        </Link>
      </div>
    </section>
  );
}

export default Bottombar;
