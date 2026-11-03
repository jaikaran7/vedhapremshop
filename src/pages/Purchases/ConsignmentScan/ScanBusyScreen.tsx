'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  title: string;
  detail: string;
}

/** Covers the whole window until a consignment read or save finishes. */
export const ScanBusyScreen: React.FC<Props> = ({ title, detail }) => {
  const [mounted, setMounted] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const holdFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      event.preventDefault();
      panel.current?.focus();
    };
    document.addEventListener('keydown', holdFocus);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', holdFocus);
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={panel}
      className="scan-busy fixed inset-0 z-[80] flex overflow-y-auto bg-surface/95 px-6 py-8 backdrop-blur-md outline-none"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-labelledby="scan-busy-title"
      aria-describedby="scan-busy-detail"
      tabIndex={-1}
    >
      <div className="m-auto w-full max-w-[22rem]">
        <div className="relative mx-auto h-48 w-40" aria-hidden="true">
          <div className="scan-busy-back absolute inset-0 rounded-lg bg-tertiary-container shadow-ambient-sm">
            <div className="absolute right-3 top-7 h-1 w-10 rounded-full bg-tertiary/40" />
            <div className="absolute right-5 top-11 h-1 w-7 rounded-full bg-tertiary/30" />
            <div className="absolute right-3 top-14 h-1 w-12 rounded-full bg-tertiary/25" />
          </div>
          <div className="scan-busy-sheet absolute inset-0 overflow-hidden rounded-lg bg-surface-container-lowest shadow-ambient-elevated">
            <div className="mx-3 mt-4 h-2.5 rounded-sm bg-primary" />
            <div className="mx-3 mt-3 space-y-2.5">
              <div className="h-1.5 rounded-full bg-surface-container-high" />
              <div className="h-1.5 w-4/5 rounded-full bg-surface-container" />
              <div className="h-1.5 rounded-full bg-surface-container-high" />
              <div className="h-1.5 w-3/5 rounded-full bg-surface-container" />
              <div className="h-1.5 rounded-full bg-surface-container-high" />
            </div>
            <div className="mx-3 mt-4 h-px bg-surface-container-highest" />
            <div className="mx-3 mt-3 h-2 w-2/5 rounded-full bg-on-surface" />
            <div className="scan-busy-beam" />
          </div>
        </div>
        <h2 id="scan-busy-title" className="mt-8 font-display text-[1.35rem] font-bold leading-tight text-on-surface">
          {title}
        </h2>
        <p id="scan-busy-detail" className="mt-2 max-w-[36ch] text-sm leading-relaxed text-on-surface-variant">
          {detail}
        </p>
        <div className="scan-busy-track mt-6" aria-hidden="true">
          <div className="scan-busy-fill" />
        </div>
      </div>
    </div>,
    document.body,
  );
};
