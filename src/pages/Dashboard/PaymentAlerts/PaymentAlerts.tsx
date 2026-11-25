'use client';

import { Card } from '@/components/ui/Card';
import { useT } from '@/store/preferences/language';
import type { DueAlert } from '@/utils/payment-alerts';
import { formatRupee } from '@/utils/settlement';
import { ChevronRight, Phone, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const SHOWN = 5;

function AlertCard({
  label,
  alerts,
  empty,
  href,
  moreLabel,
  icon,
}: {
  label: string;
  alerts: DueAlert[];
  empty: string;
  href: string;
  moreLabel: string;
  icon: ReactNode;
}) {
  const router = useRouter();
  const t = useT();
  const dueLabel = (daysUntil: number): string => {
    const days = Math.abs(daysUntil);
    if (daysUntil < 0) return `${days} ${t(days === 1 ? 'day overdue' : 'days overdue')}`;
    if (daysUntil === 0) return t('Due today');
    return `${t('Due in')} ${daysUntil} ${t(daysUntil === 1 ? 'day' : 'days')}`;
  };
  const shown = alerts.slice(0, SHOWN);
  return (
    <Card variant="lowest" padding="md" className={alerts.length > 0 ? 'bg-tertiary/5' : undefined}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant truncate">{label}</span>
        </div>
        <span className="text-2xl font-extrabold font-display text-on-surface">{alerts.length === 0 ? t('None') : alerts.length}</span>
      </div>
      {alerts.length === 0 ? (
        <p className="mt-2 text-xs text-on-surface-variant">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-surface-container-low">
          {shown.map((alert) => (
            <li key={alert.id}>
              <button
                type="button"
                onClick={() => router.push(alert.href)}
                className="w-full flex items-center justify-between gap-3 py-2 text-left hover:text-primary"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-on-surface truncate">{alert.name}</span>
                  <span className="block text-[11px] text-on-surface-variant">{dueLabel(alert.daysUntil)}</span>
                </span>
                <span className="flex items-center gap-1 shrink-0 text-sm font-bold font-display text-on-surface">
                  ₹{formatRupee(alert.amount)}
                  <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {alerts.length > SHOWN && (
        <button type="button" onClick={() => router.push(href)} className="mt-2 text-xs font-bold text-primary">
          {moreLabel} ({alerts.length - SHOWN})
        </button>
      )}
    </Card>
  );
}

export function PaymentAlerts({
  vendorAlerts,
  customerAlerts,
}: {
  vendorAlerts: DueAlert[];
  customerAlerts: DueAlert[];
}) {
  const t = useT();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AlertCard
        label={t('Vendor payments due soon')}
        alerts={vendorAlerts}
        empty={t('No vendor payment dates in the alert window')}
        href="/vendors"
        moreLabel={t('See all vendors')}
        icon={<Wallet className="w-5 h-5 text-tertiary" />}
      />
      <AlertCard
        label={t('Customers to call')}
        alerts={customerAlerts}
        empty={t('No credit terms closing in the alert window')}
        href="/customers"
        moreLabel={t('See all customers')}
        icon={<Phone className="w-5 h-5 text-tertiary" />}
      />
    </div>
  );
}
