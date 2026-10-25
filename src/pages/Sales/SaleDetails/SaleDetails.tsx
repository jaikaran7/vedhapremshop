'use client';

import { useSession } from '@/store/session/session-provider';
import { useSalesQuery } from '@/hooks/queries/use-sales-query';
import { useCancelSaleMutation, useNoteSaleCorrectionMutation } from '@/hooks/mutations/use-sale-mutations';
import { isMockApi } from '@/config/env';
import { chargesForSale } from '@/utils/sale-charges';
import { formatRupee } from '@/utils/settlement';
import { useRouter } from 'next/navigation';
import { useRouteId } from '@/hooks/shared/use-route-id';
import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { 
  ArrowLeft, Receipt, Printer, Edit, AlertCircle, 
  CheckCircle2, Clock, Scale, Share2, Layers 
} from 'lucide-react';

export const SaleDetails: React.FC = () => {
  const id = useRouteId();
  const router = useRouter();
  const { currentUser } = useSession();
  const { data: sales = [] } = useSalesQuery();
  const noteCorrectionMutation = useNoteSaleCorrectionMutation();
  const cancelMutation = useCancelSaleMutation();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const { toast } = useToast();

  const sale = sales.find(s => s.id === id);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editReason, setEditReason] = useState('Bag weight entered incorrectly on scale during weighment');

  if (!sale) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-xl font-bold font-display">Sale Record Not Found</h3>
        <Button variant="primary" className="mt-4" onClick={() => router.push('/sales')}>
          Back to Sales List
        </Button>
      </div>
    );
  }

  const handleRequestEdit = (e: React.FormEvent) => {
    e.preventDefault();
    noteCorrectionMutation.mutate({ saleId: sale.id, note: editReason });

    toast({
      type: 'info',
      title: 'Correction Noted',
      message: 'The finalized bill was not changed. The note is in the audit history.'
    });

    setShowEditModal(false);
  };

  const charges = chargesForSale(sale);
  const isOwner = currentUser.role === 'OWNER';
  const canChange = !isMockApi() && sale.status === 'CONFIRMED';

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await cancelMutation.mutateAsync({ saleId: sale.id, reason: cancelReason.trim() });
      toast(result.status === 'APPLIED'
        ? { type: 'success', title: 'Bill cancelled', message: `${sale.billNumber} cancelled. Stock returned to the lot.` }
        : { type: 'info', title: 'Sent for Owner approval', message: `Cancelling ${sale.billNumber} is waiting in Approvals.` });
      setShowCancelModal(false);
    } catch (error) {
      toast({ type: 'error', title: 'Not cancelled', message: error instanceof Error ? error.message : 'Try again.' });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/sales')}
            className="p-2.5 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary font-display">{sale.billNumber}</span>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
                {sale.customerName}
              </h1>
              <Chip
                label={sale.status === 'PENDING_APPROVAL' ? 'AWAITING OWNER' : sale.status}
                size="sm"
                variant={sale.status === 'CONFIRMED' ? 'success' : sale.status === 'CANCELLED' ? 'danger' : 'tertiary'}
              />
            </div>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              Billed on {sale.date} at {sale.time} by {sale.createdByName}
              {sale.replacesBillNumber && <> • Replaces {sale.replacesBillNumber}</>}
            </p>
            {sale.status === 'CANCELLED' && (
              <p className="text-xs font-semibold text-danger mt-1">
                {sale.cancelReason ?? 'Cancelled'}
                {sale.replacedBySaleId && (
                  <button className="ml-2 underline" onClick={() => router.push(`/sales/${sale.replacedBySaleId}`)}>
                    Open {sale.replacedByBillNumber}
                  </button>
                )}
              </p>
            )}
            {sale.status === 'PENDING_APPROVAL' && (
              <p className="text-xs font-semibold text-tertiary mt-1">Dated another day — waiting for the Owner in Approvals. Stock is held.</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canChange && (
            <>
              <Button variant="secondary" icon={<Edit className="w-4 h-4" />} onClick={() => router.push(`/sales/new?rebill=${sale.id}`)}>
                {isOwner ? 'Edit Bill' : 'Request Edit'}
              </Button>
              <Button variant="danger" icon={<AlertCircle className="w-4 h-4" />} onClick={() => setShowCancelModal(true)}>
                {isOwner ? 'Cancel Bill' : 'Request Cancel'}
              </Button>
            </>
          )}
          <Button
            variant="secondary"
            icon={<Edit className="w-4 h-4" />}
            onClick={() => setShowEditModal(true)}
          >
            Note Correction
          </Button>
          <Button
            variant="primary"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => router.push(`/sales/${sale.id}/bill`)}
          >
            Digital Bill
          </Button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card variant="lowest" padding="md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Total Bags Weighed</span>
          <div className="text-2xl font-extrabold font-display text-on-surface mt-1">{sale.totalBags} Bags</div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">{sale.totalWeightKg} KG actual tare</span>
        </Card>

        <Card variant="lowest" padding="md" className="bg-success/5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Revenue (Total)</span>
          <div className="text-2xl font-extrabold font-display text-success mt-1">₹{formatRupee(charges.finalInvoiceAmount)}</div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">
            Product <span className="text-success font-semibold">₹{formatRupee(charges.productSubtotal)}</span> · Fees ₹{formatRupee(charges.totalAdditionalCharges)}
          </span>
        </Card>

        <Card variant="lowest" padding="md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Payment Status</span>
          <div className="text-2xl font-extrabold font-display text-on-surface mt-1">
            {sale.paymentType === 'CREDIT' ? 'Khata Debit' : 'Settled'}
          </div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">
            {sale.balanceDue > 0 ? `Due: ₹${sale.balanceDue.toLocaleString('en-IN')}` : 'Full paid'}
          </span>
        </Card>

        <Card variant="lowest" padding="md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Quality Grades</span>
          <div className="text-2xl font-extrabold font-display text-secondary mt-1">{sale.items.length} Marks</div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">
            {sale.items.map(i => i.markCode).join(', ')}
          </span>
        </Card>
      </div>

      {/* Items & Bag Weighment Grid */}
      <Card variant="lowest" padding="none" className="overflow-hidden">
        <div className="p-6 pb-4 bg-surface-container-low/40 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold font-display text-on-surface">Weighment & Bag Details</h3>
            <p className="text-xs text-on-surface-variant font-medium">Exact bag weights registered on digital floor scale</p>
          </div>
        </div>

        <div className="divide-y divide-surface-container-low">
          {sale.items.map(item => (
            <div key={item.id} className="p-5 sm:px-6 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-primary font-display text-sm mr-2">Grade {item.markCode}</span>
                  <span className="text-on-surface-variant font-semibold">Lot: {item.lotNumber}</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-on-surface font-display text-sm">
                    {item.weightKg} KG @ ₹{item.ratePerKg.toFixed(2)} = ₹{item.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Individual bags */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {item.bagWeights.map(bag => (
                  <div key={bag.bagNumber} className="p-2.5 rounded-xl bg-surface-container-low text-xs flex justify-between items-center">
                    <span className="text-[10px] text-on-surface-variant font-medium">Bag #{bag.bagNumber}</span>
                    <span className="font-bold text-on-surface">{bag.weightKg} KG</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title={`${isOwner ? 'Cancel' : 'Request to cancel'} ${sale.billNumber}`}
        subtitle={isOwner
          ? 'Stock goes back to the lot. Money received becomes credit for this customer (counter sales are refunded).'
          : 'The Owner will approve or reject this. Nothing changes until then.'}
      >
        <form onSubmit={handleCancel} className="space-y-4">
          <Input label="Reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. Duplicate bill" required />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCancelModal(false)}>Keep Bill</Button>
            <Button type="submit" variant="danger" isLoading={cancelMutation.isPending} disabled={cancelReason.trim().length < 3}>
              {isOwner ? 'Cancel Bill' : 'Send Request'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Request Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Note a correction for ${sale.billNumber}`}
        subtitle="The finalized invoice, stock, and customer balance stay as posted. This note is added to the audit history."
      >
        <form onSubmit={handleRequestEdit} className="space-y-4">
          <div className="p-4 rounded-2xl bg-surface-container-low text-xs space-y-1">
            <span className="font-bold text-on-surface">Current Confirmed Values:</span>
            <div className="text-on-surface-variant">
              Weight: <strong>{sale.totalWeightKg} KG</strong> • Total Amount: <strong>₹{sale.totalAmount.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <Input
            label="What should be reviewed"
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            placeholder="e.g. Bag #2 was 53kg instead of 60kg on scale"
            required
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Audit Note
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
