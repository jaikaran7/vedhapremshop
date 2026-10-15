'use client';

import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { lotBelongsToProduct } from '@/utils/products';
import { salePaymentStatus } from '@/utils/report-metrics';
import Link from 'next/link';
import { useMemo } from 'react';
import { formatCount, formatMoney, formatWeight } from '@/pages/Reports/format';
import { downloadCsv, inDateRange, useReportQuery } from '@/pages/Reports/report-query';
import { useReportData } from '@/pages/Reports/use-report-data';
import { EmptyNote, FilterBar, ReportFrame, SummaryStrip, TablePager, usePagedRows } from '@/pages/Reports/ReportChrome';

interface SalesLine {
  id: string;
  saleId: string;
  billNumber: string;
  date: string;
  customer: string;
  product: string;
  lotNumber: string;
  mark: string;
  bags: number;
  weightKg: number;
  rate: number;
  amount: number;
  paymentStatus: string;
}

export function TotalSalesReport() {
  const data = useReportData();
  const { filters, setFilter, clear } = useReportQuery();
  const product = data.products.find((item) => item.id === filters.product);
  const lines = useMemo(() => {
    const query = filters.q.trim().toLowerCase();
    const rows: SalesLine[] = [];
    data.sales
      .filter((sale) => sale.status !== 'CANCELLED' && inDateRange(sale.date, filters.from, filters.to))
      .forEach((sale) => {
        sale.items.forEach((item) => {
          const lot = data.lots.find((entry) => entry.lotNumber.toUpperCase() === item.lotNumber.toUpperCase());
          const named = lot
            ? data.products.find((entry) => lotBelongsToProduct(lot, entry))
            : data.products.find((entry) => entry.id === sale.productId);
          const matchesProduct = !product
            || (lot ? lotBelongsToProduct(lot, product) : sale.productId ? sale.productId === product.id : product.code === 'ONIONS');
          if (!matchesProduct) return;
          const productName = named?.name ?? sale.productName ?? 'Onions';
          const haystack = `${sale.billNumber} ${sale.customerName} ${productName} ${item.lotNumber} ${item.markCode}`.toLowerCase();
          if (query && !haystack.includes(query)) return;
          rows.push({
            id: `${sale.id}-${item.id}`,
            saleId: sale.id,
            billNumber: sale.billNumber,
            date: sale.date,
            customer: sale.customerName,
            product: productName,
            lotNumber: item.lotNumber,
            mark: item.markCode,
            bags: item.bags,
            weightKg: item.weightKg,
            rate: item.ratePerKg,
            amount: item.amount,
            paymentStatus: salePaymentStatus(sale),
          });
        });
      });
    return rows.sort((left, right) => right.date.localeCompare(left.date) || right.billNumber.localeCompare(left.billNumber));
  }, [data.lots, data.products, data.sales, filters.from, filters.q, filters.to, product]);
  const page = usePagedRows(lines, `${filters.product}|${filters.from}|${filters.to}|${filters.q}`);
  const totals = {
    bags: lines.reduce((sum, line) => sum + line.bags, 0),
    kg: lines.reduce((sum, line) => sum + line.weightKg, 0),
    amount: lines.reduce((sum, line) => sum + line.amount, 0),
  };

  return (
    <ReportFrame
      title="Total Sales Report"
      description="Confirmed sale lines for the selected dates and product. Each row is one lot and mark on a bill."
      onExport={() => downloadCsv('sales-report.csv', ['Bill', 'Date', 'Customer', 'Product', 'Lot', 'Mark', 'Bags', 'KG', 'Rate', 'Amount', 'Payment'], lines.map((line) => [
        line.billNumber, line.date, line.customer, line.product, line.lotNumber, line.mark, line.bags, line.weightKg, line.rate, line.amount, line.paymentStatus,
      ]))}
    >
      <FilterBar
        product={filters.product}
        products={data.products.filter((item) => item.status === 'ACTIVE').map((item) => ({ value: item.id, label: item.name }))}
        productPlaceholder="All products"
        onProduct={(value) => setFilter('product', value)}
        from={filters.from}
        to={filters.to}
        onFrom={(value) => setFilter('from', value)}
        onTo={(value) => setFilter('to', value)}
        search={filters.q}
        onSearch={(value) => setFilter('q', value)}
        searchPlaceholder="Bill, customer, lot, or mark"
        onClear={() => clear()}
      />
      <SummaryStrip
        items={[
          { label: 'Lines', value: formatCount(lines.length) },
          { label: 'Bags', value: formatCount(totals.bags) },
          { label: 'Actual KG', value: formatWeight(totals.kg) },
          { label: 'Sales amount', value: formatMoney(totals.amount), hint: 'Product amount' },
        ]}
      />
      {lines.length === 0 ? (
        <EmptyNote title="No sales" message="No confirmed sale lines match these dates, this product, or the search." />
      ) : (
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[64rem]">
              <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
                <tr>
                  {['Bill', 'Date', 'Customer', 'Product', 'Lot', 'Mark', 'Bags', 'Actual KG', 'Rate', 'Sales amount', 'Payment'].map((label) => (
                    <th key={label} className="py-3 px-3">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {page.rows.map((line) => (
                  <tr key={line.id} className="hover:bg-surface-container-low/40">
                    <td className="py-3 px-3 font-bold text-primary">
                      <Link href={`/sales/${line.saleId}`}>{line.billNumber}</Link>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">{line.date}</td>
                    <td className="py-3 px-3 font-semibold">{line.customer}</td>
                    <td className="py-3 px-3">{line.product}</td>
                    <td className="py-3 px-3">{line.lotNumber}</td>
                    <td className="py-3 px-3 font-semibold">{line.mark}</td>
                    <td className="py-3 px-3 text-right">{formatCount(line.bags)}</td>
                    <td className="py-3 px-3 text-right">{formatWeight(line.weightKg)}</td>
                    <td className="py-3 px-3 text-right">₹{line.rate.toLocaleString('en-IN')}/KG</td>
                    <td className="py-3 px-3 text-right font-bold">{formatMoney(line.amount)}</td>
                    <td className="py-3 px-3">
                      <Chip label={line.paymentStatus} size="sm" variant={line.paymentStatus === 'PAID' ? 'success' : line.paymentStatus === 'PARTIAL' ? 'tertiary' : 'secondary'} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-container-low/60 font-bold">
                <tr>
                  <td className="py-3 px-3" colSpan={6}>Totals</td>
                  <td className="py-3 px-3 text-right">{formatCount(totals.bags)}</td>
                  <td className="py-3 px-3 text-right">{formatWeight(totals.kg)}</td>
                  <td />
                  <td className="py-3 px-3 text-right">{formatMoney(totals.amount)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <TablePager page={page.page} pages={page.pages} total={page.total} onPage={page.setPage} />
        </Card>
      )}
    </ReportFrame>
  );
}
