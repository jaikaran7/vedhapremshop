'use client';

import { useCreateCustomerMutation } from '@/hooks/mutations/use-customer-mutations';
import { useUpdateCustomerMutation } from '@/hooks/mutations/use-customer-mutations';
import React, { useState, useEffect } from 'react';
import { Customer } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  customerToEdit
}) => {
  const addCustomerMutation = useCreateCustomerMutation();
  const addCustomer = (data: Parameters<typeof addCustomerMutation.mutate>[0]) => addCustomerMutation.mutate(data);
  const updateCustomerMutation = useUpdateCustomerMutation();
  const updateCustomer = (id: string, input: Parameters<typeof updateCustomerMutation.mutate>[0]['input']) => updateCustomerMutation.mutate({ id, input });
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [marketLocation, setMarketLocation] = useState('');
  const [creditLimit, setCreditLimit] = useState(200000);
  const [creditDays, setCreditDays] = useState(7);
  const [status, setStatus] = useState<'ACTIVE' | 'BLOCKED' | 'PENDING'>('ACTIVE');

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
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setMarketLocation('');
      setCreditLimit(200000);
      setCreditDays(7);
      setStatus('ACTIVE');
    }
  }, [customerToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast({ type: 'error', title: 'Validation', message: 'Name and Phone are mandatory' });
      return;
    }

    if (customerToEdit) {
      updateCustomer(customerToEdit.id, {
        name,
        phone,
        email,
        address,
        marketLocation,
        creditLimit: Number(creditLimit),
        creditDays: Number(creditDays),
        status
      });
      toast({ type: 'success', title: 'Customer Updated', message: `${name} updated successfully` });
    } else {
      addCustomer({
        name,
        phone,
        email,
        address,
        marketLocation,
        creditLimit: Number(creditLimit),
        creditDays: Number(creditDays),
        status
      });
      toast({ type: 'success', title: 'Customer Created', message: `${name} registered for wholesale credit` });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customerToEdit ? `Edit Customer: ${customerToEdit.code}` : "Add Wholesale Customer"}
      subtitle="Register merchant party for onion auction billing and credit ledger"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Trading Party / Firm Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. ABC Traders"
            required
          />
          <Input
            label="Primary Contact Mobile"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98XXX XXXXX"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Market Hub / Yard Location"
            value={marketLocation}
            onChange={(e) => setMarketLocation(e.target.value)}
            placeholder="e.g. Shivaji Market, Camp, Pune"
            required
          />
          <Input
            label="Email Address (Optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="accounts@firm.com"
          />
        </div>

        <Input
          label="Physical Mandi Shop / Gala Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Shop / Gala No., Market Yard Road"
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Credit Limit (₹)"
            type="number"
            value={creditLimit}
            onChange={(e) => setCreditLimit(Number(e.target.value))}
            prefixText="₹"
            required
          />
          <Input
            label="Credit Period"
            type="number"
            value={creditDays}
            onChange={(e) => setCreditDays(Number(e.target.value))}
            suffixText="Days"
            required
          />
          <Select
            label="Account Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            options={[
              { value: 'ACTIVE', label: 'Active (Permit Credit)' },
              { value: 'BLOCKED', label: 'Blocked (Over Limit)' },
              { value: 'PENDING', label: 'Pending Verification' },
            ]}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container-low">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {customerToEdit ? 'Save Changes' : 'Create Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
