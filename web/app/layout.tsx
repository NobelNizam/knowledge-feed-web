import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/AuthContext';
import './globals.css';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import Topbar from '@/components/shared/Topbar';
import Bottombar from '@/components/shared/Bottombar';
import MainLayout from '@/components/shared/MainLayout';

export const metadata: Metadata = {
  title: 'Knowledge Feed',
  description: 'Transform scrolling into knowledge',
};

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <Topbar />
            <MainLayout>{children}</MainLayout>
            <Bottombar />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
