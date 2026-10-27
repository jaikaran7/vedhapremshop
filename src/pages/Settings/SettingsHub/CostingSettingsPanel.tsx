'use client';

import {
  useCostingExpenseTypesQuery,
  useCostingSettingsQuery,
  useProductsQuery,
  useSellingMarginComponentsQuery,
} from '@/hooks/queries/use-directory-query';
import {
  useCreateCostingExpenseTypeMutation,
  useCreateProductMutation,
  useCreateSellingMarginComponentMutation,
  useUpdateCostingExpenseTypeMutation,
  useUpdateCostingSettingsMutation,
  useUpdateProductMutation,
  useUpdateSellingMarginComponentMutation,
} from '@/hooks/mutations/use-settings-mutations';
import { calculateSellingRate } from '@/utils/costing';
import { ONIONS_PRODUCT_CODE } from '@/utils/products';
import { validateChargeAmount } from '@/utils/sale-charges';
import { formatRupee } from '@/utils/settlement';
import type { CostingExpenseKind, MasterStatus } from '@/types';
import React, { useEffect, useState } from 'react';
import { sanitizeTypedNumber } from '@/utils/typed-number';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/ui/Toast';

const EXAMPLE_COST_BASELINE = 50.5;

export function CostingSettingsPanel() {
  const { toast } = useToast();
  const { data: settings } = useCostingSettingsQuery();
  const { data: products = [] } = useProductsQuery();
  const { data: expenseTypes = [] } = useCostingExpenseTypesQuery();
  const { data: margins = [] } = useSellingMarginComponentsQuery();
  const updateSettings = useUpdateCostingSettingsMutation();
  const createProduct = useCreateProductMutation();
  const updateProduct = useUpdateProductMutation();
  const createExpense = useCreateCostingExpenseTypeMutation();
  const updateExpense = useUpdateCostingExpenseTypeMutation();
  const createMargin = useCreateSellingMarginComponentMutation();
  const updateMargin = useUpdateSellingMarginComponentMutation();

  const [marginDraft, setMarginDraft] = useState(String(settings.defaultSellingMarginPerKg));
  const [marginError, setMarginError] = useState('');

  useEffect(() => {
    setMarginDraft(String(settings.defaultSellingMarginPerKg));
  }, [settings.defaultSellingMarginPerKg]);

  const marginMessage = validateChargeAmount(marginDraft);
  const activeMargins = margins.filter((component) => component.status === 'ACTIVE');
  let previewError = '';
  let preview: ReturnType<typeof calculateSellingRate> | null = null;
  if (!marginMessage) {
    try {
      preview = calculateSellingRate({
        costBaselinePerKg: EXAMPLE_COST_BASELINE,
        defaultMarginPerKg: Number(marginDraft),
        additionalMargins: activeMargins,
        roundingRule: settings.roundingRule,
      });
    } catch (error) {
      previewError = error instanceof Error ? error.message : 'This rate cannot be calculated';
    }
  }

  const reportError = (error: unknown, title: string) => {
    toast({
      type: 'error',
      title,
      message: error instanceof Error ? error.message : 'The change could not be saved',
    });
  };

  return (
    <div className="space-y-6">
      <Card variant="lowest">
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            const message = validateChargeAmount(marginDraft);
            setMarginError(message ?? '');
            if (message) return;
            updateSettings.mutate({
              defaultSellingMarginPerKg: Number(marginDraft),
              roundingRule: 'CEIL_WHOLE_RUPEE',
            }, {
              onSuccess: () => toast({
                type: 'success',
                title: 'Costing Settings Saved',
                message: 'New rate calculations use this margin. Finalized transactions keep their saved rates.',
              }),
              onError: (error) => reportError(error, 'Could not save costing settings'),
            });
          }}
        >
          <div>
            <h3 className="text-base font-bold font-display text-on-surface">Selling Margin & Rounding</h3>
            <p className="text-xs text-on-surface-variant font-medium mt-1">
              The default margin is ₹/kg. It is added once to the cost baseline, together with any extra per-kg margins. Only the finished rate is rounded.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Default Selling Margin (₹/kg)"
              inputMode="decimal"
              value={sanitizeTypedNumber(marginDraft)}
              onChange={(event) => setMarginDraft(sanitizeTypedNumber(event.target.value))}
              error={marginError}
              prefixText="₹"
              suffixText="/KG"
            />
            <Select
              label="Final Rate Rounding"
              value={settings.roundingRule}
              disabled
              options={[{ value: 'CEIL_WHOLE_RUPEE', label: 'Round upward to the next whole rupee' }]}
              helperText="Applied to the calculated selling rate only. Exact whole rupees stay unchanged."
            />
          </div>
          <div className="rounded-2xl bg-surface-container-low p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Example from a ₹50.50 cost baseline</p>
            {preview ? (
              <p className="text-sm font-medium text-on-surface mt-2">
                Preliminary rate ₹{formatRupee(preview.preliminarySellingRatePerKg)}
                {' · '}
                Final rate ₹{formatRupee(preview.finalSellingRatePerKg)}
              </p>
            ) : (
              <p className="text-sm font-medium text-on-surface-variant mt-2">{previewError || marginMessage}</p>
            )}
            <p className="text-[11px] text-on-surface-variant mt-1">
              Purchase expenses and stock-receiving expenses are not included unless a later calculation names an allocation method.
            </p>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" isLoading={updateSettings.isPending}>Save Costing Settings</Button>
          </div>
        </form>
      </Card>

      <MasterSection
        idPrefix="margin"
        title="Additional Selling Margins"
        description="Each component is ₹/kg on top of the default margin. Fixed amounts and percentages are not accepted, because those formulas are not defined."
        items={margins.map((component) => ({
          id: component.id,
          name: component.name,
          status: component.status,
          perKg: component.perKg,
        }))}
        showPerKg
        addPlaceholder="e.g. Handling"
        onAdd={(name, perKg) => {
          createMargin.mutate({ name, perKg: perKg ?? 0 }, {
            onSuccess: () => toast({ type: 'success', title: 'Margin Added', message: `${name} will apply to new rate calculations.` }),
            onError: (error) => reportError(error, 'Could not add margin'),
          });
        }}
        onSave={(id, name, perKg) => {
          updateMargin.mutate({ id, input: { name, perKg } }, {
            onSuccess: () => toast({ type: 'success', title: 'Margin Updated', message: 'Saved sales and finalized rates are unchanged.' }),
            onError: (error) => reportError(error, 'Could not update margin'),
          });
        }}
        onToggle={(id, status) => {
          updateMargin.mutate({ id, input: { status } }, {
            onError: (error) => reportError(error, 'Could not update margin'),
          });
        }}
      />

      <MasterSection
        idPrefix="purchase-expense"
        title="Purchase Expense Types"
        description="These amounts are payable to the vendor. They stay separate from stock-receiving expenses and are not converted into a per-kg selling margin."
        items={expenseTypes.filter((type) => type.kind === 'PURCHASE')}
        addPlaceholder="e.g. Weighment"
        onAdd={(name) => addExpense(createExpense, toast, reportError, name, 'PURCHASE')}
        onSave={(id, name) => saveExpense(updateExpense, toast, reportError, id, name)}
        onToggle={(id, status) => toggleExpense(updateExpense, reportError, id, status)}
      />

      <MasterSection
        idPrefix="receiving-expense"
        title="Stock-Receiving Expense Types"
        description="Transport, loading and other receiving costs are recorded on their own. On the receive screen, each type starts as a total or a per-unit rate, and that choice is kept with the lot."
        items={expenseTypes.filter((type) => type.kind === 'STOCK_RECEIVING')}
        addPlaceholder="e.g. Toll"
        onAdd={(name) => addExpense(createExpense, toast, reportError, name, 'STOCK_RECEIVING')}
        onSave={(id, name) => saveExpense(updateExpense, toast, reportError, id, name)}
        onToggle={(id, status) => toggleExpense(updateExpense, reportError, id, status)}
      />

      <MasterSection
        idPrefix="product"
        title="Product Master"
        description="New sales start on Onions. Garlic and Ginger are separate products. Renaming or deactivating a product does not rewrite sales already saved."
        items={products}
        addPlaceholder="e.g. Potatoes"
        onAdd={(name) => {
          createProduct.mutate({ name }, {
            onSuccess: () => toast({ type: 'success', title: 'Product Added', message: `${name} can be selected on a new sale.` }),
            onError: (error) => reportError(error, 'Could not add product'),
          });
        }}
        onSave={(id, name) => {
          updateProduct.mutate({ id, input: { name } }, {
            onSuccess: () => toast({ type: 'success', title: 'Product Updated', message: 'Saved bills keep the product name they were issued with.' }),
            onError: (error) => reportError(error, 'Could not update product'),
          });
        }}
        onToggle={(id, status) => {
          const product = products.find((item) => item.id === id);
          if (product && product.code === ONIONS_PRODUCT_CODE && product.status === 'ACTIVE' && status === 'INACTIVE') {
            const confirmed = window.confirm('Deactivate Onions? New sales will use the next active product. Bills already saved keep Onions.');
            if (!confirmed) return;
          }
          updateProduct.mutate({ id, input: { status } }, {
            onError: (error) => reportError(error, 'Could not update product'),
          });
        }}
      />
    </div>
  );
}

