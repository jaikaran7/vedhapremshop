'use client';

import { useSession } from '@/store/session/session-provider';
import { useApprovalsQuery } from '@/hooks/queries/use-approvals-query';
import { useProcessApprovalMutation } from '@/hooks/mutations/use-approval-mutations';
import { useRouter } from 'next/navigation';
import { can } from '@/auth/permissions';
import React, { useState } from 'react';
import { ApprovalRequest } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { 
  CheckSquare, AlertCircle, CheckCircle2, XCircle, 
  ArrowRight, Scale, Clock, User, Eye, ArrowLeft 
} from 'lucide-react';

export const ApprovalsHub: React.FC = () => {
  const { currentUser } = useSession();
  const { data: approvals = [] } = useApprovalsQuery();
  const processApprovalMutation = useProcessApprovalMutation();
  const processApproval = (approvalId: string, action: 'APPROVE' | 'REJECT', notes?: string) => processApprovalMutation.mutateAsync({ approvalId, action, notes });
  const [filterStatus, setFilterStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const { toast } = useToast();
  const router = useRouter();
  // Everyone sees the queue; only the Owner approves or rejects (the API enforces it too).
  const canReview = can(currentUser.role, 'reviewApprovals');

  const filtered = approvals.filter(a => filterStatus === 'ALL' || a.status === filterStatus);

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await processApproval(id, action, reviewNotes);
      toast({
        type: action === 'APPROVE' ? 'success' : 'info',
        title: action === 'APPROVE' ? 'Request Approved' : 'Request Rejected',
        message: action === 'APPROVE' ? 'The change is applied and recorded in the audit history.' : 'Nothing was changed. Recorded in the audit history.',
      });
      setSelectedApproval(null);
      setReviewNotes('');
    } catch (error) {
      toast({ type: 'error', title: 'Could not apply', message: error instanceof Error ? error.message : 'Try again.' });
    }
  };
  const fmtAmount = (value: unknown) => typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : '—';
  const fmtText = (value: unknown) => (typeof value === 'string' || typeof value === 'number') ? String(value) : '—';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
            Approvals & Transaction Amendments
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            {canReview
              ? 'Cancellations and bill edits from staff wait here for your decision.'
              : 'Requests waiting for the Owner. You can see them; only the Owner can approve or reject.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterStatus === st 
                  ? 'bg-primary text-white shadow-ambient' 
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Approvals Queue List */}
      <Card variant="lowest" padding="none" className="overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-success/50 mx-auto mb-3" />
            <h4 className="text-base font-bold font-display text-on-surface">No approvals in this queue</h4>
            <p className="text-xs text-on-surface-variant mt-1">All scale corrections and transaction edits are resolved.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-container-low">
            {filtered.map(app => (
              <div
                key={app.id}
                className="p-5 sm:px-6 hover:bg-surface-container-low/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary font-display">{app.referenceNo}</span>
                    <Chip
                      label={app.status}
                      size="sm"
                      variant={app.status === 'PENDING' ? 'tertiary' : app.status === 'APPROVED' ? 'success' : 'danger'}
                    />
                    <span className="text-xs text-on-surface-variant font-medium">
                      Requested on {new Date(app.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-on-surface mt-1">
                    {app.requestLabel ?? `${app.entityType} Amendment`} — by {app.requestedBy} ({app.requestedByRole})
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    <strong>Reason:</strong> {app.reason}
                  </p>
                </div>

                {/* Right: Compare & Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Eye className="w-3.5 h-3.5" />}
                    onClick={() => setSelectedApproval(app)}
                  >
                    {canReview ? 'Review' : 'View'}
                  </Button>

                  {canReview && app.status === 'PENDING' && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={processApprovalMutation.isPending}
                        onClick={() => handleAction(app.id, 'REJECT')}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={processApprovalMutation.isPending}
                        onClick={() => handleAction(app.id, 'APPROVE')}
                      >
                        Approve
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Edit Comparison Modal */}
      {selectedApproval && (
        <Modal
          isOpen={!!selectedApproval}
          onClose={() => setSelectedApproval(null)}
          title={`Audit Comparison: ${selectedApproval.referenceNo}`}
          subtitle={`Requested by ${selectedApproval.requestedBy} (${selectedApproval.requestedByRole})`}
          maxWidth="xl"
        >
          <div className="space-y-5">
            {/* Reason Box */}
            <div className="p-4 rounded-2xl bg-surface-container-low text-xs">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">
                Reason given:
              </span>
              <p className="font-semibold text-on-surface">{selectedApproval.reason}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-danger-container/30 border border-danger/20 space-y-2">
                <span className="text-[11px] font-bold text-danger uppercase tracking-wider block">Now</span>
                <div className="space-y-1.5">
                  <div className="flex justify-between"><span className="text-on-surface-variant">Date:</span><span className="font-extrabold">{fmtText(selectedApproval.originalData?.date)}</span></div>
                  <div className="flex justify-between"><span className="text-on-surface-variant">Weight:</span><span className="font-extrabold">{fmtText(selectedApproval.originalData?.totalWeightKg)} KG</span></div>
                  <div className="flex justify-between"><span className="text-on-surface-variant">Bill total:</span><span className="font-extrabold">{fmtAmount(selectedApproval.originalData?.totalAmount)}</span></div>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-success-container/40 border border-success/20 space-y-2">
                <span className="text-[11px] font-bold text-success uppercase tracking-wider block">
                  {selectedApproval.requestType === 'SALE_CANCEL' ? 'Requested: cancel the bill' : 'Requested'}
                </span>
                {selectedApproval.requestType === 'SALE_CANCEL' ? (
                  <p className="text-on-surface">Stock returns to the lot; money received becomes customer credit (counter sales are refunded).</p>
                ) : selectedApproval.requestType === 'SALE_REBILL' ? (
                  <div className="space-y-1.5">
                    {(selectedApproval.requestedData?.items ?? []).map((item: { lotNumber: string; markCode: string; ratePerKg: number; bagWeights: { weightKg: number }[] }, index: number) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-on-surface-variant">{item.lotNumber} · {item.markCode} · {item.bagWeights.length} bags</span>
                        <span className="font-extrabold text-success">{item.bagWeights.reduce((sum, bag) => sum + bag.weightKg, 0)} KG @ ₹{item.ratePerKg}</span>
                      </div>
                    ))}
                    <div className="flex justify-between"><span className="text-on-surface-variant">Bill total shown:</span><span className="font-extrabold text-success">{fmtAmount(selectedApproval.requestedData?.totalAmount)}</span></div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex justify-between"><span className="text-on-surface-variant">Bill date:</span><span className="font-extrabold text-success">{fmtText(selectedApproval.requestedData?.date)}</span></div>
                    <div className="flex justify-between"><span className="text-on-surface-variant">Customer:</span><span className="font-extrabold">{fmtText(selectedApproval.requestedData?.customerName)}</span></div>
                    <div className="flex justify-between"><span className="text-on-surface-variant">Bill total:</span><span className="font-extrabold">{fmtAmount(selectedApproval.requestedData?.totalAmount)}</span></div>
                  </div>
                )}
              </div>
            </div>

            {/* If resolved */}
            {selectedApproval.status !== 'PENDING' && (
              <div className="p-3 rounded-xl bg-surface-container-low text-xs">
                <span>Status: <strong>{selectedApproval.status}</strong>{selectedApproval.reviewedBy && <> by {selectedApproval.reviewedBy} on {new Date(selectedApproval.reviewedAt || '').toLocaleDateString()}</>}</span>
                {selectedApproval.reviewNotes && <p className="text-[11px] text-on-surface-variant mt-0.5">Notes: {selectedApproval.reviewNotes}</p>}
              </div>
            )}

            {/* Review Controls for Manager / Owner */}
            {canReview && selectedApproval.status === 'PENDING' && (
              <div className="pt-4 border-t border-surface-container-low space-y-3">
                <Input
                  label="Review Sign-Off Notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Verified with weighbridge scale log slip"
                />

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="danger"
                    isLoading={processApprovalMutation.isPending}
                    onClick={() => handleAction(selectedApproval.id, 'REJECT')}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    isLoading={processApprovalMutation.isPending}
                    onClick={() => handleAction(selectedApproval.id, 'APPROVE')}
                  >
                    Approve & Apply
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
