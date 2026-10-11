'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { homePath } from '@/auth/permissions';
import { Header } from '@/components/layout/Navbar/Header';
import { Sidebar } from '@/components/layout/Sidebar/Sidebar';
import { useSession } from '@/store/session/session-provider';
import {
  Home, Users, Menu, X,
  PlusCircle, Scale, ChevronRight, Calendar
} from 'lucide-react';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { currentUser } = useSession();
  const landing = homePath(currentUser.role);

  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const url = `/${pathSegments.slice(0, index + 1).join('/')}`;
    const formatted = segment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return { name: formatted, url };
  });

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface antialiased font-body">
      <Header />

      <div className="flex-1 flex overflow-hidden min-w-0">
        <div className="hidden md:flex flex-col">
          <Sidebar collapsed={sidebarCollapsed} />
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
            <div
              className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 max-w-[85vw] bg-surface-container-low h-full z-10 flex flex-col p-4 shadow-ambient-elevated">
              <div className="flex items-center justify-between pb-4 border-b border-surface-container">
                <span className="font-display font-bold text-sm">Navigation Menu</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-full text-on-surface-variant hover:text-on-surface"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto mt-2" onClick={() => setMobileMenuOpen(false)}>
                <Sidebar collapsed={false} />
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8 bg-surface">
          <div className="max-w-7xl mx-auto w-full pb-20 md:pb-8">
            <div className="flex items-center justify-between text-xs text-on-surface-variant mb-6 no-print">
              <nav className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={landing}
                  className="hover:text-primary transition-colors flex items-center gap-1 font-semibold"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Home</span>
                </Link>
                {breadcrumbs.map((b, i) => (
                  <React.Fragment key={b.url}>
                    <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />
                    {i === breadcrumbs.length - 1 ? (
                      <span className="font-bold text-on-surface">{b.name}</span>
                    ) : (
                      <Link href={b.url} className="hover:text-primary transition-colors font-medium">
                        {b.name}
                      </Link>
                    )}
                  </React.Fragment>
                ))}
              </nav>

              <div className="hidden sm:flex items-center gap-3 text-[11px] font-semibold text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-primary" />
                  <span>Trading Session: October 01, 2026</span>
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                <span className="text-success">Mandi Auction Active</span>
              </div>
            </div>

            {children}
          </div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 academic-glass bg-surface/90 border-t border-surface-container-high/40 px-3 py-2 flex items-center justify-around no-print">
        <button
          onClick={() => router.push(landing)}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
            pathname.includes('dashboard') || pathname.includes('salesperson-home') ? 'text-primary' : 'text-on-surface-variant'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => router.push('/customers')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
            pathname.includes('customers') ? 'text-primary' : 'text-on-surface-variant'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>Parties</span>
        </button>

        <button
          onClick={() => router.push('/sales/new')}
          className="w-12 h-12 -mt-5 rounded-full academic-btn-primary flex items-center justify-center text-white shadow-ambient-elevated active:scale-95"
          title="New Sale"
        >
          <PlusCircle className="w-6 h-6" />
        </button>

        <button
          onClick={() => router.push('/sales/todays')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
            pathname.includes('todays') ? 'text-primary' : 'text-on-surface-variant'
          }`}
        >
          <Scale className="w-5 h-5" />
          <span>Today</span>
        </button>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 text-[10px] font-semibold text-on-surface-variant"
        >
          <Menu className="w-5 h-5" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
};
