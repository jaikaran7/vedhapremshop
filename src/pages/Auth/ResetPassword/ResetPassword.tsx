'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { Lock, CheckCircle } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('849201');
  const { toast } = useToast();
  const router = useRouter();
  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        type: 'error',
        title: 'Mismatch',
        message: 'New password and confirmation do not match.'
      });
      return;
    }

    toast({
      type: 'success',
      title: 'Password Updated',
      message: 'Your credentials have been securely updated.'
    });
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface-container-lowest py-8 px-6 sm:px-10 rounded-3xl ambient-shadow">
          <h2 className="text-2xl font-bold font-display text-on-surface">Reset Password</h2>
          <p className="mt-1 text-xs text-on-surface-variant font-medium">
            Set a new secure access key for your Mandi terminal account.
          </p>

          <form onSubmit={handleReset} className="mt-6 space-y-4">
            <Input
              label="Verification Code (OTP)"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />

            <Input
              label="New Password"
              type="password"
              icon={<Lock className="w-4 h-4" />}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              icon={<Lock className="w-4 h-4" />}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" className="w-full">
                Save New Password & Login
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
