'use client';

import { useCreateCustomerMutation } from '@/hooks/mutations/use-customer-mutations';
import { useUpdateCustomerMutation } from '@/hooks/mutations/use-customer-mutations';
import React, { useState, useEffect } from 'react';
import { Customer, CustomerKind } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumberField } from '@/components/ui/NumberField';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
  onCreated?: (customer: Customer) => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  customerToEdit,
  onCreated,
}) => {
  const addCustomerMutation = useCreateCustomerMutation();
  const updateCustomerMutation = useUpdateCustomerMutation();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [marketLocation, setMarketLocation] = useState('');
  const [creditLimit, setCreditLimit] = useState(200000);
  const [creditDays, setCreditDays] = useState(7);
  const [status, setStatus] = useState<'ACTIVE' | 'BLOCKED' | 'PENDING'>('ACTIVE');
  const [kind, setKind] = useState<CustomerKind>('REGULAR');

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name);
      setPhone(customerToEdit.phone);
      setEmail(customerToEdit.email || '');
      setAddress(customerToEdit.address);
      setMarketLocation(customerToEdit.marketLocation);
      setCreditLimit(customerToEdit.creditLimit);
      setCreditDays(customerToEdit.creditDays);
      setStatus(customerToEdit.status);
      setKind(customerToEdit.kind ?? 'WHOLESALE');
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setMarketLocation('');
      setCreditLimit(0);
      setCreditDays(0);
      setStatus('ACTIVE');
      setKind('REGULAR');
    }
  }, [customerToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ type: 'error', title: 'Name required', message: 'Enter the customer name.' });
      return;
    }

    const regular = !customerToEdit && kind === 'REGULAR';
    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: regular ? '' : email.trim(),
      address: regular ? '' : address.trim(),
      marketLocation: regular ? '' : marketLocation.trim(),
      creditLimit: customerToEdit ? Number(creditLimit) : 0,
      creditDays: customerToEdit ? Number(creditDays) : 0,
      status: customerToEdit ? status : 'ACTIVE' as const,
      kind: customerToEdit ? (customerToEdit.kind ?? 'WHOLESALE') : kind,
    };

    if (customerToEdit) {
      try {
        await updateCustomerMutation.mutateAsync({ id: customerToEdit.id, input: payload });
        toast({ type: 'success', title: 'Customer Updated', message: `${payload.name} updated successfully` });
        onClose();
      } catch (error) {
        toast({ type: 'error', title: 'Customer was not saved', message: error instanceof Error ? error.message : 'Try again.' });
      }
      return;
    }

    try {
      const created = await addCustomerMutation.mutateAsync(payload);
      toast({
        type: 'success',
        title: 'Customer saved',
        message: kind === 'REGULAR' ? `${payload.name} saved as a regular customer` : `${payload.name} saved`,
      });
      onCreated?.(created);
      onClose();
    } catch (error) {
      toast({
        type: 'error',
        title: 'Customer was not saved',
        message: error instanceof Error ? error.message : 'Try again.',
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customerToEdit ? `Edit Customer: ${customerToEdit.code}` : 'Add Customer'}
      subtitle={customerToEdit ? 'Credit terms are set here, from the customer list' : 'Name is required. Mobile and yard can be left blank.'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!customerToEdit && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              aria-pressed={kind === 'REGULAR'}
              onClick={() => setKind('REGULAR')}
              className={`rounded-2xl px-4 py-3 text-left cursor-pointer ${kind === 'REGULAR' ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface'}`}
            >
              <span className="block text-sm font-bold font-display">Regular customer</span>
              <span className={`block text-xs mt-1 ${kind === 'REGULAR' ? 'text-white/80' : 'text-on-surface-variant'}`}>
                Name, and a mobile if you have it
              </span>
            </button>
            <button
              type="button"
              aria-pressed={kind === 'WHOLESALE'}
              onClick={() => setKind('WHOLESALE')}
              className={`rounded-2xl px-4 py-3 text-left cursor-pointer ${kind === 'WHOLESALE' ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface'}`}
            >
              <span className="block text-sm font-bold font-display">Business customer</span>
              <span className={`block text-xs mt-1 ${kind === 'WHOLESALE' ? 'text-white/80' : 'text-on-surface-variant'}`}>
                Firm name. Yard and mobile are optional
              </span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={kind === 'REGULAR' && !customerToEdit ? 'Customer name' : 'Business Name'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind === 'REGULAR' && !customerToEdit ? 'Customer name' : 'e.g. ABC Traders'}
            required
          />
          <Input
            label="Mobile"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Optional"
          />
        </div>

        {(customerToEdit || kind === 'WHOLESALE') && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Market Hub / Yard Location"
                value={marketLocation}
                onChange={(e) => setMarketLocation(e.target.value)}
                placeholder="Optional"
              />
              <Input
                label="Email Address"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <Input
              label="Physical Mandi Shop / Gala Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Optional"
            />
          </>
        )}

        {customerToEdit && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NumberField
              label="Credit Limit (₹)"
              value={creditLimit}
              onValueChange={setCreditLimit}
              prefixText="₹"
            />
            <NumberField
              label="Credit Period"
              allowDecimal={false}
              value={creditDays}
              onValueChange={setCreditDays}
              suffixText="Days"
            />
            <Select
              label="Account Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'BLOCKED' | 'PENDING')}
              options={[
                { value: 'ACTIVE', label: 'Active (Permit Credit)' },
                { value: 'BLOCKED', label: 'Blocked (Over Limit)' },
                { value: 'PENDING', label: 'Pending Verification' },
              ]}
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container-low">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={addCustomerMutation.isPending || updateCustomerMutation.isPending}>
            {customerToEdit ? 'Save Changes' : 'Create Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
