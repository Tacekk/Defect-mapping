import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Package, Monitor, AlertTriangle, ClipboardList, History, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UsersPage } from '@/components/admin/UsersPage';
import { ProductsPage } from '@/components/admin/ProductsPage';
import { WorkstationsPage } from '@/components/admin/WorkstationsPage';
import { DefectTypesPage } from '@/components/admin/DefectTypesPage';
import { SessionsPage } from '@/components/admin/SessionsPage';
import { PhotosPage } from '@/components/admin/PhotosPage';
import { AuditLogsPage } from '@/components/admin/AuditLogsPage';

export function AdminPage() {
  const { t } = useTranslation();

  const navItems = [
    { to: '/admin/users', icon: Users, label: t('admin.users') },
    { to: '/admin/products', icon: Package, label: t('admin.products') },
    { to: '/admin/workstations', icon: Monitor, label: t('admin.workstations') },
    { to: '/admin/defect-types', icon: AlertTriangle, label: t('admin.defectTypes') },
    { to: '/admin/sessions', icon: ClipboardList, label: t('admin.sessions') },
    { to: '/admin/photos', icon: Camera, label: t('admin.photos') },
    { to: '/admin/audit-logs', icon: History, label: t('admin.auditLogs') },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('admin.title')}</h1>

      <div className="flex flex-col md:flex-row gap-6">
        <nav className="w-full md:w-64 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1">
          <Routes>
            <Route index element={<Navigate to="users" replace />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="workstations" element={<WorkstationsPage />} />
            <Route path="defect-types" element={<DefectTypesPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="photos" element={<PhotosPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
