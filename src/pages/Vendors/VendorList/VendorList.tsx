'use client';

import { useSession } from '@/store/session/session-provider';
import { useVendorsQuery } from '@/hooks/queries/use-vendors-query';
import { useRouter } from 'next/navigation';
import { can } from '@/auth/permissions';
import React, { useState } from 'react';
import { Vendor } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { VendorFormModal } from '@/pages/Vendors/VendorFormModal/VendorFormModal';
import { 
  Truck, Search, PlusCircle, FileText, ChevronRight, Edit, Phone, MapPin 
} from 'lucide-react';

export const VendorList: React.FC = () => {
  const { currentUser } = useSession();
  const { data: vendors = [] } = useVendorsQuery();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const router = useRouter();
  // Guard: Salesperson cannot view Vendor cost data
  if (!can(currentUser.role, 'viewPurchaseCost')) {
    return (
      <Card variant="lowest" className="p-12 text-center max-w-lg mx-auto">
        <Truck className="w-12 h-12 text-tertiary mx-auto mb-3" />
        <h3 className="text-xl font-bold font-display text-on-surface">Restricted Floor Area</h3>
        <p className="text-xs text-on-surface-variant mt-2">
          Vendor procurement costs and payables are confidential to Owner and Manager roles.
        </p>
        <Button variant="primary" className="mt-4" onClick={() => router.push('/salesperson-home')}>
          Back to Floor Sales
        </Button>
      </Card>
    );
  }

  const filtered = vendors.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.code.toLowerCase().includes(search.toLowerCase()) ||
    v.mandiCity.toLowerCase().includes(search.toLowerCase())
  );

  const totalPayableAll = vendors.reduce((sum, v) => sum + v.payableAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
            Consignment Vendors & Suppliers
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            {vendors.length} active source partners • Total outstanding payable: ₹{totalPayableAll.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<FileText className="w-4 h-4" />}
            onClick={() => router.push('/reports/vendor-purchases')}
          >
            Payables Report
          </Button>
          <Button
            variant="primary"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => {
              setEditingVendor(null);
              setIsModalOpen(true);
            }}
          >
            Add Vendor
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search supplier, code, or origin mandi..."
          icon={<Search className="w-4 h-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Vendor Table */}
      <Card variant="lowest" padding="none" className="overflow-hidden">
        <div className="divide-y divide-surface-container-low">
          {filtered.map(vendor => (
            <div
              key={vendor.id}
              className="p-5 sm:px-6 hover:bg-surface-container-low/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left */}
              <div 
                onClick={() => router.push(`/vendors/${vendor.id}`)}
                className="flex-1 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary font-display">{vendor.code}</span>
                  <h3 className="text-base font-bold font-display text-on-surface">{vendor.name}</h3>
                  <Chip
                    label={vendor.status}
                    size="sm"
                    variant={vendor.status === 'ACTIVE' ? 'success' : 'neutral'}
                  />
                </div>
                <div className="text-xs text-on-surface-variant font-medium mt-1 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-on-surface-variant" /> {vendor.mandiCity}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-on-surface-variant" /> {vendor.phone}
                  </span>
                </div>
              </div>

              {/* Middle Financials */}
              <div className="flex items-center gap-8 text-xs">
                <div>
                  <span className="text-on-surface-variant font-medium block">Total Trade Volume:</span>
                  <span className="text-sm font-extrabold font-display text-on-surface">
                    ₹{vendor.totalPurchases.toLocaleString('en-IN')}
                  </span>
                </div>

                <div>
                  <span className="text-on-surface-variant font-medium block">Payable Balance:</span>
                  <span className="text-sm font-extrabold font-display text-tertiary">
                    ₹{vendor.payableAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<PlusCircle className="w-3.5 h-3.5" />}
                  onClick={() => router.push(`/purchases/new?vendorId=${vendor.id}`)}
                >
                  New Purchase
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/vendors/${vendor.id}`)}
                >
                  History
                </Button>
                <button
                  onClick={() => {
                    setEditingVendor(vendor);
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-on-surface-variant hover:text-on-surface rounded-xl hover:bg-surface-container transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <VendorFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        vendorToEdit={editingVendor}
      />
    </div>
  );
};
