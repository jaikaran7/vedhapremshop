'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCompanyQuery } from '@/hooks/queries/use-directory-query';
import { useSession } from '@/store/session/session-provider';
import { UserRole } from '@/types';
import {
  Shield, User as UserIcon, PlusCircle, Check,
  ChevronDown, LogOut
} from 'lucide-react';

export const Header: React.FC = () => {
  const { currentUser, switchRole } = useSession();
  const { data: companySettings } = useCompanyQuery();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();

  const shopName = companySettings?.shopName ?? '';
  const licenseNo = companySettings?.mandiLicenseNo ?? '';

  const roles: { role: UserRole; label: string; desc: string }[] = [
    { role: 'OWNER', label: 'Owner Persona', desc: 'Full financial & operational control' },
    { role: 'MANAGER', label: 'Manager Persona', desc: 'Purchases, stock, and yard operations' },
    { role: 'SALESPERSON', label: 'Salesperson Persona', desc: 'Fast weighment, sales & bills' }
  ];

  return (
    <header className="sticky top-0 z-40 w-full academic-glass bg-surface/85 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between gap-3 no-print">
      <div className="flex items-center gap-3 min-w-0">
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

        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors text-xs font-semibold"
          >
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="capitalize hidden sm:inline">{currentUser.role.toLowerCase()}</span>
            <ChevronDown className="w-3 h-3 text-on-surface-variant" />
          </button>

          {roleMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-surface-container-lowest rounded-2xl ambient-shadow-elevated p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant border-b border-surface-container-low">
                Switch Role Persona
              </div>
              <div className="mt-1 space-y-1">
                {roles.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => {
                      switchRole(r.role);
                      setRoleMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-start justify-between transition-colors ${
                      currentUser.role === r.role ? 'bg-primary-fixed text-primary-on-fixed font-bold' : 'hover:bg-surface-container-low text-on-surface'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{r.label}</div>
                      <div className="text-[10px] opacity-80 mt-0.5">{r.desc}</div>
                    </div>
                    {currentUser.role === r.role && <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
                  </button>
                ))}
              </div>
            </div>
          )}
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
                {currentUser.name.charAt(0)}
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
                onClick={() => {
                  setUserMenuOpen(false);
                  router.push('/login');
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-danger hover:bg-danger-container/30 rounded-xl flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Switch / Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