function addExpense(
  createExpense: ReturnType<typeof useCreateCostingExpenseTypeMutation>,
  toast: ReturnType<typeof useToast>['toast'],
  reportError: (error: unknown, title: string) => void,
  name: string,
  kind: CostingExpenseKind,
) {
  createExpense.mutate({ name, kind }, {
    onSuccess: () => toast({ type: 'success', title: 'Expense Type Added', message: `${name} is available for new entries.` }),
    onError: (error) => reportError(error, 'Could not add expense type'),
  });
}

function saveExpense(
  updateExpense: ReturnType<typeof useUpdateCostingExpenseTypeMutation>,
  toast: ReturnType<typeof useToast>['toast'],
  reportError: (error: unknown, title: string) => void,
  id: string,
  name: string,
) {
  updateExpense.mutate({ id, input: { name } }, {
    onSuccess: () => toast({ type: 'success', title: 'Expense Type Updated', message: 'Previously saved expense lines keep their original name.' }),
    onError: (error) => reportError(error, 'Could not update expense type'),
  });
}

function toggleExpense(
  updateExpense: ReturnType<typeof useUpdateCostingExpenseTypeMutation>,
  reportError: (error: unknown, title: string) => void,
  id: string,
  status: MasterStatus,
) {
  updateExpense.mutate({ id, input: { status } }, {
    onError: (error) => reportError(error, 'Could not update expense type'),
  });
}

