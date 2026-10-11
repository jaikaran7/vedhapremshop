'use client';

import { useSalesQuery } from '@/hooks/queries/use-sales-query';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { 
  ShoppingCart, PlusCircle, Search, Printer, 
  ChevronRight, Calendar, Scale, ArrowRight 
} from 'lucide-react';

export const SalesList: React.FC = () => {
  const { data: sales = [] } = useSalesQuery();
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'CREDIT' | 'CASH' | 'UPI'>('ALL');
  const router = useRouter();
  const filtered = sales.filter(s => {
    const matchSearch = s.billNumber.toLowerCase().includes(search.toLowerCase()) ||
                        s.customerName.toLowerCase().includes(search.toLowerCase());
    const matchPay = paymentFilter === 'ALL' || s.paymentType === paymentFilter;
    return matchSearch && matchPay;
  });

  const totalAmount = filtered.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalBags = filtered.reduce((acc, s) => acc + s.totalBags, 0);
  const totalKg = filtered.reduce((acc, s) => acc + s.totalWeightKg, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
            Sales & Weighment Invoices
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            {sales.length} bills generated • Total volume: {totalBags} bags ({totalKg.toLocaleString('en-IN')} KG) • ₹{totalAmount.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<Scale className="w-4 h-4" />}
            onClick={() => router.push('/sales/todays')}
          >
            Today's Dispatch
          </Button>
          <Button
            variant="primary"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => router.push('/sales/new')}
          >
            New Sale
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search bill number (e.g. VPN-INV-1081) or customer name..."
            icon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            className="academic-input py-3 px-4 text-xs font-semibold rounded-2xl w-full sm:w-auto cursor-pointer"
          >
            <option value="ALL">All Payment Types</option>
            <option value="CREDIT">Credit Bills (Khata)</option>
            <option value="CASH">Spot Cash</option>
            <option value="UPI">UPI Direct</option>
          </select>
        </div>
      </div>

      {/* Sales List Table */}
      <Card variant="lowest" padding="none" className="overflow-hidden">
        <div className="divide-y divide-surface-container-low">
          {filtered.map(sale => (
            <div
              key={sale.id}
              className="p-5 sm:px-6 hover:bg-surface-container-low/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Info */}
              <div 
                onClick={() => router.push(`/sales/${sale.id}`)}
                className="flex-1 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary font-display">{sale.billNumber}</span>
                  <span className="text-xs text-on-surface-variant">• {sale.date} at {sale.time}</span>
                  <Chip
                    label={sale.paymentType}
                    size="sm"
                    variant={sale.paymentType === 'CASH' ? 'success' : 'tertiary'}
                  />
                  <Chip
                    label={sale.status}
                    size="sm"
                    variant={sale.status === 'CONFIRMED' ? 'neutral' : 'tertiary'}
                  />
                </div>
                <h3 className="text-base font-bold font-display text-on-surface mt-1">{sale.customerName}</h3>
                <div className="text-xs text-on-surface-variant font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{sale.totalBags} bags</span>
                  <span>•</span>
                  <span>{sale.totalWeightKg} KG</span>
                  <span>•</span>
                  <span>{sale.items.map(i => `${i.markCode}: ${i.bags}b`).join(', ')}</span>
                  <span>•</span>
                  <span>Billed by {sale.createdByName}</span>
                </div>
              </div>

              {/* Right Amounts & CTAs */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold">Total Bill</span>
                  <div className="text-base font-extrabold font-display text-on-surface">
                    ₹{sale.totalAmount.toLocaleString('en-IN')}
                  </div>
                  {sale.balanceDue > 0 && (
                    <span className="text-[10px] text-danger font-semibold">Due: ₹{sale.balanceDue.toLocaleString('en-IN')}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Printer className="w-3.5 h-3.5" />}
                    onClick={() => router.push(`/sales/${sale.id}/bill`)}
                    title="Print Bill"
                  >
                    Bill
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/sales/${sale.id}`)}
                  >
                    <ChevronRight className="w-4 h-4 text-on-surface-variant" />
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
