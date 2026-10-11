'use client';

import { useCreateVendorMutation } from '@/hooks/mutations/use-vendor-mutations';
import { useUpdateVendorMutation } from '@/hooks/mutations/use-vendor-mutations';
import React, { useState, useEffect } from 'react';
import { Vendor } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';

interface VendorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorToEdit?: Vendor | null;
}

export const VendorFormModal: React.FC<VendorFormModalProps> = ({
  isOpen,
  onClose,
  vendorToEdit
}) => {
  const addVendorMutation = useCreateVendorMutation();
  const addVendor = (data: Parameters<typeof addVendorMutation.mutate>[0]) => addVendorMutation.mutate(data);
  const updateVendorMutation = useUpdateVendorMutation();
  const updateVendor = (id: string, input: Parameters<typeof updateVendorMutation.mutate>[0]['input']) => updateVendorMutation.mutate({ id, input });
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [mandiCity, setMandiCity] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  useEffect(() => {
    if (vendorToEdit) {
      setName(vendorToEdit.name);
      setPhone(vendorToEdit.phone);
      setEmail(vendorToEdit.email || '');
      setAddress(vendorToEdit.address);
      setMandiCity(vendorToEdit.mandiCity);
      setStatus(vendorToEdit.status);
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setMandiCity('');
      setStatus('ACTIVE');
    }
  }, [vendorToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !mandiCity.trim()) {
      toast({ type: 'error', title: 'Validation', message: 'Name, Phone, and Mandi City are mandatory' });
      return;
    }

    if (vendorToEdit) {
      updateVendor(vendorToEdit.id, {
        name,
        phone,
        email,
        address,
        mandiCity,
        status
      });
      toast({ type: 'success', title: 'Vendor Updated', message: `${name} updated` });
    } else {
      addVendor({
        name,
        phone,
        email,
        address,
        mandiCity,
        status
      });
      toast({ type: 'success', title: 'Vendor Registered', message: `${name} registered for consignments` });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={vendorToEdit ? `Edit Vendor: ${vendorToEdit.code}` : "Add Consignment Vendor / Supplier"}
      subtitle="Register farmer or source mandi trader for onion arrivals"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Supplier / Trader Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Murade Traders"
            required
          />
          <Input
            label="Primary Contact Mobile"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 94XXX XXXXX"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Origin Mandi / City"
            value={mandiCity}
            onChange={(e) => setMandiCity(e.target.value)}
            placeholder="e.g. Lasalgaon (Nashik) / Manchar"
            required
          />
          <Input
            label="Email Address (Optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="procure@vendor.com"
          />
        </div>

        <Input
          label="Mandi Office / Yard Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Yard No., Near Cold Storage, Mandi Road"
          required
        />

        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          options={[
            { value: 'ACTIVE', label: 'Active (Regular Consignments)' },
            { value: 'INACTIVE', label: 'Inactive / Dormant' }
          ]}
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container-low">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {vendorToEdit ? 'Save Changes' : 'Create Vendor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
