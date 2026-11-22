import React from 'react';

/** 2026-11-22 -> 22-11-2026. Anything that is not a yyyy-mm-dd date is shown as it is. */
export function dayMonthYear(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : date;
}

const FRAME_CSS = `
html, body { margin: 0; padding: 0; background: #fff; }
.vp-thermal { display: block; width: 66mm; box-sizing: border-box; margin: 0 auto; padding: 0; overflow: hidden;
  color: #000; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: 600; line-height: 1.35; }
.vp-thermal * { color: #000; }
`;

/**
 * Prints one thermal document from a blank frame, sized to its content, so the page layout
 * around it can add no white space and the browser has nothing else to put on the paper.
 */
export function printThermal(source: HTMLElement | null): boolean {
  if (!source) return false;
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:80mm;height:10px;border:0;';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    return false;
  }
  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.display = 'block';
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>&#8203;</title><style>${FRAME_CSS}</style></head><body>${clone.outerHTML}</body></html>`);
  doc.close();
  const target = doc.querySelector('.vp-thermal') as HTMLElement | null;
  const mm = target ? Math.ceil((target.getBoundingClientRect().height * 25.4) / 96) : 297;
  const page = doc.createElement('style');
  page.textContent = `@page { size: 80mm ${mm}mm; margin: 0; }`;
  doc.head.appendChild(page);
  win.addEventListener('afterprint', () => window.setTimeout(() => frame.remove(), 500));
  win.focus();
  win.print();
  return true;
}

const THERMAL_CSS = `
        .vp-thermal { position: relative; margin-top: 0 !important; }
        .vp-thermal p { margin: 0; }
        .vp-thermal .vp-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10.5px; }
        .vp-thermal .vp-grid th, .vp-thermal .vp-grid td { border: 1px solid #000; padding: 2px 3px; }
        .vp-thermal .vp-cust { margin-bottom: 2px; }
        .vp-thermal .vp-table.vp-cust th { width: 24% !important; text-align: left; font-size: 9px; }
        .vp-thermal .vp-cust td { white-space: normal; overflow-wrap: anywhere; }
        .vp-thermal .vp-table th { font-size: 9px; font-weight: 900; text-align: right; }
        .vp-thermal .vp-table td { text-align: right; padding: 2px 3px; white-space: nowrap; font-weight: 700; }
        .vp-thermal .vp-table .vp-l { text-align: left; }
        .vp-thermal .vp-table th:nth-child(1) { width: 22%; }
        .vp-thermal .vp-table th:nth-child(2) { width: 12%; }
        .vp-thermal .vp-table th:nth-child(3) { width: 20%; }
        .vp-thermal .vp-table th:nth-child(4) { width: 15%; }
        .vp-thermal .vp-table th:nth-child(5) { width: 31%; }
        .vp-thermal .vp-stock-item { padding-bottom: 3px; margin-bottom: 4px; border-bottom: 1px dashed #000; }
        .vp-thermal .vp-stock-head { font-size: 14px; font-weight: 900; }
        .vp-thermal .vp-stmt { font-size: 10.5px; }
        .vp-thermal .vp-stmt th, .vp-thermal .vp-stmt td { padding: 2px 1px; white-space: normal; overflow-wrap: anywhere; }
        .vp-thermal .vp-stmt tbody td { border-bottom: 1px dashed #000; }
        .vp-thermal .vp-table.vp-stmt th:nth-child(1) { width: 25%; }
        .vp-thermal .vp-table.vp-stmt th:nth-child(2) { width: 25%; }
        .vp-thermal .vp-table.vp-stmt th:nth-child(3) { width: 25%; }
        .vp-thermal .vp-table.vp-stmt th:nth-child(4) { width: 25%; }
        .vp-thermal .vp-table tfoot td { border-top: 2px solid #000; font-weight: 900; }
        .vp-thermal .vp-radhe { font-family: "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif; font-style: italic; font-weight: 900; text-align: center; line-height: 1.15; font-size: 21px; margin-bottom: 2px; }
        .vp-thermal .vp-jai { font-family: "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif; font-style: italic; font-weight: 900; font-size: 17px; text-align: center; line-height: 1.2; }
        .vp-thermal .vp-flute { display: block; width: 36mm; height: 4.3mm; margin: 1px auto 0; }
        .vp-thermal .vp-tag { font-size: 9.5px; font-weight: 900; text-align: center; margin: 0 0 1px; }
        .vp-thermal .vp-addr { font-size: 10px; font-weight: 700; text-align: center; }
        .vp-thermal .vp-address { font-size: 12.5px; font-weight: 900; line-height: 1.2; margin-bottom: 1px; }
        .vp-thermal .vp-phones { font-size: 11px; font-weight: 900; }
        .vp-thermal .vp-shop { font-size: 26px; letter-spacing: 3px; line-height: 1.1; font-weight: 900; text-align: center; margin: 0 0 3px; }
        .vp-thermal .vp-rule-solid { border-top: 2px solid #000; margin: 4px 0; }
        .vp-thermal .vp-section { font-weight: 900; text-align: center; border-top: 2px solid #000; border-bottom: 1px solid #000; padding: 2px 0; margin: 6px 0 3px; letter-spacing: 1px; }
        .vp-thermal .vp-row { display: flex; justify-content: space-between; gap: 6px; }
        .vp-thermal .vp-row > span:first-child { min-width: 0; overflow-wrap: anywhere; }
        .vp-thermal .vp-sub { font-size: 10px; font-weight: 600; margin: -1px 0 2px; }
        .vp-thermal .vp-row > span:last-child { text-align: right; white-space: nowrap; }
        .vp-thermal .vp-b { font-weight: 800; }
        .vp-thermal .vp-customer { font-size: 15px; font-weight: 900; text-align: center; margin: 2px 0 3px; word-break: break-word; }
        .vp-thermal .vp-grand { border-top: 2px solid #000; border-bottom: 2px solid #000; margin: 5px 0; padding: 3px 0; font-size: 17px; font-weight: 900; }
        .vp-thermal .vp-center { text-align: center; }
        .vp-thermal .vp-thanks { font-size: 15px; font-weight: 900; text-align: center; }
`;

