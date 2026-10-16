interface BagCountProps {
  bags: number | null | undefined;
  type?: 'received' | 'sold' | 'stock' | 'neutral';
  asChip?: boolean;
}

export function BagCount({ bags, type = 'neutral', asChip = false }: BagCountProps) {
  if (bags == null || !Number.isFinite(bags)) {
    return <span className="text-on-surface-variant">—</span>;
  }

  const colorClasses = {
    received: 'text-primary',
    sold: 'text-tertiary',
    stock: 'text-on-surface font-extrabold',
    neutral: 'text-on-surface',
  }[type];

  const bgClasses = {
    received: 'bg-primary/10',
    sold: 'bg-tertiary/10',
    stock: 'bg-surface-container',
    neutral: 'bg-surface-container-low',
  }[type];

  if (asChip) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${colorClasses} ${bgClasses}`}>
        {bags.toLocaleString('en-IN')} bags
      </span>
    );
  }

  return (
    <span className={`${colorClasses} font-semibold`}>
      {bags.toLocaleString('en-IN')}
    </span>
  );
}
