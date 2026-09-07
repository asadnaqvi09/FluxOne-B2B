export const ROLES = {
  INVENTORY_MANAGER: 'inventory_manager',
  BRANCH_MANAGER: 'branch_manager',
  B2B_ADMIN: 'b2b_admin',
  CASHIER: 'cashier',
  BRANCH_ADMIN: 'branch_admin',
  PRODUCTION_STAFF: 'production_staff',
  DELIVERY_STAFF: 'delivery_staff',
}

export const ROLE_IDS = {
  [ROLES.INVENTORY_MANAGER]: 1,
  [ROLES.BRANCH_MANAGER]: 2,
  [ROLES.B2B_ADMIN]: 3,
  [ROLES.CASHIER]: 4,
  [ROLES.BRANCH_ADMIN]: 5,
  [ROLES.PRODUCTION_STAFF]: 6,
  [ROLES.DELIVERY_STAFF]: 7,
}

export const PRODUCT_TYPES = {
  SINGLE: 'single',
  BUNDLE: 'bundle',
}

export const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  OPEN: 'active',
  CLOSE: 'inactive',
}

export const MOVEMENT_TYPES = {
  IN: 'in',
  OUT: 'out',
  ADJUSTMENT: 'adjustment',
  DAMAGED: 'damaged',
  EXPIRED: 'expired',
  TRANSFER: 'transfer',
}

export const PURCHASE_ORDER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
}

export const STOCK_REQUEST_KIND = {
  ALERT: 'alert',
  REQUEST: 'request',
}

export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  HOLIDAY: 'holiday',
  LEAVE: 'leave',
}

export const POINT_SYSTEMS = {
  PUNCTUALITY: 'punctuality',
  SALES_TARGET: 'sales_target',
  CUSTOMER_SERVICE: 'customer_service',
}

export const STAFF_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  OPEN: 'active',
  BLOCKED: 'inactive',
}

export const SALE_STATUS = {
  COMPLETED: 'completed',
  REFUNDED: 'refunded',
  PARTIAL_REFUND: 'partial_refund',
  VOID: 'void',
}

/** POS invoice type (Sale / Return / Exchange) — stored on sales.invoice_type */
export const INVOICE_TYPES = {
  SALE: 'sale',
  RETURN: 'return',
  EXCHANGE: 'exchange',
}

export const PERMISSIONS = {
  'staff:read': [ROLES.BRANCH_MANAGER, ROLES.B2B_ADMIN],
  'staff:write': [ROLES.BRANCH_MANAGER, ROLES.B2B_ADMIN],
  'designations:read': [ROLES.BRANCH_MANAGER, ROLES.B2B_ADMIN],
  'designations:write': [ROLES.B2B_ADMIN],
  'attendance:write': [ROLES.BRANCH_MANAGER, ROLES.B2B_ADMIN],
  'performance:read': [ROLES.BRANCH_MANAGER, ROLES.B2B_ADMIN],
  'branch-dashboard:read': [ROLES.BRANCH_MANAGER, ROLES.B2B_ADMIN],
  'dashboard:read': [ROLES.INVENTORY_MANAGER, ROLES.B2B_ADMIN, ROLES.BRANCH_MANAGER],
  'items:read': [ROLES.INVENTORY_MANAGER, ROLES.B2B_ADMIN, ROLES.BRANCH_MANAGER],
  'items:write': [ROLES.INVENTORY_MANAGER, ROLES.B2B_ADMIN, ROLES.BRANCH_MANAGER],
  'stock:write': [ROLES.INVENTORY_MANAGER, ROLES.B2B_ADMIN],
  'stock:read': [ROLES.INVENTORY_MANAGER, ROLES.B2B_ADMIN, ROLES.BRANCH_MANAGER],
  'staff:lookup': [ROLES.INVENTORY_MANAGER, ROLES.B2B_ADMIN, ROLES.BRANCH_MANAGER],
  'stock-requests:write': [ROLES.BRANCH_MANAGER, ROLES.B2B_ADMIN],
  'suppliers:read': [ROLES.INVENTORY_MANAGER, ROLES.B2B_ADMIN, ROLES.BRANCH_MANAGER],
  'suppliers:write': [ROLES.INVENTORY_MANAGER, ROLES.B2B_ADMIN],
  'orders:read': [ROLES.INVENTORY_MANAGER, ROLES.B2B_ADMIN, ROLES.BRANCH_MANAGER],
  'orders:generate': [ROLES.INVENTORY_MANAGER, ROLES.B2B_ADMIN],
  'orders:approve': [ROLES.INVENTORY_MANAGER, ROLES.B2B_ADMIN],
  'reports:read': [ROLES.INVENTORY_MANAGER, ROLES.B2B_ADMIN],
  'sync:push': [
    ROLES.CASHIER,
    ROLES.BRANCH_MANAGER,
    ROLES.BRANCH_ADMIN,
    ROLES.INVENTORY_MANAGER,
    ROLES.B2B_ADMIN,
  ],
  'sync:pull': [
    ROLES.CASHIER,
    ROLES.BRANCH_MANAGER,
    ROLES.BRANCH_ADMIN,
    ROLES.INVENTORY_MANAGER,
    ROLES.B2B_ADMIN,
  ],
}

export function hasPermission(role, permission) {
  return Boolean(PERMISSIONS[permission]?.includes(role))
}
