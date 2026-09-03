/**
 * Dynamic Mock Data for Admin Settings & System Access Terminals (Multi-Tenant)
 */

export const COMPANY_A_SYSTEMS = [
  {
    id: 'SYS-WAH-POS-01',
    deviceName: 'System 1 (Wah Cantt Main POS Terminal)',
    hardwareSignature: 'HW-UUID-8891-B76A-99F1-E001',
    ipAddress: '192.168.10.45',
    macAddress: '00:1A:2B:3C:4D:5E',
    userId: 'bilal.khan@companya.local',
    userName: 'Bilal Khan (Branch Manager)',
    branch: 'Wah Cantt Flagship',
    lastActive: 'Just now',
    status: 'active', // 'active' | 'blocked'
  },
  {
    id: 'SYS-WAH-POS-02',
    deviceName: 'System 2 (Wah Cantt Checkout Counter B)',
    hardwareSignature: 'HW-UUID-4421-C88B-11D4-F002',
    ipAddress: '192.168.10.46',
    macAddress: '00:1A:2B:3C:4D:5F',
    userId: 'cashier1.wah@companya.local',
    userName: 'Zahid Hussain (Cashier)',
    branch: 'Wah Cantt Flagship',
    lastActive: '3 minutes ago',
    status: 'active',
  },
  {
    id: 'SYS-WAH-POS-03',
    deviceName: 'System 3 (Wah Cantt Aslam Market Terminal)',
    hardwareSignature: 'HW-UUID-9912-E22A-55F3-A003',
    ipAddress: '192.168.10.72',
    macAddress: '48:2C:6A:1E:9B:01',
    userId: 'usman.tariq@companya.local',
    userName: 'Usman Tariq (Branch Manager)',
    branch: 'Wah Cantt Aslam Market',
    lastActive: '12 minutes ago',
    status: 'active',
  },
  {
    id: 'SYS-WAH-POS-04',
    deviceName: 'System 4 (Wah Cantt Officers Colony POS)',
    hardwareSignature: 'HW-UUID-3301-A44C-77E2-B004',
    ipAddress: '192.168.10.90',
    macAddress: '24:4B:FE:8A:22:9C',
    userId: 'hamza.malik@companya.local',
    userName: 'Hamza Malik (Branch Manager)',
    branch: 'Wah Cantt Officers Colony',
    lastActive: '18 minutes ago',
    status: 'active',
  },
  {
    id: 'SYS-TXL-POS-01',
    deviceName: 'System 5 (Taxilla Junction Floor Terminal)',
    hardwareSignature: 'HW-UUID-7719-D99E-66B8-C005',
    ipAddress: '192.168.30.88',
    macAddress: '6C:40:08:92:DF:33',
    userId: 'omar.sheikh@companya.local',
    userName: 'Omar Sheikh (Branch Manager)',
    branch: 'Taxilla Junction',
    lastActive: '1 hour ago',
    status: 'active',
  },
  {
    id: 'SYS-UNRECOGNIZED-99',
    deviceName: 'System 6 (Unverified Remote Laptop)',
    hardwareSignature: 'HW-UUID-0019-XXXX-YYYY-Z999',
    ipAddress: '182.180.99.14',
    macAddress: 'AA:BB:CC:DD:EE:FF',
    userId: 'unknown.device@companya.local',
    userName: 'Unknown External Device',
    branch: 'Remote Network',
    lastActive: '3 days ago',
    status: 'blocked',
  },
]

export const COMPANY_B_SYSTEMS = [
  {
    id: 'SYS-HRP-POS-01',
    deviceName: 'System 1 (Haripur Central Main POS)',
    hardwareSignature: 'HW-UUID-1102-HRP1-88A2-B001',
    ipAddress: '192.168.20.10',
    macAddress: '12:34:56:78:9A:BC',
    userId: 'sara.ahmed@companyb.local',
    userName: 'Sara Ahmed (Branch Manager)',
    branch: 'Haripur Central',
    lastActive: 'Just now',
    status: 'active',
  },
  {
    id: 'SYS-HRP-POS-02',
    deviceName: 'System 2 (Haripur Model Town Terminal)',
    hardwareSignature: 'HW-UUID-2204-HRP2-99B3-C002',
    ipAddress: '192.168.20.25',
    macAddress: '23:45:67:89:AB:CD',
    userId: 'kashif.mehmood@companyb.local',
    userName: 'Kashif Mehmood (Branch Manager)',
    branch: 'Haripur Model Town',
    lastActive: '5 minutes ago',
    status: 'active',
  },
  {
    id: 'SYS-HRP-POS-03',
    deviceName: 'System 3 (Haripur Main Bazar Counter)',
    hardwareSignature: 'HW-UUID-3306-HRP3-AA4D-D003',
    ipAddress: '192.168.20.30',
    macAddress: '34:56:78:9A:BC:DE',
    userId: 'naveed.akhtar@companyb.local',
    userName: 'Naveed Akhtar (Branch Manager)',
    branch: 'Haripur Main Bazar',
    lastActive: '25 minutes ago',
    status: 'active',
  },
  {
    id: 'SYS-HVL-POS-01',
    deviceName: 'System 4 (Havelian Express POS Terminal)',
    hardwareSignature: 'HW-UUID-4408-HVL1-BB5E-E004',
    ipAddress: '192.168.20.50',
    macAddress: '45:67:89:AB:CD:EF',
    userId: 'zubair.shah@companyb.local',
    userName: 'Zubair Shah (Branch Manager)',
    branch: 'Havelian Express',
    lastActive: '2 hours ago',
    status: 'blocked',
  },
  {
    id: 'SYS-UNVERIFIED-B01',
    deviceName: 'System 5 (Unregistered Tablet Device)',
    hardwareSignature: 'HW-UUID-9999-UNKN-FFFF-Z005',
    ipAddress: '175.107.12.88',
    macAddress: 'FF:EE:DD:CC:BB:AA',
    userId: 'guest@companyb.local',
    userName: 'Unverified Mobile Tablet',
    branch: 'Remote Network',
    lastActive: '1 day ago',
    status: 'blocked',
  },
]

export const INITIAL_SYSTEM_ACCESS_DATA = COMPANY_A_SYSTEMS

export function getSystemsForTenant(tenantSlug) {
  if (tenantSlug === 'company-b') {
    return COMPANY_B_SYSTEMS
  }
  return COMPANY_A_SYSTEMS
}

