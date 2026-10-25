'use client';

import { AccountOpeningsPanel } from '@/pages/Settings/SettingsHub/AccountOpeningsPanel';
import { CostingSettingsPanel } from '@/pages/Settings/SettingsHub/CostingSettingsPanel';
import { useSession } from '@/store/session/session-provider';
import { useCompanyQuery, useMarksQuery, useSaleChargeSettingsQuery, useUsersQuery } from '@/hooks/queries/use-directory-query';
import { useCreateMarkMutation, useResetDemoMutation, useUpdateCompanyMutation, useUpdateMarkMutation, useUpdateSaleChargeSettingsMutation } from '@/hooks/mutations/use-settings-mutations';
import { validateChargeAmount } from '@/utils/sale-charges';
import { can } from '@/auth/permissions';
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumberField } from '@/components/ui/NumberField';
import { sanitizeTypedNumber } from '@/utils/typed-number';
import { Select } from '@/components/ui/Select';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { 
  Settings, Users, Shield, Tag, IndianRupee, FileText, 
  Building, Bell, RefreshCw, CheckCircle2, PlusCircle, Edit 
} from 'lucide-react';
import { Mark, User } from '@/types';

export const SettingsHub: React.FC = () => {
  const { currentUser } = useSession();
  const { data: companySettings } = useCompanyQuery();
  const { data: saleChargeSettings } = useSaleChargeSettingsQuery();
  const updateSaleChargesMutation = useUpdateSaleChargeSettingsMutation();
  const updateCompanyMutation = useUpdateCompanyMutation();
  const updateCompanySettings = (settings: Parameters<typeof updateCompanyMutation.mutate>[0]) => updateCompanyMutation.mutate(settings);
  const { data: marks = [] } = useMarksQuery();
  const updateMarkMutation = useUpdateMarkMutation();
  const updateMark = (id: string, input: Parameters<typeof updateMarkMutation.mutate>[0]['input']) => updateMarkMutation.mutate({ id, input });
  const addMarkMutation = useCreateMarkMutation();
  const addMark = (data: Parameters<typeof addMarkMutation.mutate>[0]) => addMarkMutation.mutate(data);
  const { data: users = [] } = useUsersQuery();
  const resetDemoMutation = useResetDemoMutation();
  const resetToDefault = () => resetDemoMutation.mutate();

  const [activeTab, setActiveTab] = useState<
    'users' | 'roles' | 'marks' | 'rates' | 'charges' | 'costing' | 'accounts' | 'bill' | 'company' | 'notifications' | 'system'
  >('company');

  const { toast } = useToast();

  // Company Form state
  const [shopName, setShopName] = useState(companySettings.shopName);
  const [licenseNo, setLicenseNo] = useState(companySettings.mandiLicenseNo);
  const [gstNo, setGstNo] = useState(companySettings.gstNo);
  const [address, setAddress] = useState(companySettings.address);
  const [phone, setPhone] = useState(companySettings.phone);
  const [email, setEmail] = useState(companySettings.email);
  const [terms, setTerms] = useState(companySettings.termsAndConditions);
  const [invPrefix, setInvPrefix] = useState(companySettings.invoicePrefix);
  const [recPrefix, setRecPrefix] = useState(companySettings.receiptPrefix);
  const [amaliPerBag, setAmaliPerBag] = useState(String(saleChargeSettings.amaliPerBag));
  const [marketFeePerBag, setMarketFeePerBag] = useState(String(saleChargeSettings.marketFeePerBag));
  const [amaliEnabled, setAmaliEnabled] = useState(saleChargeSettings.amaliEnabled);
  const [marketFeeEnabled, setMarketFeeEnabled] = useState(saleChargeSettings.marketFeeEnabled);
  const [amaliError, setAmaliError] = useState('');
  const [marketFeeError, setMarketFeeError] = useState('');

  useEffect(() => {
    setAmaliPerBag(String(saleChargeSettings.amaliPerBag));
    setMarketFeePerBag(String(saleChargeSettings.marketFeePerBag));
    setAmaliEnabled(saleChargeSettings.amaliEnabled);
    setMarketFeeEnabled(saleChargeSettings.marketFeeEnabled);
  }, [
    saleChargeSettings.amaliPerBag,
    saleChargeSettings.marketFeePerBag,
    saleChargeSettings.amaliEnabled,
    saleChargeSettings.marketFeeEnabled,
  ]);

  // Rate Management State
  const [editingRates, setEditingRates] = useState<{ [id: string]: { selling: number; purchase: number } }>(() => {
    const map: any = {};
    marks.forEach(m => {
      map[m.id] = { selling: m.defaultSellingRate, purchase: m.defaultPurchaseRate };
    });
    return map;
  });

  // Mark Modal
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [newMarkCode, setNewMarkCode] = useState('');
  const [newMarkName, setNewMarkName] = useState('');
  const [newMarkSelling, setNewMarkSelling] = useState(60);
  const [newMarkPurchase, setNewMarkPurchase] = useState(42);

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanySettings({
      ...companySettings,
      shopName,
      mandiLicenseNo: licenseNo,
      gstNo,
      address,
      phone,
      email,
      termsAndConditions: terms,
      invoicePrefix: invPrefix,
      receiptPrefix: recPrefix
    });
    toast({ type: 'success', title: 'Settings Saved', message: 'Mandi details and invoice header updated.' });
  };

  const handleSaveRates = () => {
    marks.forEach(m => {
      const edited = editingRates[m.id];
      if (edited) {
        updateMark(m.id, {
          defaultSellingRate: edited.selling,
          defaultPurchaseRate: edited.purchase
        });
      }
    });
    toast({ type: 'success', title: 'Market Floor Rates Updated', message: 'New rates active for today auction.' });
  };

  const handleAddMark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarkCode.trim()) return;
    addMark({
      code: newMarkCode.toUpperCase(),
      name: newMarkName || `Grade ${newMarkCode.toUpperCase()}`,
      description: 'Standard graded onion',
      defaultSellingRate: Number(newMarkSelling),
      defaultPurchaseRate: Number(newMarkPurchase),
      qualityGrade: 'GRADE_1'
    });
    toast({ type: 'success', title: 'Mark Created', message: `Mark Grade ${newMarkCode.toUpperCase()} added` });
    setShowMarkModal(false);
    setNewMarkCode('');
    setNewMarkName('');
  };

  const handleResetDemo = () => {
    if (window.confirm('Reset all Mandi data to default seed state? This clears temporary local storage.')) {
      resetToDefault();
      toast({ type: 'info', title: 'Demo Reset', message: 'Database refreshed to initial wholesale state' });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
            Settings & Master Configurations
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            APMC company particulars, costing, daily floor rates, and role privileges.
          </p>
        </div>

        <Button
          variant="secondary"
          icon={<RefreshCw className="w-4 h-4" />}
          onClick={handleResetDemo}
        >
          Reset Demo Data
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-surface-container-low">
        {[
          { key: 'company', label: 'Company Profile' },
          { key: 'charges', label: 'Sale Charges & Mandi Fees' },
          { key: 'costing', label: 'Costing & Products' },
          { key: 'accounts', label: 'Cash & Bank Openings' },
          { key: 'rates', label: 'Daily Floor Rates' },
          { key: 'bill', label: 'Bill & Invoice Config' },
          { key: 'users', label: 'Users & Cashiers' },
          { key: 'roles', label: 'Roles & Privileges' },
          { key: 'notifications', label: 'WhatsApp / Notifications' },
          { key: 'system', label: 'System Terminal' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.key
                ? 'bg-primary text-white shadow-ambient'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'accounts' && <AccountOpeningsPanel />}

      {/* TAB 1: COMPANY SETTINGS */}
      {activeTab === 'company' && (
        <Card variant="lowest">
          <form onSubmit={handleSaveCompany} className="space-y-4">
            <h3 className="text-base font-bold font-display text-on-surface mb-2">APMC Mandi Firm Particulars</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Wholesale Shop Trade Name"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required
              />
              <Input
                label="Mandi License Registration No."
                value={licenseNo}
                onChange={(e) => setLicenseNo(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="GSTIN Number"
                value={gstNo}
                onChange={(e) => setGstNo(e.target.value)}
                required
              />
              <Input
                label="Official Contact Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <Input
              label="Official APMC Shop / Gala Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />

            <Input
              label="Official Trade Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="flex justify-end pt-3">
              <Button type="submit" variant="primary">
                Save Company Particulars
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 2: SELLING RATE MANAGEMENT */}
      {activeTab === 'charges' && (
        <Card variant="lowest">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const amaliMessage = validateChargeAmount(amaliPerBag);
              const marketMessage = validateChargeAmount(marketFeePerBag);
              setAmaliError(amaliMessage ?? '');
              setMarketFeeError(marketMessage ?? '');
              if (amaliMessage || marketMessage) return;
              updateSaleChargesMutation.mutate({
                amaliPerBag: Number(amaliPerBag),
                marketFeePerBag: Number(marketFeePerBag),
                amaliEnabled,
                marketFeeEnabled,
              });
              toast({
                type: 'success',
                title: 'Sale Charges Saved',
                message: 'New sales will use these Amali and market fee rates. Finalized invoices keep their saved fees.',
              });
            }}
            className="space-y-5"
          >
            <div>
              <h3 className="text-base font-bold font-display text-on-surface">Sale Charges & Mandi Fees</h3>
              <p className="text-xs text-on-surface-variant font-medium mt-1">
                Amali and market fee are calculated from the bags on a new sale. Changing these rates does not rewrite invoices that are already finalized.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Amali per Bag (₹)"
                inputMode="decimal"
                value={sanitizeTypedNumber(amaliPerBag)}
                onChange={(event) => setAmaliPerBag(sanitizeTypedNumber(event.target.value))}
                error={amaliError}
                prefixText="₹"
              />
              <Input
                label="Market Fee per Bag (₹)"
                inputMode="decimal"
                value={sanitizeTypedNumber(marketFeePerBag)}
                onChange={(event) => setMarketFeePerBag(sanitizeTypedNumber(event.target.value))}
                error={marketFeeError}
                prefixText="₹"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FeeToggle label="Amali" enabled={amaliEnabled} onChange={setAmaliEnabled} />
              <FeeToggle label="Market Fee" enabled={marketFeeEnabled} onChange={setMarketFeeEnabled} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={updateSaleChargesMutation.isPending}>
                Save Settings
              </Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'costing' && <CostingSettingsPanel />}

      {activeTab === 'rates' && (
        <Card variant="lowest">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold font-display text-on-surface">Daily Floor Selling Rate Management</h3>
              <p className="text-xs text-on-surface-variant font-medium">
                Set baseline wholesale selling rates per kilogram for morning auction trading.
              </p>
            </div>
            <Button variant="primary" onClick={handleSaveRates}>
              Apply Updated Rates
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-on-surface font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Quality Mark</th>
                  <th className="py-3 px-4">Grade Specification</th>
                  {can(currentUser.role, 'viewPurchaseCost') && (
                    <th className="py-3 px-4">Purchase Rate (Ref)</th>
                  )}
                  <th className="py-3 px-4">Floor Selling Rate (₹/KG)</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {marks.map(mark => (
                  <tr key={mark.id}>
                    <td className="py-3 px-4 font-bold text-primary text-sm">Grade {mark.code}</td>
                    <td className="py-3 px-4 text-on-surface-variant font-medium">{mark.name}</td>
                    {can(currentUser.role, 'viewPurchaseCost') && (
                      <td className="py-3 px-4 font-semibold text-on-surface">₹{mark.defaultPurchaseRate.toFixed(2)}/kg</td>
                    )}
                    <td className="py-3 px-4">
                      <div className="w-36">
                        <NumberField
                          allowDecimal
                          value={editingRates[mark.id]?.selling ?? mark.defaultSellingRate}
                          onValueChange={(selling) => {
                            setEditingRates(prev => ({
                              ...prev,
                              [mark.id]: { ...prev[mark.id], selling }
                            }));
                          }}
                          prefixText="₹"
                          suffixText="/KG"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Chip label="Active Floor" size="sm" variant="success" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: MARKS MASTER */}
      {activeTab === 'marks' && (
        <Card variant="lowest">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold font-display text-on-surface">Quality Marks Master Directory</h3>
              <p className="text-xs text-on-surface-variant font-medium">Defines standard mandi grading marks (AA, J, K, OK, CV, TC)</p>
            </div>
            <Button variant="primary" icon={<PlusCircle className="w-4 h-4" />} onClick={() => setShowMarkModal(true)}>
              Add Quality Mark
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {marks.map(m => (
              <div key={m.id} className="p-4 rounded-2xl bg-surface-container-low flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold font-display text-primary">Grade {m.code}</span>
                    <Chip label={m.qualityGrade} size="sm" variant="secondary" />
                  </div>
                  <h4 className="text-xs font-bold text-on-surface mt-1">{m.name}</h4>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">{m.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant">Default Floor Rate:</span>
                  <span className="font-extrabold text-on-surface font-display">₹{m.defaultSellingRate.toFixed(2)}/kg</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 4: BILL & INVOICE CONFIG */}
      {activeTab === 'bill' && (
        <Card variant="lowest">
          <form onSubmit={handleSaveCompany} className="space-y-4">
            <h3 className="text-base font-bold font-display text-on-surface mb-2">Invoice & Receipt Numbering & Terms</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Sales Invoice Prefix"
                value={invPrefix}
                onChange={(e) => setInvPrefix(e.target.value)}
                placeholder="e.g. VPN-INV"
                helperText="Generates numbers like VPN-INV-1081"
              />
              <Input
                label="Payment Receipt Prefix"
                value={recPrefix}
                onChange={(e) => setRecPrefix(e.target.value)}
                placeholder="e.g. VPN-REC"
                helperText="Generates numbers like VPN-REC-501"
              />
            </div>

            <div className="flex flex-col space-y-1.5 text-left">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-display">
                Mandi Legal Terms & Conditions (Appears on print bill)
              </label>
              <textarea
                rows={4}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="academic-input p-4 text-xs font-medium rounded-2xl w-full"
              />
            </div>

            <div className="flex justify-end pt-3">
              <Button type="submit" variant="primary">
                Save Invoice Settings
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 5: USERS */}
      {activeTab === 'users' && (
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <div className="p-6 pb-4 bg-surface-container-low/40">
            <h3 className="text-base font-bold font-display text-on-surface">Registered Mandi Terminal Operators</h3>
            <p className="text-xs text-on-surface-variant font-medium">Scale weighers, cashiers, floor managers, and owner</p>
          </div>

          <div className="divide-y divide-surface-container-low">
            {users.map(u => (
              <div key={u.id} className="p-4 sm:px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-surface-container-high text-primary flex items-center justify-center font-bold text-sm">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-on-surface">{u.name}</h4>
                    <p className="text-xs text-on-surface-variant">@{u.username} • {u.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Chip
                    label={u.role}
                    size="md"
                    variant={u.role === 'OWNER' ? 'primary' : u.role === 'MANAGER' ? 'secondary' : 'tertiary'}
                  />
                  <span className="text-xs font-semibold text-success">Active</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 6: ROLES & PERMISSIONS */}
      {activeTab === 'roles' && (
        <Card variant="lowest">
          <h3 className="text-base font-bold font-display text-on-surface mb-2">Role Permissions Matrix</h3>
          <p className="text-xs text-on-surface-variant font-medium mb-4">
            Security policy enforced across Mandi interfaces. Salesperson is strictly blocked from procurement costs.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low font-bold uppercase text-[10px] text-on-surface-variant">
                <tr>
                  <th className="py-3 px-4">Feature / Data Point</th>
                  <th className="py-3 px-4 text-center">Owner</th>
                  <th className="py-3 px-4 text-center">Manager</th>
                  <th className="py-3 px-4 text-center">Salesperson</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {[
                  { feature: 'New Sale & Weighment Entry', o: true, m: true, s: true },
                  { feature: 'View Customer Ledgers', o: true, m: true, s: true },
                  { feature: 'Print Digital Bills', o: true, m: true, s: true },
                  { feature: 'Record Customer Payment', o: true, m: true, s: true },
                  { feature: 'Consignment Inward Purchases', o: true, m: true, s: false },
                  { feature: 'Confidential Vendor Costs & Margins', o: true, m: true, s: false },
                  { feature: 'Approve Transaction Amendments', o: true, m: true, s: false },
                  { feature: 'Master Settings & Daily Rates', o: true, m: false, s: false },
                  { feature: 'Costing Masters & Selling Margins', o: true, m: false, s: false },
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="py-3 px-4 font-semibold text-on-surface">{row.feature}</td>
                    <td className="py-3 px-4 text-center font-bold text-success">{row.o ? '✓ Full' : '—'}</td>
                    <td className="py-3 px-4 text-center font-bold text-success">{row.m ? '✓ Granted' : '—'}</td>
                    <td className="py-3 px-4 text-center font-bold">{row.s ? <span className="text-success">✓ Granted</span> : <span className="text-danger">✗ Restricted</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 7: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <Card variant="lowest" className="space-y-4">
          <h3 className="text-base font-bold font-display text-on-surface mb-2">Automated Notifications & Mandi Alerts</h3>
          
          <div className="space-y-3">
            {[
              { title: 'Instant WhatsApp Bill Dispatch', desc: 'Sends direct PDF link to customer mobile number immediately after weighment confirmation', active: true },
              { title: 'Credit Limit Breach Warning', desc: 'Alerts salesperson if customer outstanding exceeds sanctioned APMC limit', active: true },
              { title: 'Amendment Approval Push Notification', desc: 'Notifies owner when salesperson submits a scale weight edit', active: true },
              { title: 'Daily Cashier Evening Reconciliation SMS', desc: 'Summarizes cash collected and total credit issued at close of trading session', active: false }
            ].map((n, i) => (
              <div key={i} className="p-4 rounded-2xl bg-surface-container-low flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-on-surface">{n.title}</h4>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">{n.desc}</p>
                </div>
                <input type="checkbox" defaultChecked={n.active} className="w-5 h-5 rounded text-primary cursor-pointer" />
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="primary" onClick={() => toast({ type: 'success', title: 'Notifications Updated', message: 'Preferences saved.' })}>
              Save Alert Preferences
            </Button>
          </div>
        </Card>
      )}

      {/* TAB 8: SYSTEM SETTINGS */}
      {activeTab === 'system' && (
        <Card variant="lowest" className="space-y-4">
          <h3 className="text-base font-bold font-display text-on-surface mb-2">Terminal System Engine & Storage</h3>
          
          <div className="p-4 rounded-2xl bg-surface-container-low text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Storage Engine:</span>
              <span className="font-bold text-on-surface">HTML5 LocalStorage State Engine</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Platform Environment:</span>
              <span className="font-bold text-primary">React 18 + TypeScript + Curated Academic CSS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Offline Mode:</span>
              <span className="font-bold text-success">Enabled (Floor weighing without active internet)</span>
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center">
            <span className="text-xs text-on-surface-variant">Clear demo data and revert to clean APMC seed state:</span>
            <Button variant="danger" onClick={handleResetDemo}>
              Revert to Factory Demo
            </Button>
          </div>
        </Card>
      )}

      {/* Add Mark Modal */}
      <Modal
        isOpen={showMarkModal}
        onClose={() => setShowMarkModal(false)}
        title="Add Onion Quality Mark"
        subtitle="Register standard APMC grading code"
      >
        <form onSubmit={handleAddMark} className="space-y-4">
          <Input
            label="Mark Code (e.g. AA, J, K)"
            value={newMarkCode}
            onChange={(e) => setNewMarkCode(e.target.value)}
            placeholder="e.g. OK"
            required
          />

          <Input
            label="Descriptive Name"
            value={newMarkName}
            onChange={(e) => setNewMarkName(e.target.value)}
            placeholder="e.g. Extra Big Premium Red"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Default Selling Rate (₹/KG)"
              value={newMarkSelling}
              onValueChange={setNewMarkSelling}
              prefixText="₹"
              required
            />

            <NumberField
              label="Default Purchase Rate (₹/KG)"
              value={newMarkPurchase}
              onValueChange={setNewMarkPurchase}
              prefixText="₹"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="secondary" onClick={() => setShowMarkModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Register Mark</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

function FeeToggle({
  label,
  enabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="rounded-2xl bg-surface-container-low p-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-display">{label}</span>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`py-2.5 rounded-2xl text-xs font-bold ${enabled ? 'bg-primary text-white shadow-ambient' : 'bg-surface-container-lowest text-on-surface'}`}
        >
          Enable
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`py-2.5 rounded-2xl text-xs font-bold ${!enabled ? 'bg-primary text-white shadow-ambient' : 'bg-surface-container-lowest text-on-surface'}`}
        >
          Disable
        </button>
      </div>
    </div>
  );
}
