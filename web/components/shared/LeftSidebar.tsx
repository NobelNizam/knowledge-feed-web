'use client';

import { Home, Search, User, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

function LeftSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <section className="sticky left-0 top-0 z-20 flex h-screen w-fit flex-col justify-between overflow-auto border-r border-border bg-background pb-5 pt-28 max-sm:hidden lg:w-[266px]">
      <div className="flex w-full flex-1 flex-col gap-6 px-6">
        <Link 
          href="/" 
          className={`relative flex justify-start gap-4 rounded-lg p-4 hover:bg-accent hover:text-accent-foreground ${pathname === '/' ? 'bg-primary text-primary-foreground font-bold' : 'text-foreground'}`}
        >
          <Home className="h-6 w-6" />
          <p className="max-lg:hidden">Home</p>
        </Link>
        <Link 
          href="/search" 
          className={`relative flex justify-start gap-4 rounded-lg p-4 hover:bg-accent hover:text-accent-foreground ${pathname === '/search' ? 'bg-primary text-primary-foreground font-bold' : 'text-foreground'}`}
        >
          <Search className="h-6 w-6" />
          <p className="max-lg:hidden">Search</p>
        </Link>
        <Link 
          href="/profile" 
          className={`relative flex justify-start gap-4 rounded-lg p-4 hover:bg-accent hover:text-accent-foreground ${pathname === '/profile' ? 'bg-primary text-primary-foreground font-bold' : 'text-foreground'}`}
        >
          <User className="h-6 w-6" />
          <p className="max-lg:hidden">Profile</p>
        </Link>
        {user?.role === 'ADMIN' && (
          <Link 
            href="/admin" 
            className={`relative flex justify-start gap-4 rounded-lg p-4 hover:bg-accent hover:text-accent-foreground ${pathname === '/admin' ? 'bg-primary text-primary-foreground font-bold' : 'text-foreground'}`}
          >
            <ShieldCheck className="h-6 w-6" />
            <p className="max-lg:hidden">Admin</p>
          </Link>
        )}
      </div>
    </section>
  );
}

export default LeftSidebar;
