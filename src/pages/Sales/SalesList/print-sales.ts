import { A4_BASE_CSS, escapeHtml as esc, printA4Html } from '@/components/print/a4';
import { dayMonthYear } from '@/components/print/thermal';
import { formatRupee } from '@/utils/settlement';

/** One bill, or one product on a bill, as a single printed line. */
export interface SalesPrintRow {
  /** yyyy-mm-dd; the rows of one date print under one centered heading. */
  date: string;
  billNumber: string;
  customerName: string;
  product: string;
  /** The qualities sold on this line, already without the lot code, e.g. ["AK", "A"]. Each prints on its own line. */
  marks: string[];
  /** The bags of each quality in the same order, e.g. [4, 1], printed beside its mark. */
  bagsByMark: number[];
  totalBags: number;
  totalWeightKg: number;
  /** Shown only when the report asks for it: a single rate, or a range when the lines differ. */
  rate?: string;
  totalAmount: number;
}

export interface SalesPrintOptions {
  rows: SalesPrintRow[];
  shopName: string;
  /** "Sales & Weighment Report", "Total Sales Report" … */
  title: string;
  /** What the amount column holds, shown under the title. */
  amountNote?: string;
  /** What the list was narrowed to, e.g. "Cash · Onions". */
  filterNote?: string;
  from?: string;
  to?: string;
  showRate?: boolean;
  /** Printed once under the grand total: how much came in each way and how much is still on credit. */
  paymentSummary?: { label: string; amount: number }[];
  printedAt: Date;
}

const A4_CSS = `${A4_BASE_CSS}
th.bill { width: 11%; }
th.prod { width: 12%; }
th.mark { width: 17%; }
th.bags { width: 10%; text-align: right; }
th.kg { width: 11%; text-align: right; }
th.rate { width: 9%; text-align: right; }
th.amt { width: 13%; text-align: right; }
td.mark { font-weight: 700; }
tr.day td { background: #fff !important; border: 0; border-bottom: 2px solid #000; padding: 12px 0 4px; text-align: center; font-size: 13px; font-weight: 800; letter-spacing: .03em; }
tr.day { break-after: avoid; page-break-after: avoid; }
table.pay { width: 56%; margin: 14px 0 0 auto; break-inside: avoid; page-break-inside: avoid; }
table.pay th { text-align: left; }
table.pay th.r { text-align: right; }
table.pay td { font-size: 11.5px; }
tr.sub td { background: #f1f3f4 !important; font-weight: 700; font-size: 10.5px; }
`;

/** How many marks fit on one printed line. The Mark and Bags cells use the same number, so a wrapped count stays beside its mark. */
function perLine(marks: string[]): number {
  const longest = Math.max(0, ...marks.map((mark) => mark.length));
  if (longest <= 3) return 4;
  return longest <= 5 ? 3 : 2;
}

/** Entries separated by commas, filling a line before starting the next one. A comma ends every full line. */
function commaLines(entries: string[], size: number): string {
  const lines: string[] = [];
  for (let start = 0; start < entries.length; start += size) lines.push(entries.slice(start, start + size).map(esc).join(', '));
  return lines.map((text, index) => `<div class="ln">${text}${index < lines.length - 1 ? ',' : ''}</div>`).join('');
}

const kg = (value: number) => (Math.round(value * 100) / 100).toLocaleString('en-IN');

function periodText(from?: string, to?: string): string {
  if (!from && !to) return 'All dates';
  if (from === to) return esc(dayMonthYear(from ?? ''));
  return `${from ? esc(dayMonthYear(from)) : 'start'} to ${to ? esc(dayMonthYear(to)) : 'today'}`;
}

function sum(rows: SalesPrintRow[]) {
  return {
    bags: rows.reduce((total, row) => total + row.totalBags, 0),
    weight: rows.reduce((total, row) => total + row.totalWeightKg, 0),
    amount: rows.reduce((total, row) => total + row.totalAmount, 0),
  };
}

