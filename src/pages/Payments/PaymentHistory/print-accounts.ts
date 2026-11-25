import { A4_BASE_CSS, escapeHtml as esc, printA4Html } from '@/components/print/a4';
import { dayMonthYear } from '@/components/print/thermal';
import { formatRupee } from '@/utils/settlement';

export interface AccountsPrintRow {
  /** yyyy-mm-dd */
  date: string;
  /** Receipt number, or blank. */
  reference: string;
  /** Who paid or was paid, or the kind of expense. */
  particulars: string;
  /** Smaller second line: the cheque or UTR reference, the account paid from. */
  detail: string;
  method: string;
  /** Money in (a refund is negative). Zero on a payment out. */
  received: number;
  /** Money out. Zero on a receipt. */
  paidOut: number;
}

export interface AccountsPrintOptions {
  rows: AccountsPrintRow[];
  shopName: string;
  /** What the list was narrowed to, e.g. "Collections · Cash". */
  filterNote?: string;
  from?: string;
  to?: string;
  printedAt: Date;
}

const A4_CSS = `${A4_BASE_CSS}
.sums { display: flex; gap: 8px; margin: 0 0 10px; }
.sum { flex: 1; border: 1px solid #000; padding: 6px 9px; }
.sum span { display: block; font-size: 9.5px; text-transform: uppercase; letter-spacing: .04em; }
.sum b { display: block; margin-top: 2px; font-size: 14px; font-variant-numeric: tabular-nums; }
th.sno, td.sno { width: 5%; text-align: center; }
th.date { width: 11%; text-align: center; }
td.date { text-align: center; white-space: nowrap; }
th.ref { width: 13%; }
th.mode { width: 10%; text-align: center; }
td.mode { text-align: center; font-size: 10px; }
th.in, th.out { width: 14%; text-align: right; }
.detail { display: block; margin-top: 1px; font-weight: 400; font-size: 9.5px; color: #333; }
`;

function periodText(from?: string, to?: string): string {
  if (!from && !to) return 'All dates';
  if (from === to) return esc(dayMonthYear(from ?? ''));
  return `${from ? esc(dayMonthYear(from)) : 'start'} to ${to ? esc(dayMonthYear(to)) : 'today'}`;
}

const amount = (value: number) => (value === 0 ? '' : formatRupee(value));

/** The complete A4 page for the money in and out: one line each, then what came in, what went out and the net. */
export function accountsPrintHtml(options: AccountsPrintOptions): string {
  const { rows, shopName, filterNote, from, to, printedAt } = options;
  const received = rows.reduce((sum, row) => sum + row.received, 0);
  const paidOut = rows.reduce((sum, row) => sum + row.paidOut, 0);
  const net = received - paidOut;
  const printed = `${printedAt.toLocaleDateString('en-GB').replaceAll('/', '-')} ${printedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  const body = rows.map((row, index) => `
    <tr>
      <td class="sno">${index + 1}</td>
      <td class="date">${esc(dayMonthYear(row.date))}</td>
      <td>${esc(row.reference)}</td>
      <td><span class="name">${esc(row.particulars)}</span>${row.detail ? `<span class="detail">${esc(row.detail)}</span>` : ''}</td>
      <td class="mode">${esc(row.method)}</td>
      <td class="r">${amount(row.received)}</td>
      <td class="r">${amount(row.paidOut)}</td>
    </tr>`).join('');
  const table = rows.length === 0
    ? '<p class="empty">No transactions for this view.</p>'
    : `<table>
        <thead><tr><th class="sno">S.No</th><th class="date">Date</th><th class="ref">Receipt no</th><th>Particulars</th><th class="mode">Mode</th><th class="in">Received (₹)</th><th class="out">Paid out (₹)</th></tr></thead>
        <tbody>${body}
          <tr class="total"><td colspan="5" class="r">TOTAL (${rows.length} entries)</td><td class="r">${formatRupee(received)}</td><td class="r">${formatRupee(paidOut)}</td></tr>
        </tbody>
      </table>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Accounts ${periodText(from, to)}</title><style>${A4_CSS}</style></head><body>
    <div class="head">
      <div><div class="shop">${esc(shopName)}</div><h1>Accounts Report</h1></div>
      <div class="meta">Period <b>${periodText(from, to)}</b><br>Printed ${printed}</div>
    </div>
    ${filterNote ? `<p class="note">Showing: ${esc(filterNote)}</p>` : ''}
    <div class="sums">
      <div class="sum"><span>Money received</span><b>₹${formatRupee(received)}</b></div>
      <div class="sum"><span>Money paid out</span><b>₹${formatRupee(paidOut)}</b></div>
      <div class="sum"><span>Net cash flow</span><b>${net < 0 ? '−' : ''}₹${formatRupee(Math.abs(net))}</b></div>
    </div>
    ${table}
  </body></html>`;
}

/** Prints the accounts list on A4. */
export function printAccountsReport(options: AccountsPrintOptions): boolean {
  return printA4Html(accountsPrintHtml(options));
}
