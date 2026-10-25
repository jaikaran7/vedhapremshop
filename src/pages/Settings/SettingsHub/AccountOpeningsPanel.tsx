'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useSetAccountOpeningMutation } from '@/hooks/mutations/use-payment-mutations';
import { useCashAccountsQuery } from '@/hooks/queries/use-expenses-query';
import { TRADING_SESSION_DATE } from '@/constants/session';
import type { CashAccount } from '@/types';

function AccountRow({ account }: { account: CashAccount }) {
  const { toast } = useToast();
  const save = useSetAccountOpeningMutation();
  const [balance, setBalance] = useState(String(account.openingBalance ?? 0));
  const [date, setDate] = useState(account.openingDate ?? TRADING_SESSION_DATE);
  useEffect(() => {
    setBalance(String(account.openingBalance ?? 0));
    setDate(account.openingDate ?? TRADING_SESSION_DATE);
  }, [account.openingBalance, account.openingDate]);

  const amount = Number(balance);
  const valid = balance.trim() !== '' && Number.isFinite(amount) && Math.round(amount * 100) / 100 === amount && /^\d{4}-\d{2}-\d{2}$/.test(date);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) {
      toast({ type: 'error', title: 'Check the opening balance', message: 'Enter an amount (at most two decimals) and a date.' });
      return;
    }
    try {
      await save.mutateAsync({ id: account.id, openingBalance: amount, openingDate: date });
      toast({ type: 'success', title: `${account.name} saved`, message: `Opens at ₹${amount.toLocaleString('en-IN')} on ${date}. Balances carry forward from there.` });
    } catch (error) {
      toast({ type: 'error', title: 'Not saved', message: error instanceof Error ? error.message : 'The opening balance could not be saved' });
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end rounded-2xl bg-surface-container-low p-4">
      <div>
        <span className="text-xs font-bold text-on-surface block">{account.name}</span>
        <span className="text-[11px] text-on-surface-variant">{account.kind === 'CASH' ? 'Cash in hand' : account.kind === 'BANK' ? 'Bank account' : 'UPI account'}</span>
      </div>
      <Input label="Real balance" inputMode="decimal" prefixText="₹" value={balance} onChange={(e) => setBalance(e.target.value.replace(/[^\d.-]/g, ''))} />
      <Input label="True at the start of" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <Button type="submit" variant="primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
    </form>
  );
}

/** Owner only: what is really in each account when you start using the system. */
export const AccountOpeningsPanel: React.FC = () => {
  const { data: accounts = [] } = useCashAccountsQuery();
  return (
    <Card variant="lowest" className="space-y-4">
      <div>
        <h3 className="text-base font-bold font-display text-on-surface">Cash, Bank & UPI Opening Balances</h3>
        <p className="text-xs text-on-surface-variant font-medium mt-1">
          Enter the real money in each account at the start of a day. After that, every collection and expense moves the balance,
          and each day&apos;s closing balance becomes the next day&apos;s opening. An expense entered later for an earlier day readjusts every day after it.
          Only the Owner sees these balances.
        </p>
      </div>
      <div className="space-y-3">
        {accounts.map((account) => <AccountRow key={account.id} account={account} />)}
      </div>
    </Card>
  );
};
