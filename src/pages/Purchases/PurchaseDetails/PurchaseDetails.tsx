'use client';

import { useSession } from '@/store/session/session-provider';
import { usePurchasesQuery } from '@/hooks/queries/use-purchases-query';
import { useLotsQuery } from '@/hooks/queries/use-lots-query';
import { useRouter } from 'next/navigation';
import { useRouteId } from '@/hooks/shared/use-route-id';
import { can } from '@/auth/permissions';
import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { 
  ArrowLeft, Truck, Layers, FileText, Download, 
  ExternalLink, Paperclip, Printer, Eye 
} from 'lucide-react';

export const PurchaseDetails: React.FC = () => {
  const id = useRouteId();
  const router = useRouter();
  const { currentUser } = useSession();
  const { data: purchases = [] } = usePurchasesQuery();
  const { data: lots = [] } = useLotsQuery();
  const [showAttachmentViewer, setShowAttachmentViewer] = useState(false);

  // Role Guard
  if (!can(currentUser.role, 'viewPurchaseCost')) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-xl font-bold font-display">Restricted Floor Area</h3>
        <Button variant="primary" className="mt-4" onClick={() => router.push('/salesperson-home')}>
          Back to Floor
        </Button>
      </div>
    );
  }

  const purchase = purchases.find(p => p.id === id);

  if (!purchase) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-xl font-bold font-display">Purchase Record Not Found</h3>
        <Button variant="primary" className="mt-4" onClick={() => router.push('/purchases')}>
          Return to Purchases
        </Button>
      </div>
    );
  }

  const totalBags = purchase.items.reduce((acc, i) => acc + i.bags, 0);
  const totalWeight = purchase.items.reduce((acc, i) => acc + i.weightKg, 0);

  // Matching lot
  const matchingLot = lots.find(l => l.lotNumber.toUpperCase() === purchase.lotNumber.toUpperCase());

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/purchases')}
            className="p-2.5 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary font-display">{purchase.billNumber}</span>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
                {purchase.lotNumber} Consignment
              </h1>
              <Chip label="Verified Inward" size="sm" variant="success" />
            </div>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              Supplier: {purchase.vendorName} • Arrived on {purchase.date}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {matchingLot && (
            <Button
              variant="secondary"
              icon={<Layers className="w-4 h-4" />}
              onClick={() => router.push('/lots')}
            >
              View Yard Lot
            </Button>
          )}
          <Button
            variant="primary"
            icon={<Eye className="w-4 h-4" />}
            onClick={() => setShowAttachmentViewer(true)}
          >
            View Vendor Attachment
          </Button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card variant="lowest" padding="md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Total Bags Inward</span>
          <div className="text-2xl font-extrabold font-display text-on-surface mt-1">{totalBags} Bags</div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">{totalWeight.toLocaleString('en-IN')} KG gross</span>
        </Card>

        <Card variant="lowest" padding="md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Goods Cost</span>
          <div className="text-2xl font-extrabold font-display text-on-surface mt-1">₹{purchase.grossAmount.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">Sum of all graded qualities</span>
        </Card>

        <Card variant="lowest" padding="md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Freight & Mandi Hamali</span>
          <div className="text-2xl font-extrabold font-display text-tertiary mt-1">₹{purchase.totalExpenses.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">{purchase.expenses.length} expense heads</span>
        </Card>

        <Card variant="lowest" padding="md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Net Landing Value</span>
          <div className="text-2xl font-extrabold font-display text-primary mt-1">₹{purchase.netAmount.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">Vendor payable credited</span>
        </Card>
      </div>

      {/* Graded Marks Table */}
      <Card variant="lowest" padding="none" className="overflow-hidden">
        <div className="p-6 pb-4 bg-surface-container-low/40">
          <h3 className="text-base font-bold font-display text-on-surface">Graded Quality Breakdown</h3>
          <p className="text-xs text-on-surface-variant font-medium">Bags and wholesale rates recorded per onion mark</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
              <tr>
                <th className="py-3 px-4">Mark Grade</th>
                <th className="py-3 px-4">Bags</th>
                <th className="py-3 px-4">Weight (KG)</th>
                <th className="py-3 px-4">Avg Bag Weight</th>
                <th className="py-3 px-4">Purchase Rate</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {purchase.items.map(item => (
                <tr key={item.id} className="hover:bg-surface-container-low/30">
                  <td className="py-3.5 px-4 font-bold text-primary">Grade {item.markCode}</td>
                  <td className="py-3.5 px-4 font-semibold text-on-surface">{item.bags} bags</td>
                  <td className="py-3.5 px-4 font-semibold text-on-surface">{item.weightKg.toLocaleString('en-IN')} KG</td>
                  <td className="py-3.5 px-4 text-on-surface-variant">{(item.weightKg / item.bags).toFixed(1)} KG / bag</td>
                  <td className="py-3.5 px-4 font-bold text-on-surface">₹{item.ratePerKg.toFixed(2)} / KG</td>
                  <td className="py-3.5 px-4 text-right font-extrabold font-display text-on-surface">
                    ₹{item.totalAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Expenses Breakdown */}
      {purchase.expenses.length > 0 && (
        <Card variant="lowest">
          <h3 className="text-base font-bold font-display text-on-surface mb-3">Freight & Landing Expenses</h3>
          <div className="space-y-2">
            {purchase.expenses.map(e => (
              <div key={e.id} className="p-3 rounded-2xl bg-surface-container-low flex justify-between text-xs">
                <div>
                  <span className="font-bold text-primary mr-2">[{e.type}]</span>
                  <span className="text-on-surface font-medium">{e.description}</span>
                </div>
                <span className="font-extrabold font-display text-on-surface">₹{e.amount.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Attachment Viewer Modal */}
      <Modal
        isOpen={showAttachmentViewer}
        onClose={() => setShowAttachmentViewer(false)}
        title={`Vendor Bill Attachment: ${purchase.attachmentName || 'Document'}`}
        subtitle={`Attached to ${purchase.billNumber} • ${purchase.vendorName}`}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden bg-surface-container-high border border-surface-container max-h-[500px] flex items-center justify-center">
            <img 
              src={purchase.attachmentUrl || 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80'} 
              alt="Vendor Physical Bill Scan" 
              className="max-h-[500px] w-full object-contain"
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-2">
            <span className="text-on-surface-variant font-medium">Digital APMC e-Weighment Scan</span>
            <Button 
              variant="secondary" 
              size="sm" 
              icon={<ExternalLink className="w-3.5 h-3.5" />}
              onClick={() => window.open(purchase.attachmentUrl || '', '_blank')}
            >
              Open Original Scan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