function MasterSection({
  idPrefix,
  title,
  description,
  items,
  addPlaceholder,
  showPerKg = false,
  onAdd,
  onSave,
  onToggle,
}: {
  idPrefix: string;
  title: string;
  description: string;
  items: { id: string; name: string; status: MasterStatus; perKg?: number | null; code?: string }[];
  addPlaceholder: string;
  showPerKg?: boolean;
  onAdd: (name: string, perKg?: number) => void;
  onSave: (id: string, name: string, perKg?: number) => void;
  onToggle: (id: string, status: MasterStatus) => void;
}) {
  const [name, setName] = useState('');
  const [perKg, setPerKg] = useState('');
  const [nameError, setNameError] = useState('');
  const [perKgError, setPerKgError] = useState('');

  return (
    <Card variant="lowest" className="space-y-4">
      <div>
        <h3 className="text-base font-bold font-display text-on-surface">{title}</h3>
        <p className="text-xs text-on-surface-variant font-medium mt-1">{description}</p>
      </div>
      <form
        className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = name.trim();
          if (!trimmed) {
            setNameError('Enter a name');
            return;
          }
          let parsedPerKg: number | undefined;
          if (showPerKg) {
            const message = validateChargeAmount(perKg);
            setPerKgError(message ?? '');
            if (message) return;
            parsedPerKg = Number(perKg);
          }
          setNameError('');
          onAdd(trimmed, parsedPerKg);
          setName('');
          setPerKg('');
        }}
      >
        <div className={showPerKg ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : ''}>
          <Input
            id={`${idPrefix}-new-name`}
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={addPlaceholder}
            error={nameError}
          />
          {showPerKg && (
            <Input
              id={`${idPrefix}-new-rate`}
              label="Amount (₹/kg)"
              inputMode="decimal"
              value={sanitizeTypedNumber(perKg)}
              onChange={(event) => setPerKg(sanitizeTypedNumber(event.target.value))}
              error={perKgError}
              prefixText="₹"
              suffixText="/KG"
            />
          )}
        </div>
        <Button type="submit" variant="secondary">Add</Button>
      </form>
      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-xs text-on-surface-variant">None yet. The default ₹/kg margin still applies on its own.</p>
        )}
        {items.map((item) => (
          <MasterRow
            key={item.id}
            idPrefix={idPrefix}
            item={item}
            showPerKg={showPerKg}
            onSave={onSave}
            onToggle={onToggle}
          />
        ))}
      </div>
    </Card>
  );
}

