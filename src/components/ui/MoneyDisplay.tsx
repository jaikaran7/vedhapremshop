import { formatMoney } from '@/pages/Reports/format';

interface MoneyDisplayProps {
  amount: number | null | undefined;
  type: 'revenue' | 'cost' | 'receivable' | 'payable' | 'profit' | 'loss' | 'neutral';
  size?: 'sm' | 'base' | 'lg' | 'xl';
  showBackground?: boolean;
}

export function MoneyDisplay({ amount, type, size = 'base', showBackground = false }: MoneyDisplayProps) {
  if (amount == null || !Number.isFinite(amount)) {
    return <span className="text-on-surface-variant">—</span>;
  }

  const colorClasses = {
    revenue: showBackground ? 'text-success bg-success/10' : 'text-success',
    cost: showBackground ? 'text-danger bg-danger/10' : 'text-danger',
    receivable: 'text-tertiary font-bold',
    payable: 'text-danger/70',
    profit: 'text-success font-extrabold',
    loss: 'text-danger font-extrabold',
    neutral: 'text-on-surface',
  }[type];

  const sizeClasses = {
    sm: 'text-xs',
    base: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  }[size];

  const paddingClass = showBackground ? 'px-2 py-1 rounded' : '';

  return (
    <span className={`${colorClasses} ${sizeClasses} ${paddingClass} whitespace-nowrap font-semibold`}>
      {formatMoney(amount)}
    </span>
  );
}
