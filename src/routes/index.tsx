import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { AppShell } from '@/components/layout/AppShell';
import { LandingPage } from '@/app/LandingPage';
import { LoginPage } from '@/app/auth/LoginPage';
import { ForgotPasswordPage } from '@/app/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/app/auth/ResetPasswordPage';
import { ForcePasswordChangePage } from '@/app/auth/ForcePasswordChangePage';
import { AdminDashboardPage } from '@/app/admin/DashboardPage';
import { CorporatesListPage } from '@/app/admin/corporates/CorporatesListPage';
import { CorporateFormPage } from '@/app/admin/corporates/CorporateFormPage';
import { CorporateDetailPage } from '@/app/admin/corporates/CorporateDetailPage';
import { VehiclesListPage } from '@/app/admin/vehicles/VehiclesListPage';
import { VehicleFormPage } from '@/app/admin/vehicles/VehicleFormPage';
import { VehicleDetailPage } from '@/app/admin/vehicles/VehicleDetailPage';
import { ContractsListPage } from '@/app/admin/contracts/ContractsListPage';
import { ContractFormPage } from '@/app/admin/contracts/ContractFormPage';
import { ContractDetailPage } from '@/app/admin/contracts/ContractDetailPage';
import { AdminServiceRequestsListPage } from '@/app/admin/service-requests/ServiceRequestsListPage';
import { AdminServiceRequestDetailPage } from '@/app/admin/service-requests/ServiceRequestDetailPage';
import { AdminInvoicesListPage } from '@/app/admin/invoices/InvoicesListPage';
import { InvoiceFormPage as AdminInvoiceFormPage } from '@/app/admin/invoices/InvoiceFormPage';
import { AdminInvoiceDetailPage } from '@/app/admin/invoices/InvoiceDetailPage';
import { ReportsPage } from '@/app/admin/reports/ReportsPage';
import { SettingsPage } from '@/app/admin/settings/SettingsPage';
import { CorporateDashboardPage } from '@/app/corporate/DashboardPage';
import { CorporateVehiclesPage } from '@/app/corporate/VehiclesPage';
import { CorporateVehicleDetailPage } from '@/app/corporate/VehicleDetailPage';
import { CorporateContractsPage } from '@/app/corporate/ContractsPage';
import { CorporateContractDetailPage } from '@/app/corporate/ContractDetailPage';
import { CorporateInvoicesPage } from '@/app/corporate/InvoicesPage';
import { CorporateInvoiceDetailPage } from '@/app/corporate/InvoiceDetailPage';
import { CorporateServiceRequestsPage } from '@/app/corporate/ServiceRequestsPage';
import { CorporateNewServiceRequestPage } from '@/app/corporate/NewServiceRequestPage';
import { CorporateServiceRequestDetailPage } from '@/app/corporate/ServiceRequestDetailPage';
import { CorporatePaymentsPage } from '@/app/corporate/PaymentsPage';
import { FinanceDashboardPage } from '@/app/finance/DashboardPage';
import { NotFoundPage } from '@/app/NotFoundPage';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },

  // Forced password change — protected, but doesn't go through AppShell.
  {
    element: <ProtectedRoute allowMustChangePassword />,
    children: [{ path: '/force-password-change', element: <ForcePasswordChangePage /> }],
  },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: '/admin',
            element: <RoleRoute allow={['super_admin']} />,
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: 'corporates', element: <CorporatesListPage /> },
              { path: 'corporates/new', element: <CorporateFormPage /> },
              { path: 'corporates/:id', element: <CorporateDetailPage /> },
              { path: 'corporates/:id/edit', element: <CorporateFormPage /> },
              { path: 'vehicles', element: <VehiclesListPage /> },
              { path: 'vehicles/new', element: <VehicleFormPage /> },
              { path: 'vehicles/:id', element: <VehicleDetailPage /> },
              { path: 'vehicles/:id/edit', element: <VehicleFormPage /> },
              { path: 'contracts', element: <ContractsListPage /> },
              { path: 'contracts/new', element: <ContractFormPage /> },
              { path: 'contracts/:id', element: <ContractDetailPage /> },
              { path: 'contracts/:id/edit', element: <ContractFormPage /> },
              { path: 'service-requests', element: <AdminServiceRequestsListPage /> },
              { path: 'service-requests/:id', element: <AdminServiceRequestDetailPage /> },
              { path: 'invoices', element: <AdminInvoicesListPage /> },
              { path: 'invoices/new', element: <AdminInvoiceFormPage /> },
              { path: 'invoices/:id', element: <AdminInvoiceDetailPage /> },
              { path: 'invoices/:id/edit', element: <AdminInvoiceFormPage /> },
              { path: 'reports', element: <ReportsPage /> },
              { path: 'settings', element: <SettingsPage /> },
            ],
          },
          {
            path: '/corporate',
            element: <RoleRoute allow={['corporate_admin']} />,
            children: [
              { index: true, element: <CorporateDashboardPage /> },
              { path: 'vehicles', element: <CorporateVehiclesPage /> },
              { path: 'vehicles/:id', element: <CorporateVehicleDetailPage /> },
              { path: 'contracts', element: <CorporateContractsPage /> },
              { path: 'contracts/:id', element: <CorporateContractDetailPage /> },
              { path: 'invoices', element: <CorporateInvoicesPage /> },
              { path: 'invoices/:id', element: <CorporateInvoiceDetailPage /> },
              { path: 'service-requests', element: <CorporateServiceRequestsPage /> },
              { path: 'service-requests/new', element: <CorporateNewServiceRequestPage /> },
              {
                path: 'service-requests/:id',
                element: <CorporateServiceRequestDetailPage />,
              },
              { path: 'payments', element: <CorporatePaymentsPage /> },
            ],
          },
          {
            path: '/finance',
            element: <RoleRoute allow={['finance', 'super_admin']} />,
            children: [{ index: true, element: <FinanceDashboardPage /> }],
          },
        ],
      },
    ],
  },

  { path: '/404', element: <NotFoundPage /> },
  { path: '*', element: <Navigate to="/404" replace /> },
]);
