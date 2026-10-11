'use client';

import { useAuditQuery } from '@/hooks/queries/use-directory-query';
import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { 
  History, Search, ShieldCheck, Clock, User, 
  ArrowRight, FileText, CheckCircle2 
} from 'lucide-react';

export const AuditHistory: React.FC = () => {
  const { data: auditLogs = [] } = useAuditQuery();
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const filtered = auditLogs.filter(log => {
    const matchSearch = log.details.toLowerCase().includes(search.toLowerCase()) ||
                        log.userName.toLowerCase().includes(search.toLowerCase()) ||
                        log.action.toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === 'ALL' || log.action.includes(filterAction);
    return matchSearch && matchAction;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
            Audit Trail & Transaction Timeline
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Immutable log of all weighment creations, collections, scale corrections, and system changes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Chip label="Dual-Custody Active" variant="primary" />
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search audit trail, user name, or transaction code..."
            icon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="academic-input py-3 px-4 text-xs font-semibold rounded-2xl w-full sm:w-auto cursor-pointer"
          >
            <option value="ALL">All Actions</option>
            <option value="SALE">Sales Created & Billed</option>
            <option value="PAYMENT">Payments Recorded</option>
            <option value="PURCHASE">Consignment Inward</option>
            <option value="APPROVAL">Approvals & Edits</option>
            <option value="STOCK">Stock Adjustments</option>
          </select>
        </div>
      </div>

      {/* Timeline Representation */}
      <Card variant="lowest" padding="none" className="overflow-hidden">
        <div className="divide-y divide-surface-container-low">
          {filtered.map(log => {
            const dateObj = new Date(log.timestamp);
            const dateStr = dateObj.toLocaleDateString();
            const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            return (
              <div key={log.id} className="p-5 sm:px-6 hover:bg-surface-container-low/40 transition-colors flex items-start gap-4">
                <div className="w-9 h-9 rounded-2xl bg-surface-container-low text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-primary font-display">{log.action}</span>
                    <Chip label={log.entity} size="sm" variant="secondary" />
                    <span className="text-xs text-on-surface-variant font-medium">
                      by <strong>{log.userName}</strong> ({log.userRole})
                    </span>
                  </div>

                  <p className="text-xs text-on-surface font-medium mt-1 leading-relaxed">
                    {log.details}
                  </p>

                  {log.approver && (
                    <div className="text-[11px] text-on-surface-variant font-semibold mt-1">
                      Manager Sign-Off: {log.approver}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0 text-xs text-on-surface-variant whitespace-nowrap">
                  <div className="font-semibold text-on-surface">{timeStr}</div>
                  <div className="text-[10px]">{dateStr}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
