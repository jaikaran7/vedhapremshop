'use client';

import { can } from '@/auth/permissions';
import { useRouteId } from '@/hooks/shared/use-route-id';
import { useSession } from '@/store/session/session-provider';
import { buildOutstandingReport } from '@/utils/report-outstanding';
import { lotBelongsToProduct } from '@/utils/products';
import { BookOpen, Package, ReceiptText, Scale, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { formatCount, formatMoney, formatWeight } from '@/pages/Reports/format';
import { useReportData } from '@/pages/Reports/use-report-data';
import { DifferentialReport } from '@/pages/Reports/ReportsHub/DifferentialReport';
import { OpeningBalancesReport } from '@/pages/Reports/ReportsHub/OpeningBalancesReport';
import { OutstandingReport } from '@/pages/Reports/ReportsHub/OutstandingReport';
import { StockReport } from '@/pages/Reports/ReportsHub/StockReport';
import { TotalSalesReport } from '@/pages/Reports/ReportsHub/TotalSalesReport';
import { DailyCashBook } from '@/pages/Reports/ReportsHub/DailyCashBook';
import { CustomerStatement } from '@/pages/Reports/ReportsHub/CustomerStatement';

export function ReportsHub() {
  const reportType = useRouteId('reportType');
  if (reportType === 'outstanding') return <OutstandingReport />;
  if (reportType === 'stock') return <StockReport />;
  if (reportType === 'opening') return <OpeningBalancesReport />;
  if (reportType === 'sales') return <TotalSalesReport />;
  if (reportType === 'differential') return <DifferentialReport />;
  if (reportType === 'cash-book') return <DailyCashBook />;
  if (reportType === 'customer-statement') return <CustomerStatement />;
  if (reportType) {
    return (
      <div className="p-12 text-center">
        <h1 className="text-xl font-bold font-display">Report not found</h1>
        <Link href="/reports" className="inline-block mt-4 text-sm font-bold text-primary">Back to Reports & Analytics</Link>
      </div>
    );
  }
  return <ReportsHome />;
}

function ReportsHome() {
  const { currentUser } = useSession();
  const showProfit = can(currentUser.role, 'viewProfit');
  const data = useReportData();
  const asOf = new Date();
  const month = String(asOf.getMonth() + 1).padStart(2, '0');
  const day = String(asOf.getDate()).padStart(2, '0');
  const today = `${asOf.getFullYear()}-${month}-${day}`;
  const outstanding = useMemo(
    () => data.customers.reduce((sum, customer) => sum + customer.outstandingAmount, 0),
    [data.customers],
  );
  const stockBags = data.lots.reduce((sum, lot) => sum + lot.remainingBags, 0);
  const stockKg = data.lots.reduce((sum, lot) => sum + lot.remainingWeightKg, 0);
  const openingCount = data.ledger.filter((entry) => entry.type === 'OPENING').length
    + data.stockMovements.filter((movement) => movement.type === 'OPENING_STOCK').length;
  const salesAmount = data.sales
    .filter((sale) => sale.status === 'CONFIRMED')
    .reduce((sum, sale) => sum + sale.totalAmount, 0);
  const aged = useMemo(
    () => buildOutstandingReport({
      customers: data.customers,
      sales: data.sales,
      payments: data.payments,
      ledger: data.ledger,
      asOf: today,
    }).length,
    [data.customers, data.ledger, data.payments, data.sales, today],
  );
  const products = data.products.filter((product) => product.status === 'ACTIVE').length;
  const onionLots = data.lots.filter((lot) => {
    const onions = data.products.find((product) => product.code === 'ONIONS');
    return onions ? lotBelongsToProduct(lot, onions) : true;
  }).length;

  const cards = [
    {
      href: '/reports/outstanding',
      title: 'Customer Balances',
      description: 'Money owed to you by each customer, with overdue tracking.',
      value: formatMoney(outstanding),
      hint: `${formatCount(aged)} customers with balance`,
      icon: Wallet,
    },
    {
      href: '/reports/stock',
      title: 'Current Stock',
      description: 'How many bags of each quality grade you have on floor.',
      value: `${formatCount(stockBags)} bags`,
      hint: formatWeight(stockKg),
      icon: Package,
    },
    {
      href: '/reports/opening',
      title: 'Opening Balances',
      description: 'Opening stock and opening customer balances, without later transactions.',
      value: formatCount(openingCount),
      hint: openingCount === 1 ? 'Opening entry' : 'Opening entries',
      icon: BookOpen,
    },
    {
      href: '/reports/sales',
      title: 'Sales Bills Detail',
      description: 'All sales with bags, weight, rate, and payment status.',
      value: formatMoney(salesAmount),
      hint: 'Confirmed bills',
      icon: ReceiptText,
    },
    {
      href: '/reports/differential',
      title: 'Differential Report',
      description: showProfit
        ? 'Lot reconciliation, mark and cost breakdowns, and review alerts.'
        : 'Lot quantities and review alerts. Cost and profit stay hidden for this role.',
      value: `${formatCount(products)} products`,
      hint: `${formatCount(onionLots)} onion consignments`,
      icon: Scale,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">Reports & Analytics</h1>
        <p className="text-xs text-on-surface-variant font-medium mt-1 max-w-2xl">
          Outstanding, stock, opening balances, sales, and consignment differences. Open one report to filter and print it.
        </p>
      </div>
      {data.error && (
        <div className="rounded-2xl bg-danger-container px-4 py-3 text-sm text-danger">Reports could not be loaded. Refresh and try again.</div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-2xl bg-surface-container-lowest ambient-shadow p-5 hover:-translate-y-0.5 hover:shadow-ambient-elevated transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold font-display text-on-surface">{card.value}</div>
                  <div className="text-[10px] text-on-surface-variant">{card.hint}</div>
                </div>
              </div>
              <h2 className="mt-4 text-base font-bold font-display text-on-surface">{card.title}</h2>
              <p className="mt-1 text-xs text-on-surface-variant leading-relaxed">{card.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
