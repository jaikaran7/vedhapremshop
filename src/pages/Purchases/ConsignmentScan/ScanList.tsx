'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/ui/Toast';
import { useCreateScanMutation } from '@/hooks/mutations/use-consignment-scan-mutations';
import { useConsignmentScansQuery } from '@/hooks/queries/use-consignment-scans-query';
import { STATUS_LABEL } from './scan-labels';

/** Recent consignment scans and the button that starts one. */
export const ScanList: React.FC = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { data: scans = [], isLoading } = useConsignmentScansQuery();
  const create = useCreateScanMutation();

  const start = () => create.mutate(undefined, {
    onSuccess: (scan) => router.push(`/purchases/scan/${scan.id}`),
    onError: (error) => toast({ type: 'error', title: 'Could not start a scan', message: error.message }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button type="button" onClick={() => router.push('/purchases')} className="text-xs font-semibold text-on-surface-variant flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Purchases
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">Scan consignment</h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Photograph the vendor bill and the mark sheet. The bill lines are matched to marks; you check, correct, and the owner confirms.
          </p>
        </div>
        <Button variant="primary" icon={<ScanLine className="w-4 h-4" />} onClick={start} disabled={create.isPending}>
          {create.isPending ? 'Starting…' : 'Start new scan'}
        </Button>
      </div>

      <Card variant="lowest" padding="none" className="overflow-hidden">
        {isLoading && <p className="p-6 text-sm text-on-surface-variant">Loading scans…</p>}
        {!isLoading && scans.length === 0 && <p className="p-6 text-sm text-on-surface-variant">No scans yet.</p>}
        <div className="divide-y divide-surface-container-low">
          {scans.map((scan) => (
            <button
              type="button"
              key={scan.id}
              onClick={() => router.push(`/purchases/scan/${scan.id}`)}
              className="w-full text-left p-5 sm:px-6 hover:bg-surface-container-low/40 transition-colors flex items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-primary font-display">{scan.billNumber ?? 'Bill not read yet'}</span>
                  {scan.lotNumber && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-fixed text-primary-on-fixed">{scan.lotNumber}</span>}
                  <Chip size="sm" label={STATUS_LABEL[scan.status].label} variant={STATUS_LABEL[scan.status].variant} />
                </div>
                <p className="text-sm font-bold font-display text-on-surface mt-1">{scan.vendorName ?? 'Vendor not set'}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {scan.documentCount} file(s) · started by {scan.createdBy} · {new Date(scan.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-on-surface-variant" />
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};
