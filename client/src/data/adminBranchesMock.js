/**
 * Dynamic Mock Data for Admin Branch Management (Multi-Tenant)
 */

export const COMPANY_A_BRANCHES = [
  {
    id: 'BR-WAH01',
    name: 'Wah Cantt Flagship Branch',
    location: 'Main GT Road, Wah Cantt, Punjab',
    createdAt: '2025-01-15 10:30 AM',
    status: 'open',
    image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=60',
    manager: {
      name: 'Bilal Khan',
      email: 'bilal.khan@companya.local',
      contact: '+92 301 5551234',
      otherContact: '+92 300 9876543',
      gender: 'Male',
      address: 'House 42, Sector B, Officers Colony, Wah Cantt',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    totalStaff: 18,
    activeTerminals: 4,
    monthlySales: 'Rs. 4.85 M',
  },
  {
    id: 'BR-WAH02',
    name: 'Wah Cantt Aslam Market Branch',
    location: 'Aslam Market, Nawababad, Wah Cantt',
    createdAt: '2025-03-10 11:15 AM',
    status: 'open',
    image: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=500&auto=format&fit=crop&q=60',
    manager: {
      name: 'Usman Tariq',
      email: 'usman.tariq@companya.local',
      contact: '+92 345 7773322',
      otherContact: '+92 321 8899001',
      gender: 'Male',
      address: 'Street 4, Lala Rukh, Wah Cantt',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    totalStaff: 12,
    activeTerminals: 3,
    monthlySales: 'Rs. 3.40 M',
  },
  {
    id: 'BR-WAH03',
    name: 'Wah Cantt Officers Colony Outlet',
    location: 'Officers Colony Market, Wah Cantt',
    createdAt: '2025-06-20 09:30 AM',
    status: 'open',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60',
    manager: {
      name: 'Hamza Malik',
      email: 'hamza.malik@companya.local',
      contact: '+92 300 1112233',
      otherContact: '+92 308 9988776',
      gender: 'Male',
      address: 'House 14, Sector A, Officers Colony, Wah Cantt',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
    totalStaff: 16,
    activeTerminals: 4,
    monthlySales: 'Rs. 4.10 M',
  },
  {
    id: 'BR-TXL01',
    name: 'Taxilla Junction Branch',
    location: 'Museum Road, Taxilla (Wah Extension)',
    createdAt: '2025-09-05 02:45 PM',
    status: 'open',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=60',
    manager: {
      name: 'Omar Sheikh',
      email: 'omar.sheikh@companya.local',
      contact: '+92 333 9988112',
      otherContact: '',
      gender: 'Male',
      address: 'Near Old Railway Station, Taxilla',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    },
    totalStaff: 10,
    activeTerminals: 2,
    monthlySales: 'Rs. 2.65 M',
  },
]

export const COMPANY_B_BRANCHES = [
  {
    id: 'BR-HRP01',
    name: 'Haripur Central Branch',
    location: 'Main Circular Road, Haripur, KPK',
    createdAt: '2025-02-10 10:00 AM',
    status: 'open',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=60',
    manager: {
      name: 'Sara Ahmed',
      email: 'sara.ahmed@companyb.local',
      contact: '+92 312 4448899',
      otherContact: '+92 333 1122334',
      gender: 'Female',
      address: 'Street 9, Model Town, Haripur',
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    },
    totalStaff: 14,
    activeTerminals: 3,
    monthlySales: 'Rs. 3.80 M',
  },
  {
    id: 'BR-HRP02',
    name: 'Haripur Model Town Branch',
    location: 'Sikandarabad Road, Model Town, Haripur',
    createdAt: '2025-05-18 01:30 PM',
    status: 'open',
    image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=60',
    manager: {
      name: 'Kashif Mehmood',
      email: 'kashif.mehmood@companyb.local',
      contact: '+92 301 6655443',
      otherContact: '',
      gender: 'Male',
      address: 'House 22, Sector 2, Model Town, Haripur',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    totalStaff: 11,
    activeTerminals: 2,
    monthlySales: 'Rs. 2.95 M',
  },
  {
    id: 'BR-HRP03',
    name: 'Haripur Main Bazar Outlet',
    location: 'Main Bazar Chowk, Haripur',
    createdAt: '2025-08-14 03:30 PM',
    status: 'open',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60',
    manager: {
      name: 'Naveed Akhtar',
      email: 'naveed.akhtar@companyb.local',
      contact: '+92 321 7766554',
      otherContact: '',
      gender: 'Male',
      address: 'Mohallah Afzalabad, Haripur',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    totalStaff: 9,
    activeTerminals: 2,
    monthlySales: 'Rs. 2.45 M',
  },
  {
    id: 'BR-HVL01',
    name: 'Havelian Express Branch',
    location: 'Main Karakoram Highway, Havelian (Haripur Sub-Division)',
    createdAt: '2025-11-14 03:30 PM',
    status: 'blocked',
    image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=500&auto=format&fit=crop&q=60',
    manager: {
      name: 'Zubair Shah',
      email: 'zubair.shah@companyb.local',
      contact: '+92 333 4455667',
      otherContact: '',
      gender: 'Male',
      address: 'Near Old Cantt, Havelian',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    },
    totalStaff: 8,
    activeTerminals: 0,
    monthlySales: 'Rs. 0 (Blocked)',
  },
]

export const INITIAL_BRANCHES_DATA = COMPANY_A_BRANCHES

export function getBranchesForTenant(tenantSlug) {
  if (tenantSlug === 'company-b') {
    return COMPANY_B_BRANCHES
  }
  return COMPANY_A_BRANCHES
}

