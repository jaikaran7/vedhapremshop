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
  const processApproval = (approvalId: string, action: 'APPROVE' | 'REJECT', notes?: string) => processApprovalMutation.mutate({ approvalId, action, notes });
  const [filterStatus, setFilterStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const { toast } = useToast();
  const router = useRouter();
  // Guard: Salesperson can view their requests, but only Manager and Owner can approve/reject
  const canReview = can(currentUser.role, 'reviewApprovals');

  const filtered = approvals.filter(a => filterStatus === 'ALL' || a.status === filterStatus);

  const handleAction = (id: string, action: 'APPROVE' | 'REJECT') => {
    processApproval(id, action, reviewNotes);
    toast({
      type: action === 'APPROVE' ? 'success' : 'info',
      title: action === 'APPROVE' ? 'Request Approved' : 'Request Rejected',
      message: `Audit log recorded. Transaction updated.`
    });
    setSelectedApproval(null);
    setReviewNotes('');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
            Approvals & Transaction Amendments
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Dual-custody verification: Finalized sale bills cannot be silently mutated without management approval.
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
                    {app.entityType} Amendment by {app.requestedBy} ({app.requestedByRole})
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
                    Compare Edits
                  </Button>

                  {canReview && app.status === 'PENDING' && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAction(app.id, 'REJECT')}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
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
                Salesperson Statement & Justification:
              </span>
              <p className="font-semibold text-on-surface">{selectedApproval.reason}</p>
            </div>

            {/* Side-by-side comparison (Curated Academic intentional asymmetry) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Original Values */}
              <div className="p-4 rounded-2xl bg-danger-container/30 border border-danger/20 space-y-2">
                <span className="text-[11px] font-bold text-danger uppercase tracking-wider block">
                  Original Confirmed Data:
                </span>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Scale Weight:</span>
                    <span className="font-extrabold text-on-surface">
                      {selectedApproval.originalData?.totalWeightKg ?? 151} KG
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Total Billed:</span>
                    <span className="font-extrabold text-on-surface">
                      ₹{selectedApproval.originalData?.totalAmount?.toLocaleString('en-IN') ?? '10,419'}
                    </span>
                  </div>
                  {selectedApproval.originalData?.markItem && (
                    <div className="pt-2 text-[11px] text-on-surface-variant">
                      Item: {selectedApproval.originalData.markItem}
                    </div>
                  )}
                </div>
              </div>

              {/* Requested New Values */}
              <div className="p-4 rounded-2xl bg-success-container/40 border border-success/20 space-y-2">
                <span className="text-[11px] font-bold text-success uppercase tracking-wider block">
                  Proposed Amendment:
                </span>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Scale Weight:</span>
                    <span className="font-extrabold text-success">
                      {selectedApproval.requestedData?.totalWeightKg ?? 158} KG
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Total Billed:</span>
                    <span className="font-extrabold text-success">
                      ₹{selectedApproval.requestedData?.totalAmount?.toLocaleString('en-IN') ?? '10,902'}
                    </span>
                  </div>
                  {selectedApproval.requestedData?.markItem && (
                    <div className="pt-2 text-[11px] text-on-surface-variant">
                      Item: {selectedApproval.requestedData.markItem}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* If resolved */}
            {selectedApproval.status !== 'PENDING' && (
              <div className="p-3 rounded-xl bg-surface-container-low text-xs">
                <span>Status: <strong>{selectedApproval.status}</strong> by {selectedApproval.reviewedBy} on {new Date(selectedApproval.reviewedAt || '').toLocaleDateString()}</span>
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
                    onClick={() => handleAction(selectedApproval.id, 'REJECT')}
                  >
                    Reject Amendment
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleAction(selectedApproval.id, 'APPROVE')}
                  >
                    Approve & Apply Correction
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
