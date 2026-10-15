'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Customer } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PlusCircle } from 'lucide-react';

function matchesCustomer(customer: Customer, query: string): boolean {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  const haystack = [customer.name, customer.marketLocation, customer.address, customer.phone]
    .join(' ')
    .toLowerCase();
  if (haystack.includes(text)) return true;
  const digits = query.replace(/\D/g, '');
  return digits.length >= 3 && customer.phone.replace(/\D/g, '').includes(digits);
}

function customerDetail(customer: Customer): string {
  return [customer.marketLocation, customer.phone].filter(Boolean).join(' · ');
}

export function CustomerSearch({
  customers,
  selected,
  counterSale,
  onSelect,
  onAdd,
  onCounterSale,
}: {
  customers: Customer[];
  selected: Customer | null;
  counterSale: boolean;
  onSelect: (customerId: string) => void;
  onAdd: () => void;
  onCounterSale: () => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const results = useMemo(
    () => customers.filter((customer) => matchesCustomer(customer, query)).slice(0, 8),
    [customers, query],
  );
  const showCounter = !query.trim() || 'counter sale'.includes(query.trim().toLowerCase());
  const optionCount = results.length + (showCounter ? 1 : 0);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    setChanging(false);
    setOpen(false);
    setQuery('');
  }, [selected?.id]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const choose = (customer: Customer) => {
    onSelect(customer.id);
    setQuery('');
    setOpen(false);
    setChanging(false);
  };

  const chooseCounter = () => {
    onCounterSale();
    setQuery('');
    setOpen(false);
    setChanging(false);
  };

  if (selected && !changing) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-surface-container-low p-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            {selected.kind === 'REGULAR' ? 'Regular customer' : 'Wholesale customer'}
          </div>
          <div className="text-base font-bold font-display text-on-surface mt-0.5">{selected.name}</div>
          {customerDetail(selected) && (
            <div className="text-xs text-on-surface-variant mt-0.5">{customerDetail(selected)}</div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {selected.kind !== 'REGULAR' && (
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Outstanding</div>
              <div className="text-base font-extrabold font-display text-on-surface">
                ₹{selected.outstandingAmount.toLocaleString('en-IN')}
              </div>
            </div>
          )}
          <Button type="button" variant="secondary" size="sm" onClick={() => { setChanging(true); setOpen(true); }}>
            Change
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Customer"
            value={query}
            placeholder="Search name, shop, or mobile"
            autoComplete="off"
            onMouseDown={() => setOpen(true)}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setOpen(true);
                setHighlight((index) => Math.min(index + 1, Math.max(optionCount - 1, 0)));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setHighlight((index) => Math.max(index - 1, 0));
              } else if (event.key === 'Enter' && open) {
                event.preventDefault();
                if (showCounter && highlight === 0) chooseCounter();
                else {
                  const customer = results[highlight - (showCounter ? 1 : 0)];
                  if (customer) choose(customer);
                }
              } else if (event.key === 'Escape') {
                setOpen(false);
                if (selected) setChanging(false);
              }
            }}
          />
        </div>
        <Button type="button" variant="secondary" size="md" icon={<PlusCircle className="w-4 h-4" />} onClick={onAdd}>
          Add customer
        </Button>
      </div>
      {counterSale && (
        <p className="text-xs text-on-surface-variant mt-2">Counter sale. No customer name on this bill.</p>
      )}
      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-2xl bg-surface-container-lowest ambient-shadow overflow-hidden">
          {showCounter && (
            <button
              type="button"
              onMouseEnter={() => setHighlight(0)}
              onClick={chooseCounter}
              className={`w-full text-left px-4 py-3 cursor-pointer ${
                highlight === 0 ? 'bg-primary-fixed' : 'bg-surface-container-lowest'
              }`}
            >
              <span className="block text-sm font-bold text-on-surface">Counter sale</span>
              <span className="block text-xs text-on-surface-variant">No customer name on this bill</span>
            </button>
          )}
          {results.length === 0 && !showCounter ? (
            <div className="px-4 py-3 text-sm text-on-surface-variant">No customer matches that search.</div>
          ) : (
            results.map((customer, index) => {
              const optionIndex = index + (showCounter ? 1 : 0);
              return (
                <button
                  key={customer.id}
                  type="button"
                  onMouseEnter={() => setHighlight(optionIndex)}
                  onClick={() => choose(customer)}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 cursor-pointer ${
                    optionIndex === highlight ? 'bg-primary-fixed' : 'bg-surface-container-lowest'
                  }`}
                >
                  <span>
                    <span className="block text-sm font-bold text-on-surface">
                      {customer.name}
                      {customer.kind === 'REGULAR' ? ' · Regular' : ''}
                    </span>
                    <span className="block text-xs text-on-surface-variant">{customerDetail(customer) || 'No mobile'}</span>
                  </span>
                  {customer.kind !== 'REGULAR' && (
                    <span className="text-xs font-bold font-display text-on-surface whitespace-nowrap">
                      Due ₹{customer.outstandingAmount.toLocaleString('en-IN')}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