/** Oldest date first, and the bills of a day in the order they were numbered, like a register. */
function byDay(rows: SalesPrintRow[]): [string, SalesPrintRow[]][] {
  const days = new Map<string, SalesPrintRow[]>();
  for (const row of rows) days.set(row.date, [...(days.get(row.date) ?? []), row]);
  return [...days.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, list]) => [date, list.sort((a, b) => a.billNumber.localeCompare(b.billNumber, undefined, { numeric: true }))]);
}

/**
 * The complete A4 page: each date is a centered heading with a rule under it, then one line per bill
 * (customer, product, quality, bags, weight, amount), a total for the day, and a grand total at the end.
 */
export function salesPrintHtml(options: SalesPrintOptions): string {
  const { rows, shopName, title, amountNote, filterNote, from, to, showRate = false, paymentSummary = [], printedAt } = options;
  const columns = showRate ? 8 : 7;
  const printed = `${printedAt.toLocaleDateString('en-GB').replaceAll('/', '-')} ${printedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  const days = byDay(rows);
  const line = (row: SalesPrintRow) => `
    <tr>
      <td>${esc(row.billNumber)}</td>
      <td class="name">${esc(row.customerName)}</td>
      <td>${esc(row.product)}</td>
      <td class="mark">${commaLines(row.marks, perLine(row.marks))}</td>
      <td class="r">${commaLines(row.bagsByMark.map(String), perLine(row.marks))}</td>
      <td class="r">${kg(row.totalWeightKg)}</td>
      ${showRate ? `<td class="r">${esc(row.rate ?? '')}</td>` : ''}
      <td class="r">${formatRupee(row.totalAmount)}</td>
    </tr>`;
  const body = days.map(([date, list]) => {
    const day = sum(list);
    return `
    <tr class="day"><td colspan="${columns}">${esc(dayMonthYear(date))}</td></tr>
    ${list.map(line).join('')}
    <tr class="sub"><td colspan="4" class="r">Day total (${list.length})</td><td class="r">${day.bags}</td><td class="r">${kg(day.weight)}</td>${showRate ? '<td></td>' : ''}<td class="r">${formatRupee(day.amount)}</td></tr>`;
  }).join('');
  const all = sum(rows);
  const head = `<tr><th class="bill">Bill no</th><th style="width:${showRate ? 18 : 27}%">Customer</th><th class="prod">Product</th><th class="mark">Mark</th><th class="bags">Bags</th><th class="kg">Weight (kg)</th>${showRate ? '<th class="rate">Rate/kg</th>' : ''}<th class="amt">Amount (₹)</th></tr>`;
  const summary = paymentSummary.filter((entry) => entry.amount > 0);
  const paymentTable = summary.length === 0 ? '' : `
    <table class="pay">
      <thead><tr><th>Payment summary</th><th class="r">Amount (₹)</th></tr></thead>
      <tbody>${summary.map((entry) => `<tr><td class="name">${esc(entry.label)}</td><td class="r">${formatRupee(entry.amount)}</td></tr>`).join('')}</tbody>
    </table>`;
  const table = rows.length === 0
    ? '<p class="empty">No bills for this view.</p>'
    : `<table>
        <thead>${head}</thead>
        <tbody>${body}
          <tr class="total"><td colspan="4" class="r">GRAND TOTAL (${rows.length} ${rows.length === 1 ? 'line' : 'lines'})</td><td class="r">${all.bags}</td><td class="r">${kg(all.weight)}</td>${showRate ? '<td></td>' : ''}<td class="r">${formatRupee(all.amount)}</td></tr>
        </tbody>
      </table>${paymentTable}`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} ${periodText(from, to)}</title><style>${A4_CSS}</style></head><body>
    <div class="head">
      <div><div class="shop">${esc(shopName)}</div><h1>${esc(title)}</h1></div>
      <div class="meta">Dates <b>${periodText(from, to)}</b><br>Printed ${printed}</div>
    </div>
    ${filterNote ? `<p class="note">Showing: ${esc(filterNote)}</p>` : ''}
    ${amountNote ? `<p class="note">${esc(amountNote)}</p>` : ''}
    ${table}
  </body></html>`;
}

/** Prints the bills on A4. */
export function printSalesReport(options: SalesPrintOptions): boolean {
  return printA4Html(salesPrintHtml(options));
}
