// Dynamic Mock Data for Admin Company Details & Policies (Phase 1)

export const INITIAL_COMPANY_DETAILS = {
  name: 'FluxOne Enterprise B2B Solutions',
  logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80',
  contactNumbers: '+92 51 2223344, +92 300 1234567',
  facebookUrl: 'https://facebook.com/fluxone.b2b',
  instagramUrl: 'https://instagram.com/fluxone.enterprise',
  whatsappNumber: '+92 300 1234567',
  registrationTaxId: 'NTN-8923410-7 (FBR Registered)',
  businessAddress: 'Plot 14-B, Executive Industrial Area, GT Road, Islamabad / Wah',
  supportEmail: 'support@fluxone.b2b',
}

export const INITIAL_POLICIES_DATA = [
  {
    id: 'POL-01',
    name: 'Customer Return & Refund Policy',
    createdAt: '2025-01-10 10:00 AM',
    detail:
      'Items can be returned within 7 calendar days of receipt if unopened, sealed in original packaging, and with a valid purchase receipt. Perishable dairy and fresh produce must be reported within 24 hours.',
    category: 'Retail Operations',
    isActive: true,
  },
  {
    id: 'POL-02',
    name: 'Wholesale B2B Credit & Settlement Policy',
    createdAt: '2025-02-15 02:30 PM',
    detail:
      'All approved corporate and distributor credit terms operate on a net-30 day payment schedule. Overdue invoices beyond 14 days incur a 2.5% monthly administration charge.',
    category: 'Finance & Billing',
    isActive: true,
  },
  {
    id: 'POL-03',
    name: 'Supplier Quality & Expiry Guarantee',
    createdAt: '2025-03-01 11:20 AM',
    detail:
      'Suppliers must deliver goods with at least 80% remaining shelf life from production date. Any damaged cartons or compromised seals during intake inspection are rejected on delivery.',
    category: 'Inventory & Procurement',
    isActive: true,
  },
  {
    id: 'POL-04',
    name: 'Data Privacy & Terminal Security Protocol',
    createdAt: '2025-04-12 04:10 PM',
    detail:
      'Branch staff must not export or share customer phone numbers or transaction histories. All POS workstations auto-lock after 15 minutes of inactivity.',
    category: 'Security & Compliance',
    isActive: true,
  },
]
