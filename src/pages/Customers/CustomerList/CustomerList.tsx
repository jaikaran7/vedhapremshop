'use client';

import { useCustomersQuery } from '@/hooks/queries/use-customers-query';
import { useDeleteCustomerMutation } from '@/hooks/mutations/use-customer-mutations';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { Customer } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { CustomerFormModal } from '@/pages/Customers/CustomerFormModal/CustomerFormModal';
import { 
  Users, Search, PlusCircle, ArrowDownLeft, FileText, 
  ChevronRight, ArrowUpDown, Filter, Edit, Trash2, Phone 
} from 'lucide-react';

export const CustomerList: React.FC = () => {
  const { data: customers = [] } = useCustomersQuery();
  const deleteCustomerMutation = useDeleteCustomerMutation();
  const deleteCustomer = (id: string) => deleteCustomerMutation.mutate(id);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BLOCKED'>('ALL');
  const [sortBy, setSortBy] = useState<'OUTSTANDING_DESC' | 'NAME_ASC' | 'CREDIT_DAYS'>('OUTSTANDING_DESC');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const router = useRouter();
  // Filter & Sort
  const filtered = customers
    .filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                          c.code.toLowerCase().includes(search.toLowerCase()) ||
                          c.marketLocation.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'OUTSTANDING_DESC') return b.outstandingAmount - a.outstandingAmount;
      if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name);
      if (sortBy === 'CREDIT_DAYS') return b.creditDays - a.creditDays;
      return 0;
    });

  const totalOutstandingAll = customers.reduce((sum, c) => sum + c.outstandingAmount, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
            Customers
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            {customers.length} customers • Total outstanding: ₹{totalOutstandingAll.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<FileText className="w-4 h-4" />}
            onClick={() => router.push('/reports/outstanding')}
          >
            Outstanding
          </Button>
          <Button
            variant="primary"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => {
              setEditingCustomer(null);
              setIsModalOpen(true);
            }}
          >
            Add Customer
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search party name, customer code, or market location..."
            icon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="academic-input py-3 px-4 text-xs font-semibold rounded-2xl w-full sm:w-auto cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="BLOCKED">Blocked Only</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="academic-input py-3 px-4 text-xs font-semibold rounded-2xl w-full sm:w-auto cursor-pointer"
          >
            <option value="OUTSTANDING_DESC">Highest Outstanding</option>
            <option value="NAME_ASC">Name (A-Z)</option>
            <option value="CREDIT_DAYS">Credit Period</option>
          </select>
        </div>
      </div>

      {/* Table / Card List: No-Line alternating clean surface */}
      <Card variant="lowest" padding="none" className="overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-on-surface-variant/40 mx-auto mb-3" />
            <h4 className="text-base font-bold font-display text-on-surface">No customers matched your filter</h4>
            <p className="text-xs text-on-surface-variant mt-1">Try clearing your search or add a new merchant party.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-container-low">
            {filtered.map(cust => {
              const limitUsedPercent = Math.min(100, (cust.outstandingAmount / (cust.creditLimit || 1)) * 100);
              const isOverLimit = cust.outstandingAmount > cust.creditLimit;

              return (
                <div
                  key={cust.id}
                  className="p-5 sm:px-6 hover:bg-surface-container-low/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Code, Name, Location */}
                  <div 
                    onClick={() => router.push(`/customers/${cust.id}`)}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary font-display">{cust.code}</span>
                      <h3 className="text-base font-bold font-display text-on-surface">{cust.name}</h3>
                      {cust.kind === 'REGULAR' && <Chip label="Regular" size="sm" variant="neutral" />}
                      <Chip
                        label={cust.status}
                        size="sm"
                        variant={cust.status === 'ACTIVE' ? 'success' : 'danger'}
                      />
                    </div>
                    <div className="text-xs text-on-surface-variant font-medium mt-1 flex items-center gap-3 flex-wrap">
                      {cust.marketLocation && <span>{cust.marketLocation}</span>}
                      {cust.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-on-surface-variant" /> {cust.phone}
                        </span>
                      )}
                      {cust.kind !== 'REGULAR' && <span>Terms: <strong>{cust.creditDays} Days</strong></span>}
                    </div>
                  </div>

                  {/* Middle: Outstanding & Credit Bar */}
                  <div className="w-full md:w-56 shrink-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-on-surface-variant font-medium">Outstanding:</span>
                      <span className={`font-extrabold font-display ${isOverLimit ? 'text-danger' : 'text-on-surface'}`}>
                        ₹{cust.outstandingAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="academic-progress-track mt-1.5">
                      <div
                        className={`h-full rounded-full transition-all ${isOverLimit ? 'bg-danger' : 'bg-primary'}`}
                        style={{ width: `${limitUsedPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-on-surface-variant mt-1">
                      <span>Limit: ₹{cust.creditLimit.toLocaleString('en-IN')}</span>
                      <span>{limitUsedPercent.toFixed(0)}% used</span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<ArrowDownLeft className="w-3.5 h-3.5 text-success" />}
                      onClick={() => router.push(`/payments/new?customerId=${cust.id}`)}
                      title="Collect Payment"
                    >
                      Pay
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<PlusCircle className="w-3.5 h-3.5" />}
                      onClick={() => router.push(`/sales/new?customerId=${cust.id}`)}
                    >
                      Sale
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/customers/${cust.id}`)}
                    >
                      Ledger
                    </Button>
                    <button
                      onClick={() => {
                        setEditingCustomer(cust);
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-on-surface-variant hover:text-on-surface rounded-xl hover:bg-surface-container transition-colors"
                      title="Edit Customer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customerToEdit={editingCustomer}
      />
    </div>
  );
};
