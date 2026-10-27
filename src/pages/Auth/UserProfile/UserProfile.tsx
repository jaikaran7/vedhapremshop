'use client';

import { useSession } from '@/store/session/session-provider';
import { useCompanyQuery } from '@/hooks/queries/use-directory-query';
import { useUpdateUserMutation } from '@/hooks/mutations/use-settings-mutations';
import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/ui/Toast';
import { ChangePasswordModal } from '@/pages/Auth/ChangePassword/ChangePassword';
import { User, Mail, Phone, Shield, KeyRound, Building, Calendar } from 'lucide-react';

export const UserProfile: React.FC = () => {
  const { currentUser, setCurrentUser } = useSession();
  const { data: companySettings } = useCompanyQuery();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const updateUser = useUpdateUserMutation();
  const { toast } = useToast();
  const canEditProfile = currentUser.role === 'OWNER';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = await updateUser.mutateAsync({
        id: currentUser.id,
        input: { name: name.trim(), email: email.trim(), phone: phone.trim() },
      });
      setCurrentUser(saved);
      setIsEditing(false);
      toast({
        type: 'success',
        title: 'Profile Saved',
        message: 'Your details were updated on the server.',
      });
    } catch (error) {
      toast({
        type: 'error',
        title: 'Not saved',
        message: error instanceof Error ? error.message : 'The profile could not be updated.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">User Profile</h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Manage your account credentials, security preferences, and Mandi terminal permissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<KeyRound className="w-4 h-4" />}
            onClick={() => setShowPasswordModal(true)}
          >
            Change Password
          </Button>
          {canEditProfile ? (
            isEditing ? (
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setIsEditing(true)}>
                Edit Details
              </Button>
            )
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card variant="lowest" className="lg:col-span-1 flex flex-col items-center text-center p-8">
          <div className="relative">
            {currentUser.avatar ? (
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-28 h-28 rounded-full object-cover shadow-ambient-elevated border-4 border-surface-container-low" 
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-extrabold text-3xl">
                {currentUser.name.charAt(0)}
              </div>
            )}
            <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-success ring-4 ring-surface-container-lowest" />
          </div>

          <h3 className="mt-4 text-xl font-bold font-display text-on-surface">{currentUser.name}</h3>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5">@{currentUser.username}</p>

          <div className="mt-3">
            <Chip 
              label={`${currentUser.role} ACCESS`} 
              variant={currentUser.role === 'OWNER' ? 'primary' : currentUser.role === 'MANAGER' ? 'secondary' : 'tertiary'}
            />
          </div>

          <div className="mt-6 w-full pt-6 border-t border-surface-container-low text-left space-y-3 text-xs">
            <div className="flex items-center gap-3 text-on-surface">
              <Mail className="w-4 h-4 text-on-surface-variant" />
              <span>{currentUser.email}</span>
            </div>
            <div className="flex items-center gap-3 text-on-surface">
              <Phone className="w-4 h-4 text-on-surface-variant" />
              <span>{currentUser.phone}</span>
            </div>
            <div className="flex items-center gap-3 text-on-surface">
              <Building className="w-4 h-4 text-on-surface-variant" />
              <span>{companySettings.shopName}</span>
            </div>
            <div className="flex items-center gap-3 text-on-surface">
              <Calendar className="w-4 h-4 text-on-surface-variant" />
              <span>Active Season: 2026-2027</span>
            </div>
          </div>
        </Card>

        {/* Profile Settings Form */}
        <Card variant="lowest" className="lg:col-span-2">
          <h3 className="text-lg font-bold font-display text-on-surface mb-1">Account Information</h3>
          <p className="text-xs text-on-surface-variant font-medium mb-6">
            Ensure your mobile number is up to date for automated WhatsApp bill notifications.
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing}
                required
              />
              <Input
                label="Username / Mandi ID"
                value={currentUser.username}
                disabled
                helperText="Mandi ID cannot be changed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Official Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditing}
                required
              />
              <Input
                label="Mobile Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!isEditing}
                required
              />
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low">
              <div className="flex items-center gap-2 text-xs font-bold text-on-surface font-display mb-1">
                <Shield className="w-4 h-4 text-primary" />
                <span>Security & Role Privileges</span>
              </div>
              <p className="text-xs text-on-surface-variant">
                You are operating with <strong>{currentUser.role}</strong> permissions. 
                {currentUser.role === 'SALESPERSON' 
                  ? ' Wholesale purchase rates, vendor costs, and margins are hidden in accordance with Mandi security policy.' 
                  : ' You hold full administrative authority over inventory, purchase entries, and credit limits.'}
              </p>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={updateUser.isPending}>
                  Save Changes
                </Button>
              </div>
            )}
          </form>
        </Card>
      </div>

      <ChangePasswordModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)} 
      />
    </div>
  );
};
