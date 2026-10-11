'use client';


import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { Lock, ShieldCheck } from 'lucide-react';

export const ChangePasswordModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      toast({ type: 'error', title: 'Mismatch', message: 'Passwords do not match' });
      return;
    }
    toast({ type: 'success', title: 'Security Updated', message: 'Password successfully changed' });
    onClose();
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
            <p className="text-xs text-on-surface-variant font-medium">Update account security credentials</p>
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
            <Button type="submit" variant="primary">
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
