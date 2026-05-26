import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Car,
  FileSignature,
  Wrench,
  FileText,
  IndianRupee,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useUiStore } from '@/store/uiStore';
import type { UserRole } from '@/lib/permissions';

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: readonly UserRole[];
};

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin'] },
  { to: '/admin/corporates', label: 'Corporates', icon: Building2, roles: ['super_admin'] },
  { to: '/admin/vehicles', label: 'Vehicles', icon: Car, roles: ['super_admin'] },
  { to: '/admin/contracts', label: 'Contracts', icon: FileSignature, roles: ['super_admin'] },
  {
    to: '/admin/service-requests',
    label: 'Service requests',
    icon: Wrench,
    roles: ['super_admin'],
  },
  { to: '/admin/invoices', label: 'Invoices', icon: FileText, roles: ['super_admin'] },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3, roles: ['super_admin'] },
  { to: '/admin/settings', label: 'Settings', icon: Settings, roles: ['super_admin'] },

  { to: '/corporate', label: 'Dashboard', icon: LayoutDashboard, roles: ['corporate_admin'] },
  { to: '/corporate/vehicles', label: 'My vehicles', icon: Car, roles: ['corporate_admin'] },
  {
    to: '/corporate/contracts',
    label: 'Contracts',
    icon: FileSignature,
    roles: ['corporate_admin'],
  },
  {
    to: '/corporate/service-requests',
    label: 'Service requests',
    icon: Wrench,
    roles: ['corporate_admin'],
  },
  { to: '/corporate/invoices', label: 'Invoices', icon: FileText, roles: ['corporate_admin'] },
  { to: '/corporate/payments', label: 'Payments', icon: IndianRupee, roles: ['corporate_admin'] },

  { to: '/finance', label: 'Dashboard', icon: LayoutDashboard, roles: ['finance'] },
  { to: '/finance/invoices', label: 'Invoices', icon: FileText, roles: ['finance'] },
  { to: '/finance/payments', label: 'Payments', icon: IndianRupee, roles: ['finance'] },
  { to: '/finance/receivables', label: 'Receivables', icon: BarChart3, roles: ['finance'] },
];

export function Sidebar() {
  const { profile } = useAuth();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);

  const items = profile ? NAV_ITEMS.filter((i) => i.roles.includes(profile.role)) : [];

  return (
    <aside
      className={cn('flex flex-col border-r bg-card transition-all', collapsed ? 'w-16' : 'w-60')}
    >
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <img src="/logo.svg" alt="" className="h-7 w-7" />
        {!collapsed && <span className="font-semibold">Fleet Portal</span>}
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                isActive && 'bg-accent text-accent-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
