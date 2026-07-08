'use client';

import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/lib/AuthContext";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

function Topbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <nav className="fixed top-0 z-30 flex w-full items-center justify-between bg-background/80 px-6 py-3 backdrop-blur-md border-b border-border">
      <Link href="/" className="flex items-center gap-4">
        <p className="text-xl font-bold text-foreground max-xs:hidden">Knowledge Feed</p>
      </Link>

      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground hidden sm:inline-block">
              Halo, {user.displayName}
            </span>
            <button 
              onClick={logout}
              className="text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <Link href="/login" className="text-sm font-medium text-primary hover:underline">
            Login
          </Link>
        )}
        <ThemeToggle />
      </div>
    </nav>
  );
}

export default Topbar;
