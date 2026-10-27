'use client';

import { StatCard } from '@/components/ui/StatCard';
import type { DueAlert } from '@/utils/payment-alerts';
import { Phone, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

function dueLabel(daysUntil: number): string {
  if (daysUntil < 0) return `${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} overdue`;
  if (daysUntil === 0) return 'Due today';
  return `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
}

function AlertCard({
  label,
  alerts,
  empty,
  href,
  icon,
}: {
  label: string;
  alerts: DueAlert[];
  empty: string;
  href: string;
  icon: ReactNode;
}) {
  const router = useRouter();
  const first = alerts[0];
  return (
    <StatCard
      label={label}
      value={alerts.length === 0 ? 'None' : String(alerts.length)}
      subValue={first ? `${first.name} · ${dueLabel(first.daysUntil)}` : empty}
      badge={alerts.length > 0 ? 'Call / pay' : undefined}
      icon={icon}
      onClick={() => router.push(first?.href ?? href)}
      className={alerts.length > 0 ? 'bg-tertiary/5' : undefined}
    />
  );
}

export function PaymentAlerts({
  vendorAlerts,
  customerAlerts,
}: {
  vendorAlerts: DueAlert[];
  customerAlerts: DueAlert[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AlertCard
        label="Vendor payments due soon"
        alerts={vendorAlerts}
        empty="No vendor payment dates in the alert window"
        href="/vendors"
        icon={<Wallet className="w-5 h-5 text-tertiary" />}
      />
      <AlertCard
        label="Customers to call"
        alerts={customerAlerts}
        empty="No credit terms closing in the alert window"
        href="/customers"
        icon={<Phone className="w-5 h-5 text-tertiary" />}
      />
    </div>
  );
}