function MasterRow({
  idPrefix,
  item,
  showPerKg,
  onSave,
  onToggle,
}: {
  idPrefix: string;
  item: { id: string; name: string; status: MasterStatus; perKg?: number | null };
  showPerKg: boolean;
  onSave: (id: string, name: string, perKg?: number) => void;
  onToggle: (id: string, status: MasterStatus) => void;
}) {
  const [name, setName] = useState(item.name);
  const [perKg, setPerKg] = useState(item.perKg == null ? '' : String(item.perKg));
  const [error, setError] = useState('');

  useEffect(() => {
    setName(item.name);
    setPerKg(item.perKg == null ? '' : String(item.perKg));
  }, [item.name, item.perKg]);

  const inactive = item.status === 'INACTIVE';

  return (
    <div className={`rounded-2xl bg-surface-container-low p-4 ${inactive ? 'opacity-70' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className={`flex-1 grid grid-cols-1 gap-3 ${showPerKg ? 'sm:grid-cols-2' : ''}`}>
          <Input id={`${idPrefix}-${item.id}-name`} label="Name" value={name} onChange={(event) => setName(event.target.value)} error={error} />
          {showPerKg && (
            <Input
              id={`${idPrefix}-${item.id}-rate`}
              label="Amount (₹/kg)"
              inputMode="decimal"
              value={sanitizeTypedNumber(perKg)}
              onChange={(event) => setPerKg(sanitizeTypedNumber(event.target.value))}
              prefixText="₹"
              suffixText="/KG"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Chip label={inactive ? 'Inactive' : 'Active'} size="sm" variant={inactive ? 'neutral' : 'success'} />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              const trimmed = name.trim();
              if (!trimmed) {
                setError('Enter a name');
                return;
              }
              if (showPerKg) {
                const message = validateChargeAmount(perKg);
                setError(message ?? '');
                if (message) return;
                onSave(item.id, trimmed, Number(perKg));
                return;
              }
              setError('');
              onSave(item.id, trimmed);
            }}
          >
            Save
          </Button>
          <Button
            type="button"
            variant={inactive ? 'tonal' : 'ghost'}
            size="sm"
            onClick={() => onToggle(item.id, inactive ? 'ACTIVE' : 'INACTIVE')}
          >
            {inactive ? 'Activate' : 'Deactivate'}
          </Button>
        </div>
      </div>
    </div>
  );
}
