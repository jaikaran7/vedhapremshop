'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useUsersQuery } from '@/hooks/queries/use-directory-query';
import { useCreateUserMutation, useUpdateUserMutation } from '@/hooks/mutations/use-settings-mutations';
import { useSession } from '@/store/session/session-provider';
import type { User, UserRole } from '@/types';
import { PlusCircle } from 'lucide-react';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'SALESPERSON', label: 'Salesperson' },
];

export function UsersPanel() {
  const { currentUser } = useSession();
  const owner = currentUser.role === 'OWNER';
  const { data: users = [] } = useUsersQuery();
  const createUser = useCreateUserMutation();
  const updateUser = useUpdateUserMutation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('SALESPERSON');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [active, setActive] = useState(true);

  const startCreate = () => {
    setEditing(null);
    setName('');
    setUsername('');
    setRole('SALESPERSON');
    setEmail('');
    setPhone('');
    setPassword('');
    setActive(true);
    setOpen(true);
  };

  const startEdit = (user: User) => {
    setEditing(user);
    setName(user.name);
    setUsername(user.username);
    setRole(user.role);
    setEmail(user.email);
    setPhone(user.phone);
    setPassword('');
    setActive(user.active);
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editing) {
        await updateUser.mutateAsync({
          id: editing.id,
          input: {
            name: name.trim(),
            role,
            active,
            email: email.trim(),
            phone: phone.trim(),
            ...(password.trim() ? { password: password.trim() } : {}),
          },
        });
        toast({ type: 'success', title: 'User updated', message: `${name} was saved on the server.` });
      } else {
        if (password.trim().length < 8) {
          toast({ type: 'error', title: 'Password too short', message: 'New users need a password of at least 8 characters.' });
          return;
        }
        await createUser.mutateAsync({
          username: username.trim(),
          name: name.trim(),
          role,
          password: password.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        });
        toast({ type: 'success', title: 'User created', message: `${username} can sign in now.` });
      }
      setOpen(false);
    } catch (error) {
      toast({ type: 'error', title: 'Not saved', message: error instanceof Error ? error.message : 'The user could not be saved.' });
    }
  };

  return (
    <Card variant="lowest" padding="none" className="overflow-hidden">
      <div className="p-6 pb-4 bg-surface-container-low/40 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold font-display text-on-surface">Registered Mandi Terminal Operators</h3>
          <p className="text-xs text-on-surface-variant font-medium">Users are stored in the API. Only the owner can add or edit them.</p>
        </div>
        {owner && (
          <Button variant="primary" icon={<PlusCircle className="w-4 h-4" />} onClick={startCreate}>
            Add User
          </Button>
        )}
      </div>

      <div className="divide-y divide-surface-container-low">
        {users.map((user) => (
          <div key={user.id} className="p-4 sm:px-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-surface-container-high text-primary flex items-center justify-center font-bold text-sm">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-on-surface truncate">{user.name}</h4>
                <p className="text-xs text-on-surface-variant truncate">@{user.username} • {user.phone || user.email || 'No contact'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Chip
                label={user.role}
                size="md"
                variant={user.role === 'OWNER' ? 'primary' : user.role === 'MANAGER' ? 'secondary' : 'tertiary'}
              />
              <span className={`text-xs font-semibold ${user.active ? 'text-success' : 'text-danger'}`}>
                {user.active ? 'Active' : 'Inactive'}
              </span>
              {owner && (
                <Button size="sm" variant="secondary" onClick={() => startEdit(user)}>
                  Edit
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit user' : 'Add user'}
        subtitle="Saved to the backend user directory"
        maxWidth="md"
      >
        <form onSubmit={submit} className="space-y-4">
          <Input label="Full name" value={name} onChange={(event) => setName(event.target.value)} required />
          <Input
            label="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={Boolean(editing)}
            required={!editing}
            helperText={editing ? 'Username cannot be changed' : '3-32 letters, digits, . _ -'}
          />
          <div className="w-full flex flex-col space-y-1.5 text-left">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-display">
              Role <span className="text-danger">*</span>
            </span>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRole(option.value)}
                  aria-pressed={role === option.value}
                  className={`py-3 rounded-2xl text-xs font-bold transition-colors ${
                    role === option.value
                      ? 'bg-primary text-white shadow-ambient'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input label="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          <Input
            label={editing ? 'Reset password (optional)' : 'Password'}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required={!editing}
            helperText={editing ? 'Leave blank to keep the current password. Reset signs them out.' : 'At least 8 characters'}
          />
          {editing && (
            <Select
              label="Status"
              value={active ? 'active' : 'inactive'}
              onChange={(event) => setActive(event.target.value === 'active')}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={createUser.isPending || updateUser.isPending}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