/**
 * The shop header and footer around a thermal document. It stays hidden on screen and is
 * copied into a blank frame when printed, so the app page around it never reaches the paper.
 */
export const ThermalDoc = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(function ThermalDoc({ children }, ref) {
  return (
    <div className="vp-thermal" ref={ref} style={{ display: 'none' }}>
      <p className="vp-radhe">|| Radhe Radhe ||</p>
      <p className="vp-shop">PKS</p>
      <p className="vp-addr vp-address">Shop B-2 Grain, AMC Market Yard, Bowenpally</p>
      <p className="vp-tag">ONIONS • POTATO • GINGER • GARLIC</p>
      <p className="vp-addr vp-phones">Sai Krishna - 9391581641</p>
      <p className="vp-addr vp-phones">Thirupathi - 8885556361</p>
      <div className="vp-rule-solid" />
      {children}
      <div className="vp-rule-solid" />
      <p className="vp-thanks">Thank You!</p>
      <p className="vp-jai">Jai Shree Krishna</p>
      <svg className="vp-flute" viewBox="0 0 200 24" aria-hidden="true">
        <g transform="rotate(-4 100 12)">
          <rect x="4" y="6" width="192" height="12" rx="6" fill="none" stroke="#000" strokeWidth="3" />
          <path d="M26 6 L26 18 M174 6 L174 18" stroke="#000" strokeWidth="3" />
          <ellipse cx="50" cy="12" rx="5" ry="3" fill="#000" />
          <circle cx="88" cy="12" r="3.2" fill="#000" />
          <circle cx="106" cy="12" r="3.2" fill="#000" />
          <circle cx="124" cy="12" r="3.2" fill="#000" />
          <circle cx="142" cy="12" r="3.2" fill="#000" />
          <circle cx="160" cy="12" r="3.2" fill="#000" />
        </g>
      </svg>
      <style>{THERMAL_CSS}</style>
    </div>
  );
});

/** A label on the left and a right-aligned amount, the way every line of the receipt is laid out. */
export function ThermalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <p className={bold ? 'vp-row vp-b' : 'vp-row'}><span>{label}</span><span>{value}</span></p>;
}
