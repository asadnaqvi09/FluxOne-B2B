import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import {
  PATHS,
  INVENTORY_ROLES,
  BRANCH_ROLES,
  PHASE2_ROLES,
  profilePathForRole,
} from '@/router/paths'
import { AuthGate } from '@/router/guards/AuthGate'
import { RoleGate } from '@/router/guards/RoleGate'
import { InventoryLayout } from '@/layouts/InventoryLayout'
import { BranchManagerLayout } from '@/layouts/BranchManagerLayout'
import { WorkspaceLayout } from '@/layouts/WorkspaceLayout'
import { SplashPage } from '@/pages/splash/SplashPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ProfilePage } from '@/pages/shared/ProfilePage'
import { ComingSoonPage } from '@/pages/workspace/ComingSoonPage'
import { DashboardPage as InventoryDashboardPage } from '@/pages/inventory/DashboardPage'
import { ProductsPage } from '@/pages/inventory/ProductsPage'
import { InventoryControlPage } from '@/pages/inventory/InventoryControlPage'
import { SuppliersPage } from '@/pages/inventory/SuppliersPage'
import { PurchaseOrdersPage } from '@/pages/inventory/PurchaseOrdersPage'
import { DashboardPage as BranchDashboardPage } from '@/pages/branch/DashboardPage'
import { StaffPage } from '@/pages/branch/StaffPage'
import { AttendancePage } from '@/pages/branch/AttendancePage'
import { HolidaysPage } from '@/pages/branch/HolidaysPage'
import { LeavesPage } from '@/pages/branch/LeavesPage'
import { PerformancePage } from '@/pages/branch/PerformancePage'
import { SalesPage } from '@/pages/branch/SalesPage'
import { CustomerPage } from '@/pages/branch/CustomerPage'
import { BranchInventoryPage } from '@/pages/branch/BranchInventoryPage'
import { ReportsPage } from '@/pages/branch/ReportsPage'
import { ResourcesPage } from '@/pages/branch/ResourcesPage'
import { DiscountsPage } from '@/pages/branch/DiscountsPage'
import { AdminAuthGate } from '@/router/guards/AdminAuthGate'
import { AdminLayout } from '@/layouts/AdminLayout'
import { DashboardPage as AdminDashboardPage } from '@/pages/admin/DashboardPage'
import { ReportsPage as AdminReportsPage } from '@/pages/admin/ReportsPage'
import { BranchesPage as AdminBranchesPage } from '@/pages/admin/BranchesPage'
import { InvoicesPage as AdminInvoicesPage } from '@/pages/admin/InvoicesPage'
import { TaxProfitPage as AdminTaxProfitPage } from '@/pages/admin/TaxProfitPage'
import { CompanyPage as AdminCompanyPage } from '@/pages/admin/CompanyPage'
import { SettingsPage as AdminSettingsPage } from '@/pages/admin/SettingsPage'
import { AdminProfilePage } from '@/pages/admin/AdminProfilePage'
import { useAuthSession } from '@/hooks/useAuthSession'
import CategoriesPage from '@/pages/inventory/CategoriesPage'

function ProfileRedirect() {
  const { role } = useAuthSession()
  return <Navigate to={profilePathForRole(role)} replace />
}

const router = createBrowserRouter([
  { path: PATHS.splash, element: <SplashPage /> },
  { path: PATHS.login, element: <LoginPage /> },
  {
    path: PATHS.admin.root,
    element: <AdminAuthGate />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'dashboard', element: <AdminDashboardPage /> },
          { path: 'reports', element: <AdminReportsPage /> },
          { path: 'branches', element: <AdminBranchesPage /> },
          { path: 'invoices', element: <AdminInvoicesPage /> },
          { path: 'tax-profit', element: <AdminTaxProfitPage /> },
          { path: 'company', element: <AdminCompanyPage /> },
          { path: 'settings', element: <AdminSettingsPage /> },
          { path: 'profile', element: <AdminProfilePage /> },
        ],
      },
    ],
  },
  {
    element: <AuthGate />,
    children: [
      { path: PATHS.profile, element: <ProfileRedirect /> },
      {
        element: <RoleGate roles={INVENTORY_ROLES} />,
        children: [
          {
            path: PATHS.inventory.root,
            element: <InventoryLayout />,
            children: [
              { index: true, element: <InventoryDashboardPage /> },
              { path: 'products', element: <ProductsPage /> },
              { path: 'control', element: <InventoryControlPage /> },
              { path: 'suppliers', element: <SuppliersPage /> },
              { path: 'orders', element: <PurchaseOrdersPage /> },
              { path: 'categories', element: <CategoriesPage /> },
              { path: 'profile', element: <ProfilePage /> },
            ],
          },
        ],
      },
      {
        element: <RoleGate roles={BRANCH_ROLES} />,
        children: [
          {
            path: PATHS.branch.root,
            element: <BranchManagerLayout />,
            children: [
              { index: true, element: <BranchDashboardPage /> },
              { path: 'staff', element: <StaffPage /> },
              { path: 'attendance', element: <AttendancePage /> },
              { path: 'holidays', element: <HolidaysPage /> },
              { path: 'leaves', element: <LeavesPage /> },
              { path: 'performance', element: <PerformancePage /> },
              { path: 'sales', element: <SalesPage /> },
              { path: 'customer', element: <CustomerPage /> },
              { path: 'inventory', element: <BranchInventoryPage /> },
              { path: 'reports', element: <ReportsPage /> },
              { path: 'resources', element: <ResourcesPage /> },
              { path: 'discounts', element: <DiscountsPage /> },
              { path: 'profile', element: <ProfilePage /> },
            ],
          },
        ],
      },
      {
        element: <RoleGate roles={PHASE2_ROLES} />,
        children: [
          {
            path: PATHS.workspace.root,
            element: <WorkspaceLayout />,
            children: [
              { index: true, element: <ComingSoonPage /> },
              { path: 'profile', element: <ProfilePage /> },
            ],
          },
        ],
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
