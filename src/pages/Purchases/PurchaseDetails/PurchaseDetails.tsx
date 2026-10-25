'use client';

import { useSession } from '@/store/session/session-provider';
import { usePurchaseRevisionsQuery, usePurchasesQuery } from '@/hooks/queries/use-purchases-query';
import { useLotsQuery } from '@/hooks/queries/use-lots-query';
import { useRouter } from 'next/navigation';
import { useRouteId } from '@/hooks/shared/use-route-id';
import { can } from '@/auth/permissions';
import { isPendingReceipt, purchaseExpenseLabel } from '@/utils/receiving';
import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { 
  ArrowLeft, Truck, Layers, FileText, Download, 
  ExternalLink, Paperclip, Printer, Eye, Pencil, History
} from 'lucide-react';

export const PurchaseDetails: React.FC = () => {
  const id = useRouteId();
  const router = useRouter();
  const { currentUser } = useSession();
  const { data: purchases = [] } = usePurchasesQuery();
  const { data: lots = [] } = useLotsQuery();
  const [showAttachmentViewer, setShowAttachmentViewer] = useState(false);
  const known = purchases.find((p) => p.id === id);
  const { data: revisions = [] } = usePurchaseRevisionsQuery(id, (known?.revisionCount ?? 0) > 0);

  // Role Guard
  if (!can(currentUser.role, 'accessPurchases')) {
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
              <Chip
                label={isPendingReceipt(purchase) ? 'Awaiting arrival' : purchase.receiving ? 'Received' : 'In stock'}
                size="sm"
                variant={isPendingReceipt(purchase) ? 'tertiary' : 'success'}
              />
              {(purchase.revisionCount ?? 0) > 0 && <Chip label={`Corrected ${purchase.revisionCount}×`} size="sm" variant="neutral" />}
            </div>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              {purchase.productName ? `${purchase.productName} • ` : ''}Supplier: {purchase.vendorName} • Purchase date {purchase.date}
              {purchase.expectedArrivalDate ? ` • Expected ${purchase.expectedArrivalDate}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPendingReceipt(purchase) && (
            <Button variant="primary" onClick={() => router.push(`/purchases/${purchase.id}/receive`)}>
              Receive Lot
            </Button>
          )}
          <Button variant="secondary" icon={<Pencil className="w-4 h-4" />} onClick={() => router.push(`/purchases/${purchase.id}/edit`)}>
            Correct Bill
          </Button>
          {matchingLot && (
            <Button
              variant="secondary"
              icon={<Layers className="w-4 h-4" />}
              onClick={() => router.push('/lots')}
            >
              View Yard Lot
            </Button>
          )}
          {purchase.attachmentUrl && (
            <Button
              variant="primary"
              icon={<Eye className="w-4 h-4" />}
              onClick={() => setShowAttachmentViewer(true)}
            >
              View Vendor Attachment
            </Button>
          )}
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
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Purchase charges</span>
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
        <div className="p-6 pb-4 bg-surface-container-low">
          <h3 className="text-xl font-bold font-display text-on-surface">Graded Quality Breakdown</h3>
          <p className="text-sm text-on-surface-variant font-medium mt-1">Bags and wholesale rates recorded for each quality</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-base">
            <thead className="bg-surface-container uppercase text-sm font-bold text-on-surface-variant">
              <tr>
                <th className="py-4 px-6 w-[18%]">Quality</th>
                <th className="py-4 px-6">Bags</th>
                <th className="py-4 px-6">Weight</th>
                <th className="py-4 px-6">Avg bag</th>
                <th className="py-4 px-6">Purchase rate</th>
                <th className="py-4 px-6 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map(item => (
                <tr key={item.id} className="border-t border-surface-container-lowest odd:bg-surface-container-low">
                  <td className="py-5 px-6 text-lg font-bold text-primary">{item.markCode}</td>
                  <td className="py-5 px-6 font-semibold text-on-surface">{item.bags} bags</td>
                  <td className="py-5 px-6 font-semibold text-on-surface">{item.weightKg.toLocaleString('en-IN')} kg</td>
                  <td className="py-5 px-6 text-on-surface">{item.bags > 0 ? `${(item.weightKg / item.bags).toFixed(1)} kg` : '—'}</td>
                  <td className="py-5 px-6 font-bold text-on-surface">₹{item.ratePerKg.toFixed(2)} / kg</td>
                  <td className="py-5 px-6 text-right text-lg font-extrabold font-display text-on-surface">
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
          <h3 className="text-base font-bold font-display text-on-surface mb-3">Purchase expenses payable to the vendor</h3>
          <div className="space-y-2">
            {purchase.expenses.map(e => (
              <div key={e.id} className="p-3 rounded-2xl bg-surface-container-low flex justify-between text-xs">
                <div>
                  <span className="font-bold text-primary mr-2">{purchaseExpenseLabel(e)}</span>
                  <span className="text-on-surface font-medium">{e.description}</span>
                  {e.remarks ? <span className="text-on-surface-variant"> · {e.remarks}</span> : null}
                </div>
                <span className="font-extrabold font-display text-on-surface">₹{e.amount.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {purchase.receiving && (
        <Card variant="lowest">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-base font-bold font-display text-on-surface">Final selling rates</h3>
            <span className="text-[11px] text-on-surface-variant">Saved when the lot was received. Later margin changes do not rewrite these rates.</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase font-bold text-on-surface-variant">
                <tr>
                  <th className="py-2 pr-3">Mark</th>
                  <th className="py-2 pr-3">Accepted bags</th>
                  <th className="py-2 pr-3">Purchase ₹/kg</th>
                  <th className="py-2 pr-3">Calculated final</th>
                  <th className="py-2">Applied rate</th>
                </tr>
              </thead>
              <tbody>
                {purchase.receiving.groups.map((group) => (
                  <tr key={group.id} className="border-t border-surface-container-low">
                    <td className="py-2 pr-3 font-bold text-primary">{group.markCode}</td>
                    <td className="py-2 pr-3">{group.acceptedBags}</td>
                    <td className="py-2 pr-3">₹{group.originalPurchaseRate.toFixed(2)}</td>
                    <td className="py-2 pr-3">{group.calculatedFinalRate == null ? '—' : `₹${group.calculatedFinalRate.toFixed(2)}`}</td>
                    <td className="py-2 font-bold">{group.revisedSellingRate != null ? `₹${group.revisedSellingRate.toFixed(2)}` : group.calculatedFinalRate == null ? '—' : `₹${group.calculatedFinalRate.toFixed(2)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {revisions.length > 0 && (
        <Card variant="lowest">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-base font-bold font-display text-on-surface flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <span>Correction history ({revisions.length})</span>
            </h3>
            <span className="text-[11px] text-on-surface-variant">Every change keeps the previous value, who changed it and why.</span>
          </div>
          <div className="space-y-4">
            {revisions.map((revision) => (
              <div key={revision.id} className="rounded-2xl bg-surface-container-low p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-on-surface">
                    Correction #{revision.revisionNo} by {revision.editedBy} ({revision.editedByRole.toLowerCase()})
                  </span>
                  <span className="text-on-surface-variant">{new Date(revision.createdAt).toLocaleString('en-IN')}</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Reason: <span className="text-on-surface font-medium">{revision.reason}</span></p>
                <div className="mt-3 space-y-3">
                  {revision.changes.map((change) => (
                    <div key={change.field} className="grid grid-cols-1 sm:grid-cols-[10rem_1fr_1fr] gap-2 text-xs">
                      <span className="font-bold text-on-surface-variant uppercase tracking-wide text-[10px] pt-0.5">{change.label}</span>
                      <div className="rounded-xl bg-danger/5 p-2.5">
                        <span className="block text-[10px] font-bold uppercase text-danger mb-0.5">Previous</span>
                        <span className="whitespace-pre-line text-on-surface">{change.from}</span>
                      </div>
                      <div className="rounded-xl bg-success/10 p-2.5">
                        <span className="block text-[10px] font-bold uppercase text-success mb-0.5">Current</span>
                        <span className="whitespace-pre-line text-on-surface font-semibold">{change.to}</span>
                      </div>
                    </div>
                  ))}
                </div>
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
            {purchase.attachmentUrl ? (
              <img
                src={purchase.attachmentUrl}
                alt="Vendor bill"
                className="max-h-[500px] w-full object-contain"
              />
            ) : (
              <p className="text-sm text-on-surface-variant p-8">No vendor bill file is attached.</p>
            )}
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
