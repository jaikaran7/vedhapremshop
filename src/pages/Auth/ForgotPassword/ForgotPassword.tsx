'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { Mail, ArrowLeft } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast({
      type: 'success',
      title: 'Reset Link Dispatched',
      message: `Recovery instructions sent to ${email}`
    });
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface-container-lowest py-8 px-6 sm:px-10 rounded-3xl ambient-shadow">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary mb-6 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
          </Link>

          <h2 className="text-2xl font-bold font-display text-on-surface">Forgot Password</h2>
          <p className="mt-1 text-xs text-on-surface-variant font-medium">
            Enter your registered Mandi portal email address to receive an OTP or password reset token.
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Input
                label="Registered Email"
                type="email"
                icon={<Mail className="w-4 h-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. vedhaprem@mandi-onion.com"
                required
              />

              <Button type="submit" variant="primary" className="w-full">
                Send Reset Link
              </Button>
            </form>
          ) : (
            <div className="mt-6 p-4 rounded-2xl bg-success-container/40 space-y-3">
              <p className="text-xs font-semibold text-success">
                Instructions have been sent. For demo convenience, you can jump straight to password reset.
              </p>
              <Button 
                variant="primary" 
                size="sm" 
                className="w-full"
                onClick={() => router.push('/reset-password')}
              >
                Proceed to Reset Password
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
