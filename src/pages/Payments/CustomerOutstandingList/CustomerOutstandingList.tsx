'use client';

import { useCustomersQuery } from '@/hooks/queries/use-customers-query';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { 
  Users, Search, ArrowDownLeft, FileText, ChevronRight, Phone 
} from 'lucide-react';

export const CustomerOutstandingList: React.FC = () => {
  const { data: customers = [] } = useCustomersQuery();
  const [search, setSearch] = useState('');
  const router = useRouter();
  const filtered = customers
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.outstandingAmount - a.outstandingAmount);

  const totalOutstanding = customers.reduce((sum, c) => sum + c.outstandingAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
            Customer Balances
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Total receivables: ₹{totalOutstanding.toLocaleString('en-IN')} from {customers.length} customers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => router.push('/reports/outstanding')}
          >
            Outstanding Report
          </Button>
          <Button
            variant="primary"
            icon={<ArrowDownLeft className="w-4 h-4 text-success" />}
            onClick={() => router.push('/payments/new')}
          >
            Collect Payment
          </Button>
        </div>
      </div>

      <div className="max-w-md">
        <Input
          placeholder="Search customer name or code..."
          icon={<Search className="w-4 h-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card variant="lowest" padding="none" className="overflow-hidden">
        <div className="divide-y divide-surface-container-low">
          {filtered.map(cust => (
            <div
              key={cust.id}
              className="p-5 sm:px-6 hover:bg-surface-container-low/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div 
                onClick={() => router.push(`/customers/${cust.id}`)}
                className="flex-1 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary font-display">{cust.code}</span>
                  <h3 className="text-base font-bold font-display text-on-surface">{cust.name}</h3>
                  <Chip
                    label={`${cust.creditDays}d terms`}
                    size="sm"
                    variant="secondary"
                  />
                </div>
                <div className="text-xs text-on-surface-variant font-medium mt-1 flex items-center gap-2">
                  <span>{cust.marketLocation}</span>
                  <span>•</span>
                  <span>{cust.phone}</span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold">Amount Due</span>
                  <div className="text-base font-extrabold font-display text-tertiary">
                    ₹{cust.outstandingAmount.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-on-surface-variant">Limit: ₹{cust.creditLimit.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<ArrowDownLeft className="w-3.5 h-3.5 text-success" />}
                    onClick={() => router.push(`/payments/new?customerId=${cust.id}`)}
                  >
                    Receive Pay
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/customers/${cust.id}`)}
                  >
                    Statement →
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
