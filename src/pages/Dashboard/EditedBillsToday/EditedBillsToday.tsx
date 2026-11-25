'use client';

import { Card } from '@/components/ui/Card';
import { useEditedBillsQuery } from '@/hooks/queries/use-edited-bills-query';
import { useT } from '@/store/preferences/language';
import { groupEditsByDay } from '@/utils/edited-bills';
import { ChevronRight, PencilLine } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

const SHOWN = 3;

/** What was corrected on the bills today: how many, what kind of change, and who changed it. */
export function EditedBillsToday({ today }: { today: string }) {
  const router = useRouter();
  const t = useT();
  const { data: bills = [] } = useEditedBillsQuery();
  const day = useMemo(() => groupEditsByDay(bills, { from: today, to: today })[0], [bills, today]);

  return (
    <Card variant="lowest" padding="md" className={day ? 'bg-tertiary/5' : undefined}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PencilLine className="w-5 h-5 text-tertiary" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{t('Bills edited today')}</span>
        </div>
        <button type="button" onClick={() => router.push('/approvals')} className="text-xs font-bold text-primary inline-flex items-center gap-0.5 cursor-pointer">
          {t('See all edits')} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      {!day ? (
        <p className="mt-2 text-xs text-on-surface-variant">{t('No bills were edited today.')}</p>
      ) : (
        <>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-display text-on-surface">{day.edits.length}</span>
            <span className="text-xs text-on-surface-variant font-medium">
              {day.edits.length === 1 ? t('bill') : t('bills')} · {day.editCount} {day.editCount === 1 ? t('edit') : t('edits')}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {day.kinds.map((kind) => (
              <span key={kind.label} className="px-2.5 py-1 rounded-full bg-surface-container-low text-[11px] font-semibold text-on-surface">
                {kind.label} · {kind.count}
              </span>
            ))}
          </div>
          <ul className="mt-3 divide-y divide-surface-container-low">
            {day.edits.slice(0, SHOWN).map(({ bill, revisions }) => (
              <li key={bill.id} className="py-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-sm font-semibold text-on-surface truncate">{bill.billNumber} · {bill.customerName}</span>
                  <span className="block text-[11px] text-on-surface-variant truncate">
                    {revisions[0]?.editedBy} — {revisions[0]?.reason}
                  </span>
                </div>
                <span className="shrink-0 text-[11px] text-on-surface-variant">{revisions[0]?.changes.map((change) => change.label).join(', ')}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
