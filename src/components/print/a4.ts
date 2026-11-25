/** Escapes text going into the print page markup. */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The page and header styles every A4 report shares. A report adds its own table rules after this. */
export const A4_BASE_CSS = `
@page { size: A4 portrait; margin: 14mm 12mm 16mm; @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 9px Arial, Helvetica, sans-serif; color: #444; } }
html, body { margin: 0; padding: 0; background: #fff; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; }
.shop { font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
h1 { margin: 2px 0 0; font-size: 20px; font-weight: 800; }
.meta { text-align: right; font-size: 10.5px; line-height: 1.5; }
.note { margin: 0 0 6px; font-size: 10.5px; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
thead { display: table-header-group; }
th { background: #eceff1; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; text-align: left; border: 1px solid #000; padding: 6px 7px; }
td { border: 1px solid #555; padding: 5px 7px; font-size: 11px; vertical-align: middle; overflow-wrap: anywhere; }
tr { page-break-inside: avoid; break-inside: avoid; }
tbody tr:nth-child(even) td { background: #f6f7f8; }
.c { text-align: center; }
.r { text-align: right; font-variant-numeric: tabular-nums; }
.name { font-weight: 700; }
.total td { border-top: 2px solid #000; background: #eceff1 !important; font-weight: 800; font-size: 12px; }
.empty { padding: 24px; text-align: center; }
`;

/** Prints a complete A4 page from a blank frame, so nothing from the screen reaches the paper. */
export function printA4Html(html: string): boolean {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('sandbox', 'allow-modals allow-same-origin');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;height:10px;border:0;';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();
  win.addEventListener('afterprint', () => window.setTimeout(() => frame.remove(), 500));
  win.focus();
  win.print();
  return true;
}
