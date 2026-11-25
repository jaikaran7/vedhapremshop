import { A4_BASE_CSS, escapeHtml as esc, printA4Html } from '@/components/print/a4';
import { dayMonthYear } from '@/components/print/thermal';
import { formatRupee } from '@/utils/settlement';

export interface OutstandingPrintRow {
  code: string;
  name: string;
  lastSaleDate: string | null;
  totalDue: number;
}

export interface OutstandingPrintOptions {
  rows: OutstandingPrintRow[];
  shopName: string;
  /** Shown under the title when the list is narrowed, e.g. "Overdue" or a search. */
  filterNote?: string;
  /** yyyy-mm-dd the balances are as of. */
  asOf: string;
  printedAt: Date;
}

const A4_CSS = `${A4_BASE_CSS}
th.sno, td.sno { width: 9%; text-align: center; }
th.id { width: 12%; }
th.last { width: 19%; text-align: center; }
td.last { text-align: center; white-space: nowrap; }
th.amt { width: 20%; text-align: right; }
`;

/** The complete A4 page for the outstanding list, one row per customer, ending in the total. */
export function outstandingPrintHtml(options: OutstandingPrintOptions): string {
  const { rows, shopName, filterNote, asOf, printedAt } = options;
  const total = rows.reduce((sum, row) => sum + row.totalDue, 0);
  const printed = `${printedAt.toLocaleDateString('en-GB').replaceAll('/', '-')} ${printedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  const body = rows.map((row, index) => `
    <tr>
      <td class="sno">${index + 1}</td>
      <td>${esc(row.code)}</td>
      <td class="name">${esc(row.name)}</td>
      <td class="last">${row.lastSaleDate ? esc(dayMonthYear(row.lastSaleDate)) : '—'}</td>
      <td class="r">${formatRupee(row.totalDue)}</td>
    </tr>`).join('');
  const table = rows.length === 0
    ? '<p class="empty">No outstanding balances for this view.</p>'
    : `<table>
        <thead><tr><th class="sno">S.No</th><th class="id">ID</th><th>Customer name</th><th class="last">Last purchase</th><th class="amt">Outstanding (₹)</th></tr></thead>
        <tbody>${body}
          <tr class="total"><td colspan="4" class="r">TOTAL OUTSTANDING (${rows.length} customers)</td><td class="r">${formatRupee(total)}</td></tr>
        </tbody>
      </table>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Outstanding Report ${esc(dayMonthYear(asOf))}</title><style>${A4_CSS}</style></head><body>
    <div class="head">
      <div><div class="shop">${esc(shopName)}</div><h1>Outstanding Report</h1></div>
      <div class="meta">As on <b>${esc(dayMonthYear(asOf))}</b><br>Printed ${printed}</div>
    </div>
    ${filterNote ? `<p class="note">Showing: ${esc(filterNote)}</p>` : ''}
    ${table}
  </body></html>`;
}

/** Prints the outstanding list on A4. */
export function printOutstandingReport(options: OutstandingPrintOptions): boolean {
  return printA4Html(outstandingPrintHtml(options));
}
