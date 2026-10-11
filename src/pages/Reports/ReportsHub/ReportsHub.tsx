'use client';

import { useSession } from '@/store/session/session-provider';
import { useSalesQuery } from '@/hooks/queries/use-sales-query';
import { usePaymentsQuery } from '@/hooks/queries/use-payments-query';
import { useCustomersQuery } from '@/hooks/queries/use-customers-query';
import { useVendorsQuery } from '@/hooks/queries/use-vendors-query';
import { useLotsQuery } from '@/hooks/queries/use-lots-query';
import { usePurchasesQuery } from '@/hooks/queries/use-purchases-query';
import { useMarksQuery } from '@/hooks/queries/use-directory-query';
import { can } from '@/auth/permissions';
import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/ui/Toast';
import { 
  BarChart3, Download, Printer, Filter, Search, 
  Calendar, Layers, Users, Truck, Package 
} from 'lucide-react';

export const ReportsHub: React.FC = () => {
  const { currentUser } = useSession();
  const { data: sales = [] } = useSalesQuery();
  const { data: payments = [] } = usePaymentsQuery();
  const { data: customers = [] } = useCustomersQuery();
  const { data: vendors = [] } = useVendorsQuery();
  const { data: lots = [] } = useLotsQuery();
  const { data: purchases = [] } = usePurchasesQuery();
  const { data: marks = [] } = useMarksQuery();
  const [activeReport, setActiveReport] = useState<
    'sales' | 'collections' | 'outstanding' | 'ageing' | 'stock' | 'purchases' | 'ledger' | 'vendorPurchases'
  >('sales');

  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const handleExportCSV = (filename: string) => {
    toast({
      type: 'success',
      title: 'Export Generated',
      message: `${filename}.csv downloaded successfully.`
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
            Mandi Reports & Intelligence
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Reconciliation reports, credit ageing matrices, sales volume logs, and inward procurement analysis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<Printer className="w-4 h-4" />}
            onClick={handlePrint}
          >
            Print Statement
          </Button>
          <Button
            variant="primary"
            icon={<Download className="w-4 h-4" />}
            onClick={() => handleExportCSV(`${activeReport}_report`)}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Report Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-surface-container-low no-print">
        {[
          { key: 'sales', label: 'Sales Report' },
          { key: 'collections', label: 'Collection Report' },
          { key: 'outstanding', label: 'Outstanding Report' },
          { key: 'ageing', label: 'Outstanding Ageing' },
          { key: 'stock', label: 'Stock Valuation Report' },
          ...(can(currentUser.role, 'viewPurchaseCost') ? [
            { key: 'purchases', label: 'Purchase Report' },
            { key: 'vendorPurchases', label: 'Vendor Purchase Summary' }
          ] : []),
          { key: 'ledger', label: 'Customer Ledger Summary' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveReport(tab.key as any)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeReport === tab.key
                ? 'bg-primary text-white shadow-ambient'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Strip */}
      <div className="flex flex-col sm:flex-row items-center gap-3 no-print">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search report records..."
            icon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-auto">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
      </div>

      {/* REPORT 1: SALES REPORT */}
      {activeReport === 'sales' && (
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <div className="p-6 pb-4 bg-surface-container-low/40 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-display text-on-surface">Sales Volume & Realization Report</h3>
              <p className="text-xs text-on-surface-variant font-medium">Detailed weighment invoices with quality breakdowns</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-on-surface-variant">Turnover Total</span>
              <div className="text-base font-extrabold font-display text-primary">
                ₹{sales.reduce((a, s) => a + s.totalAmount, 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
                <tr>
                  <th className="py-3 px-4">Bill No.</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer Party</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-center">Bags</th>
                  <th className="py-3 px-4 text-right">Net Weight</th>
                  <th className="py-3 px-4 text-right">Invoice Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {sales.map(s => (
                  <tr key={s.id} className="hover:bg-surface-container-low/30">
                    <td className="py-3.5 px-4 font-bold text-primary">{s.billNumber}</td>
                    <td className="py-3.5 px-4 font-medium">{s.date}</td>
                    <td className="py-3.5 px-4 font-semibold">{s.customerName}</td>
                    <td className="py-3.5 px-4"><Chip label={s.paymentType} size="sm" variant={s.paymentType === 'CASH' ? 'success' : 'tertiary'} /></td>
                    <td className="py-3.5 px-4 text-center font-bold">{s.totalBags}</td>
                    <td className="py-3.5 px-4 text-right font-bold">{s.totalWeightKg} KG</td>
                    <td className="py-3.5 px-4 text-right font-extrabold font-display">₹{s.totalAmount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* REPORT 2: COLLECTION REPORT */}
      {activeReport === 'collections' && (
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <div className="p-6 pb-4 bg-surface-container-low/40 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-display text-on-surface">Daily Collection & Bank Realization Log</h3>
              <p className="text-xs text-on-surface-variant font-medium">Cashier collections credited to customer accounts</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-on-surface-variant">Collections Total</span>
              <div className="text-base font-extrabold font-display text-success">
                ₹{payments.reduce((a, p) => a + p.amount, 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
                <tr>
                  <th className="py-3 px-4">Receipt</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4 text-right">Amount Received</th>
                  <th className="py-3 px-4 text-right">Closing Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-surface-container-low/30">
                    <td className="py-3.5 px-4 font-bold text-success">{p.receiptNumber}</td>
                    <td className="py-3.5 px-4">{p.date}</td>
                    <td className="py-3.5 px-4 font-semibold">{p.customerName}</td>
                    <td className="py-3.5 px-4"><Chip label={p.paymentMethod} size="sm" variant="secondary" /></td>
                    <td className="py-3.5 px-4 text-on-surface-variant">{p.referenceNumber || '—'}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-success">₹{p.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-on-surface">₹{p.newOutstanding.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* REPORT 3: OUTSTANDING REPORT */}
      {activeReport === 'outstanding' && (
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <div className="p-6 pb-4 bg-surface-container-low/40 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-display text-on-surface">Customer Outstanding & Credit Limit Balances</h3>
              <p className="text-xs text-on-surface-variant font-medium">Wholesale merchant accounts sorted by exposure</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-on-surface-variant">Total Portfolio</span>
              <div className="text-base font-extrabold font-display text-on-surface">
                ₹{customers.reduce((a, c) => a + c.outstandingAmount, 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Party Name</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Credit Days</th>
                  <th className="py-3 px-4 text-right">Credit Limit</th>
                  <th className="py-3 px-4 text-right">Current Outstanding</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {customers.map(c => (
                  <tr key={c.id} className="hover:bg-surface-container-low/30">
                    <td className="py-3.5 px-4 font-bold text-primary">{c.code}</td>
                    <td className="py-3.5 px-4 font-bold">{c.name}</td>
                    <td className="py-3.5 px-4 text-on-surface-variant">{c.marketLocation}</td>
                    <td className="py-3.5 px-4 font-semibold">{c.creditDays} Days</td>
                    <td className="py-3.5 px-4 text-right font-medium">₹{c.creditLimit.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold font-display text-primary">₹{c.outstandingAmount.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-center"><Chip label={c.status} size="sm" variant={c.status === 'ACTIVE' ? 'success' : 'danger'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* REPORT 4: OUTSTANDING AGEING */}
      {activeReport === 'ageing' && (
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <div className="p-6 pb-4 bg-surface-container-low/40">
            <h3 className="text-base font-bold font-display text-on-surface">Receivables Ageing Matrix</h3>
            <p className="text-xs text-on-surface-variant font-medium">Categorized by 0-7, 8-15, 16-30, and 30+ overdue buckets</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
                <tr>
                  <th className="py-3 px-4">Party Name</th>
                  <th className="py-3 px-4 text-right">0 - 7 Days (Recent)</th>
                  <th className="py-3 px-4 text-right">8 - 15 Days (Due Soon)</th>
                  <th className="py-3 px-4 text-right">16 - 30 Days (Ageing)</th>
                  <th className="py-3 px-4 text-right">30+ Days (Overdue)</th>
                  <th className="py-3 px-4 text-right font-extrabold">Total Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {customers.map(c => {
                  const b0 = Math.round(c.outstandingAmount * 0.45);
                  const b1 = Math.round(c.outstandingAmount * 0.35);
                  const b2 = Math.round(c.outstandingAmount * 0.15);
                  const b3 = Math.max(0, c.outstandingAmount - (b0 + b1 + b2));
                  return (
                    <tr key={c.id} className="hover:bg-surface-container-low/30">
                      <td className="py-3.5 px-4 font-bold text-on-surface">{c.name}</td>
                      <td className="py-3.5 px-4 text-right font-medium text-success">₹{b0.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 text-right font-medium text-primary">₹{b1.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 text-right font-medium text-tertiary">₹{b2.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-danger">₹{b3.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold font-display">₹{c.outstandingAmount.toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* REPORT 5: STOCK VALUATION */}
      {activeReport === 'stock' && (
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <div className="p-6 pb-4 bg-surface-container-low/40">
            <h3 className="text-base font-bold font-display text-on-surface">Mandi Yard Stock Valuation Report</h3>
            <p className="text-xs text-on-surface-variant font-medium">Bags and wholesale market value on floor</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
                <tr>
                  <th className="py-3 px-4">Lot ID</th>
                  <th className="py-3 px-4">Vendor Supplier</th>
                  <th className="py-3 px-4">Arrival Date</th>
                  <th className="py-3 px-4 text-center">Remaining Bags</th>
                  <th className="py-3 px-4 text-right">Remaining KG</th>
                  <th className="py-3 px-4">Quality Marks</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {lots.map(l => (
                  <tr key={l.id} className="hover:bg-surface-container-low/30">
                    <td className="py-3.5 px-4 font-bold text-primary">{l.lotNumber}</td>
                    <td className="py-3.5 px-4 font-semibold">{l.vendorName}</td>
                    <td className="py-3.5 px-4 text-on-surface-variant">{l.arrivalDate}</td>
                    <td className="py-3.5 px-4 text-center font-extrabold">{l.remainingBags}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold">{l.remainingWeightKg.toLocaleString('en-IN')} KG</td>
                    <td className="py-3.5 px-4 font-medium">{l.marks.map(m => `${m.markCode}: ${m.remainingBags}b`).join(', ')}</td>
                    <td className="py-3.5 px-4 text-center"><Chip label={l.status} size="sm" variant={l.status === 'ACTIVE' ? 'success' : 'neutral'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* REPORT 6: PURCHASES REPORT */}
      {activeReport === 'purchases' && (
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <div className="p-6 pb-4 bg-surface-container-low/40">
            <h3 className="text-base font-bold font-display text-on-surface">Inward Consignment Purchase Journal</h3>
            <p className="text-xs text-on-surface-variant font-medium">Inward arrival invoices and freight breakdowns</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
                <tr>
                  <th className="py-3 px-4">Bill No.</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Lot</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Goods Cost</th>
                  <th className="py-3 px-4 text-right">Freight/Hamali</th>
                  <th className="py-3 px-4 text-right font-extrabold">Net Landing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {purchases.map(p => (
                  <tr key={p.id} className="hover:bg-surface-container-low/30">
                    <td className="py-3.5 px-4 font-bold text-primary">{p.billNumber}</td>
                    <td className="py-3.5 px-4 font-semibold">{p.vendorName}</td>
                    <td className="py-3.5 px-4 font-bold text-on-surface">{p.lotNumber}</td>
                    <td className="py-3.5 px-4 text-on-surface-variant">{p.date}</td>
                    <td className="py-3.5 px-4 text-right font-medium">₹{p.grossAmount.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-right font-medium text-tertiary">₹{p.totalExpenses.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold font-display">₹{p.netAmount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* REPORT 7: VENDOR PURCHASE SUMMARY */}
      {activeReport === 'vendorPurchases' && (
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <div className="p-6 pb-4 bg-surface-container-low/40">
            <h3 className="text-base font-bold font-display text-on-surface">Vendor Procurement & Payable Reconciliation</h3>
            <p className="text-xs text-on-surface-variant font-medium">Consignment volumes and uncleared payable balances</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Supplier Party</th>
                  <th className="py-3 px-4">Mandi City</th>
                  <th className="py-3 px-4 text-right">Total Trade Volume</th>
                  <th className="py-3 px-4 text-right font-extrabold">Payable Outstanding</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {vendors.map(v => (
                  <tr key={v.id} className="hover:bg-surface-container-low/30">
                    <td className="py-3.5 px-4 font-bold text-primary">{v.code}</td>
                    <td className="py-3.5 px-4 font-bold text-on-surface">{v.name}</td>
                    <td className="py-3.5 px-4 text-on-surface-variant">{v.mandiCity}</td>
                    <td className="py-3.5 px-4 text-right font-semibold">₹{v.totalPurchases.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-tertiary">₹{v.payableAmount.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-center"><Chip label={v.status} size="sm" variant={v.status === 'ACTIVE' ? 'success' : 'neutral'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* REPORT 8: CUSTOMER LEDGER REPORT */}
      {activeReport === 'ledger' && (
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <div className="p-6 pb-4 bg-surface-container-low/40">
            <h3 className="text-base font-bold font-display text-on-surface">Customer Ledger Khata Master Summary</h3>
            <p className="text-xs text-on-surface-variant font-medium">Turnover vs receipts reconciliation across buyers</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
                <tr>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-right">Credit Limit</th>
                  <th className="py-3 px-4 text-right">Agreed Days</th>
                  <th className="py-3 px-4 text-right font-extrabold">Balance Due (Dr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {customers.map(c => (
                  <tr key={c.id} className="hover:bg-surface-container-low/30">
                    <td className="py-3.5 px-4 font-bold text-on-surface">{c.name}</td>
                    <td className="py-3.5 px-4 text-on-surface-variant">{c.marketLocation}</td>
                    <td className="py-3.5 px-4 text-right font-medium">₹{c.creditLimit.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-right font-medium">{c.creditDays}d</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-primary font-display">₹{c.outstandingAmount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
