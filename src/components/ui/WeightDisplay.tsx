interface WeightDisplayProps {
  kg: number | null | undefined;
  type?: 'received' | 'sold' | 'stock' | 'neutral';
  size?: 'sm' | 'base' | 'lg';
}

export function WeightDisplay({ kg, type = 'neutral', size = 'base' }: WeightDisplayProps) {
  if (kg == null || !Number.isFinite(kg)) {
    return <span className="text-on-surface-variant">—</span>;
  }

  const colorClasses = {
    received: 'text-primary',
    sold: 'text-tertiary',
    stock: 'text-on-surface font-extrabold',
    neutral: 'text-on-surface',
  }[type];

  const sizeClasses = {
    sm: 'text-xs',
    base: 'text-sm',
    lg: 'text-base',
  }[size];

  return (
    <span className={`${colorClasses} ${sizeClasses} whitespace-nowrap`}>
      <span className="font-semibold">{kg.toLocaleString('en-IN')}</span>
      <span className="text-on-surface-variant text-xs ml-1">KG</span>
    </span>
  );
}
