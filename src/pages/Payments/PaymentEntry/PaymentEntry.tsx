'use client';

import { useSession } from '@/store/session/session-provider';
import { useCustomersQuery } from '@/hooks/queries/use-customers-query';
import { useRecordPaymentMutation } from '@/hooks/mutations/use-payment-mutations';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumberField } from '@/components/ui/NumberField';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { 
  ArrowLeft, CreditCard, CheckCircle2, IndianRupee, 
  QrCode, ArrowDownLeft 
} from 'lucide-react';

export const PaymentEntry: React.FC = () => {
  const { currentUser } = useSession();
  const { data: customers = [] } = useCustomersQuery();
  const recordPaymentMutation = useRecordPaymentMutation();
  const recordPayment = (data: Parameters<typeof recordPaymentMutation.mutateAsync>[0]) => recordPaymentMutation.mutateAsync(data);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const preCustomerId = searchParams?.get('customerId') || (customers[0]?.id || '');
  const [customerId, setCustomerId] = useState(preCustomerId);
  const [amount, setAmount] = useState<number>(50000);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE'>('UPI');
  const [referenceNumber, setReferenceNumber] = useState('UPI/628109481/HDFC');
  const [notes, setNotes] = useState('Payment against pending onion consignments');

  const customer = customers.find(c => c.id === customerId);
  const prevOutstanding = customer ? customer.outstandingAmount : 0;
  const newOutstanding = Math.max(0, prevOutstanding - Number(amount || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) {
      toast({ type: 'error', title: 'Customer Required', message: 'Please select a customer' });
      return;
    }

    if (Number(amount) <= 0) {
      toast({ type: 'error', title: 'Invalid Amount', message: 'Payment amount must be greater than zero' });
      return;
    }

    const created = await recordPayment({
      customerId: customer.id,
      amount: Number(amount),
      paymentMethod,
      referenceNumber,
      notes
    });

    toast({
      type: 'success',
      title: 'Payment Recorded!',
      message: `${created.receiptNumber} recorded for ₹${Number(amount).toLocaleString('en-IN')}. New balance: ₹${newOutstanding.toLocaleString('en-IN')}`
    });

    router.push(`/payments/receipt/${created.id}`);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2.5 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
            Record Customer Payment
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5">
            Credit collection receipt • Dynamically updates ledger & outstanding
          </p>
        </div>
      </div>

      <Card variant="lowest">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Select
            label="Select Wholesale Customer / Party"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            options={customers.map(c => ({
              value: c.id,
              label: `${c.name} (${c.marketLocation}) — Current Due: ₹${c.outstandingAmount.toLocaleString('en-IN')}`
            }))}
            required
          />

          {/* Dynamic Outstanding Impact Card (curated academic principle) */}
          <div className="p-5 rounded-2xl bg-surface-container-low grid grid-cols-3 gap-3 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-on-surface-variant">Previous Outstanding</span>
              <div className="text-base font-extrabold font-display text-on-surface mt-1">
                ₹{prevOutstanding.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="text-success font-bold flex flex-col justify-center items-center">
              <span className="text-[10px] uppercase text-on-surface-variant">Payment Received</span>
              <div className="text-base font-extrabold font-display mt-1">
                -₹{Number(amount || 0).toLocaleString('en-IN')}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-on-surface-variant">New Balance</span>
              <div className="text-base font-extrabold font-display text-primary mt-1">
                ₹{newOutstanding.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberField
              label="Payment Amount (₹)"
              value={amount}
              onValueChange={setAmount}
              prefixText="₹"
              required
            />

            <Select
              label="Payment Method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              options={[
                { value: 'UPI', label: 'UPI (GooglePay / PhonePe / Mandi QR)' },
                { value: 'CASH', label: 'Spot Hard Cash' },
                { value: 'BANK_TRANSFER', label: 'NEFT / RTGS Bank Transfer' },
                { value: 'CHEQUE', label: 'Cheque Clearing' }
              ]}
            />
          </div>

          <Input
            label="Transaction / Reference / UTR Number"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="e.g. UPI/628109481/HDFC or Cheque No."
          />

          <Input
            label="Remarks / Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Paid in full for last week consignments"
          />

          <div className="pt-4 border-t border-surface-container-low flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="lg" icon={<CheckCircle2 className="w-4 h-4" />}>
              Save Payment & Generate Receipt
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
