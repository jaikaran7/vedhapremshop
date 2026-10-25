'use client';

import React from 'react';
import { can, homePath } from '@/auth/permissions';
import { NavLink } from '@/components/shared/NavLink';
import { useApprovalsQuery } from '@/hooks/queries/use-approvals-query';
import { useSession } from '@/store/session/session-provider';
import {
  LayoutDashboard, Users, Truck, ShoppingCart,
  Layers, Package, CheckSquare,
  History, BarChart3, Settings, ReceiptText,
  CreditCard, PlusCircle, Scale, Sparkles
} from 'lucide-react';

interface SidebarProps {
  collapsed?: boolean;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  badge?: number | string;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  const { currentUser } = useSession();
  const { data: approvals = [] } = useApprovalsQuery();
  const pendingApprovalsCount = approvals.filter((a) => a.status === 'PENDING').length;
  const management = can(currentUser.role, 'accessManagement');

  const salespersonNav: NavItem[] = [
    { to: '/salesperson-home', label: "Salesperson Home", icon: LayoutDashboard },
    { to: '/sales/new', label: "New Sale", icon: PlusCircle, highlight: true },
    { to: '/sales/todays', label: "Today's Sales", icon: Scale },
    { to: '/customers', label: "Customers", icon: Users },
    { to: '/sales', label: "Bills & Invoices", icon: ReceiptText },
    { to: '/payments/receipt', label: "Payment Receipts", icon: CreditCard },
    {
      to: '/approvals',
      label: "Approvals",
      icon: CheckSquare,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined
    },
  ];

  const managerAndOwnerNav: NavItem[] = [
    {
      to: homePath(currentUser.role),
      label: currentUser.role === 'OWNER' ? "Owner Dashboard" : "Manager Dashboard",
      icon: LayoutDashboard
    },
    { to: '/sales/new', label: "New Sale", icon: PlusCircle, highlight: true },
    { to: '/sales', label: "Sales & Weighment", icon: ShoppingCart },
    { to: '/customers', label: "Customers", icon: Users },
    { to: '/payments', label: "Customer Payments", icon: CreditCard },
    { to: '/purchases', label: "Purchases", icon: ShoppingCart },
    { to: '/lots', label: "Lot Breakdown", icon: Layers },
    { to: '/stock', label: "Stock & Movements", icon: Package },
    { to: '/vendors', label: "Vendors", icon: Truck },
    {
      to: '/approvals',
      label: "Approvals",
      icon: CheckSquare,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined
    },
    { to: '/reports', label: "Reports", icon: BarChart3 },
    { to: '/audit', label: "Audit Timeline", icon: History },
    ...(can(currentUser.role, 'manageSettings') ? [{ to: '/settings', label: "Settings", icon: Settings }] : [])
  ];

  const navItems: NavItem[] = management ? managerAndOwnerNav : salespersonNav;

  return (
    <aside
      className={`
        h-full bg-surface-container-low/70 backdrop-blur-md flex flex-col
        transition-all duration-300 no-print shrink-0
        ${collapsed ? 'w-20' : 'w-64'}
      `}
    >
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {!collapsed && (
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/80 font-display flex items-center justify-between">
            <span>Workspace</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface">
              {currentUser.role}
            </span>
          </div>
        )}

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `
                  group relative flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold
                  transition-all duration-200 select-none
                  ${isActive
                    ? item.highlight
                      ? 'academic-btn-primary'
                      : 'bg-surface-container-lowest text-primary shadow-ambient font-bold'
                    : item.highlight
                      ? 'bg-primary-fixed/60 text-primary-on-fixed hover:bg-primary-fixed'
                      : 'text-on-surface hover:bg-surface-container text-opacity-90'
                  }
                  ${collapsed ? 'justify-center px-0' : ''}
                `}
                title={collapsed ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 shrink-0 ${isActive && !item.highlight ? 'text-primary' : ''}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {item.badge && !collapsed && (
                      <span className="ml-auto px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-tertiary text-white">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {!collapsed && (
        <div className="shrink-0 p-3 m-3 rounded-2xl bg-surface-container-lowest ambient-shadow">
          <div className="flex items-center gap-2 text-xs font-bold text-on-surface font-display">
            <Sparkles className="w-3.5 h-3.5 text-tertiary" />
            <span>Curated Academic</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-1 leading-snug">
            Tactile wholesale mandi environment. Real-time bag weights & dynamic ledgers.
          </p>
        </div>
      )}
    </aside>
  );
};
