'use client';

import { useSession } from '@/store/session/session-provider';
import { login } from '@/api/auth.api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { homePath } from '@/auth/permissions';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { Lock, User as UserIcon } from 'lucide-react';

export const Login: React.FC = () => {
  const { setCurrentUser } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    try {
      const user = await login(username.trim(), password);
      const nextPath = homePath(user?.role);
      setCurrentUser(user);
      toast({ type: 'success', title: `Welcome, ${user.name}`, message: `Logged in as ${user.role}` });
      router.push(nextPath);
    } catch (error) {
      toast({ type: 'error', title: 'Authentication Failed', message: error instanceof Error ? error.message : 'Try again.' });
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-dvh bg-surface flex flex-col justify-start overflow-y-auto px-4 pb-24 pt-4 sm:justify-center sm:px-6 sm:pb-12 sm:pt-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-primary-container text-white flex items-center justify-center font-display font-extrabold text-2xl mx-auto shadow-ambient-elevated">
          🧅
        </div>
        <h2 className="mt-3 text-2xl font-extrabold font-display text-on-surface tracking-tight">
          Vedhaprem Mandi
        </h2>
        <p className="mt-1 text-sm text-on-surface-variant font-medium">
          Wholesale Onion Trading & Floor Management System
        </p>
      </div>

      <div className="mt-4 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface-container-lowest py-5 px-6 sm:py-8 sm:px-10 rounded-3xl ambient-shadow">
          <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
            <Input
              label="Username"
              name="username"
              autoComplete="username"
              icon={<UserIcon className="w-4 h-4" />}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              icon={<Lock className="w-4 h-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex items-center justify-end text-xs pt-1">
              <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-surface-container bg-surface-container-lowest p-4 sm:static sm:inset-auto sm:z-auto sm:mt-2 sm:border-0 sm:bg-transparent sm:p-0">
              <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={signingIn}>
                Enter Mandi Terminal
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
