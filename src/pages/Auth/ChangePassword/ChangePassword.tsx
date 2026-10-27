'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useChangePasswordMutation } from '@/hooks/mutations/use-settings-mutations';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

export const ChangePasswordModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const changePassword = useChangePasswordMutation();
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      toast({ type: 'error', title: 'Mismatch', message: 'Passwords do not match' });
      return;
    }
    if (next.trim().length < 8) {
      toast({ type: 'error', title: 'Password too short', message: 'Use at least 8 characters.' });
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword: current, newPassword: next });
      toast({ type: 'success', title: 'Password updated', message: 'Use the new password the next time you sign in.' });
      setCurrent('');
      setNext('');
      setConfirm('');
      onClose();
    } catch (error) {
      toast({ type: 'error', title: 'Not updated', message: error instanceof Error ? error.message : 'The password could not be changed.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/30 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 max-w-md w-full ambient-shadow-elevated">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-2xl bg-primary-fixed text-primary">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-display text-on-surface">Change Password</h3>
            <p className="text-xs text-on-surface-variant font-medium">Updates the password on the backend</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
          <Input
            label="New Password"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={changePassword.isPending}>
              Update Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ChangePasswordPage: React.FC = () => {
  const router = useRouter();
  return <ChangePasswordModal isOpen onClose={() => router.push('/profile')} />;
};
