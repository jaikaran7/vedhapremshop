'use client';

import { useSession } from '@/store/session/session-provider';
import { useUsersQuery } from '@/hooks/queries/use-directory-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { homePath } from '@/auth/permissions';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { UserRole } from '@/types';
import { Lock, User as UserIcon, Shield, Check } from 'lucide-react';

export const Login: React.FC = () => {
  const { setCurrentUser } = useSession();
  const { data: users = [] } = useUsersQuery();
  const [username, setUsername] = useState('owner');
  const [password, setPassword] = useState('password123');
  const [selectedRole, setSelectedRole] = useState<UserRole>('OWNER');
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = users.find(u => u.username === username || u.role === selectedRole);
    if (matched) {
      setCurrentUser(matched);
      toast({
        type: 'success',
        title: `Welcome, ${matched.name}`,
        message: `Logged in as ${matched.role}`
      });
      router.push(homePath(matched.role));
    } else {
      toast({
        type: 'error',
        title: 'Authentication Failed',
        message: 'Invalid username or password'
      });
    }
  };

  const selectPersona = (role: UserRole) => {
    setSelectedRole(role);
    const u = users.find(user => user.role === role);
    if (u) {
      setUsername(u.username);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-primary to-primary-container text-white flex items-center justify-center font-display font-extrabold text-3xl mx-auto shadow-ambient-elevated">
          🧅
        </div>
        <h2 className="mt-6 text-3xl font-extrabold font-display text-on-surface tracking-tight">
          Vedhaprem Mandi
        </h2>
        <p className="mt-1 text-sm text-on-surface-variant font-medium">
          Wholesale Onion Trading & Floor Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface-container-lowest py-8 px-6 sm:px-10 rounded-3xl ambient-shadow">
          {/* Quick Persona Selector */}
          <div className="mb-6">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-display block mb-2">
              Select Demo Role Persona:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['OWNER', 'MANAGER', 'SALESPERSON'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => selectPersona(r)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold text-center transition-all ${
                    selectedRole === r
                      ? 'bg-primary text-white shadow-ambient'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {r === 'OWNER' && 'Owner'}
                  {r === 'MANAGER' && 'Manager'}
                  {r === 'SALESPERSON' && 'Salesperson'}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Username"
              icon={<UserIcon className="w-4 h-4" />}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              icon={<Lock className="w-4 h-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center text-on-surface-variant font-medium cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-primary mr-2" />
                Remember this terminal
              </label>
              <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" size="lg" className="w-full">
                Enter Mandi Terminal
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-surface-container-low text-center">
            <p className="text-xs text-on-surface-variant">
              Role permissions strictly enforced. Salesperson interface is protected from vendor costs and margins.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
