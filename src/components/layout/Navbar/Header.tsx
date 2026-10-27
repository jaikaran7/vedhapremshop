'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCompanyQuery } from '@/hooks/queries/use-directory-query';
import { useSession } from '@/store/session/session-provider';
import { logout } from '@/api/auth.api';
import { STORAGE_KEYS } from '@/constants/storage';
import {
  User as UserIcon, PlusCircle,
  LogOut, Menu, Shield
} from 'lucide-react';

export const Header: React.FC<{ onOpenMenu?: () => void }> = ({ onOpenMenu }) => {
  const { currentUser, setCurrentUser } = useSession();
  const { data: companySettings } = useCompanyQuery();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();

  const shopName = companySettings?.shopName ?? '';
  const licenseNo = companySettings?.mandiLicenseNo ?? '';

  return (
    <header className="sticky top-0 z-40 w-full academic-glass bg-surface/85 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between gap-3 no-print">
      <div className="flex items-center gap-3 min-w-0">
        {onOpenMenu && (
          <button
            type="button"
            onClick={onOpenMenu}
            className="hidden md:inline-flex lg:hidden items-center gap-2 px-3 py-2 rounded-2xl bg-surface-container-low text-on-surface text-xs font-semibold"
            aria-label="Open navigation"
          >
            <Menu className="w-4 h-4" />
            Menu
          </button>
        )}
        <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-tr from-primary to-primary-container text-white flex items-center justify-center font-display font-extrabold text-lg shadow-ambient">
          🧅
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base sm:text-lg font-bold font-display text-on-surface tracking-tight leading-none truncate">
              {shopName}
            </h1>
            <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-container-high text-on-surface-variant">
              APMC Mandi
            </span>
          </div>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5 hidden sm:block">
            License: {licenseNo}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          onClick={() => router.push('/sales/new')}
          className="academic-btn-primary px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold flex items-center gap-2 active:scale-95 shadow-ambient"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">New Sale</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-surface-container-low text-on-surface text-xs font-semibold">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span className="capitalize hidden sm:inline">{currentUser.role.toLowerCase()}</span>
        </div>

        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors"
          >
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt={currentUser.name} className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                {currentUser.name.charAt(0) || 'U'}
              </div>
            )}
            <span className="text-xs font-semibold hidden md:inline">{currentUser.name.split(' ')[0]}</span>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-surface-container-lowest rounded-2xl ambient-shadow-elevated p-2 z-50">
              <div className="px-3 py-2">
                <p className="text-xs font-bold text-on-surface">{currentUser.name}</p>
                <p className="text-[11px] text-on-surface-variant">{currentUser.email}</p>
              </div>
              <div className="my-1 h-[1px] bg-surface-container-low" />
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  router.push('/profile');
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-on-surface hover:bg-surface-container-low rounded-xl flex items-center gap-2"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>My Profile</span>
              </button>
              <button
                onClick={async () => {
                  setUserMenuOpen(false);
                  await logout().catch(() => undefined);
                  localStorage.removeItem(STORAGE_KEYS.currentUser);
                  setCurrentUser({
                    id: '',
                    name: '',
                    username: '',
                    email: '',
                    phone: '',
                    role: 'SALESPERSON',
                    active: false,
                  });
                  router.push('/login');
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-danger hover:bg-danger-container/30 rounded-xl flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
