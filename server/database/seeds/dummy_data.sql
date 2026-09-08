-- Dummy B2B admins + Branch Managers only (no Inventory Managers).
-- Inventory Managers / Cashiers are created by Branch Manager via Staff Management.
-- {{PASSWORD_HASH}} is replaced by database/seeds/seed.js
-- Demo password (seeded users only): password

INSERT INTO tenants (id, name, slug) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Company A', 'company-a'),
  ('22222222-2222-2222-2222-222222222222', 'Company B', 'company-b'),
  ('33333333-3333-3333-3333-333333333333', 'SoftwareFlux', 'softwareflux')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO branches (id, tenant_id, name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', 'Company A - Wah Cantt'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '11111111-1111-1111-1111-111111111111', 'Company A - Haripur'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '22222222-2222-2222-2222-222222222222', 'Company B - Taxilla')
ON CONFLICT (id) DO NOTHING;

-- Remove previously seeded Inventory Managers (and their staff rows)
DELETE FROM staff
WHERE user_id IN (
  'a3333333-3333-3333-3333-333333333333',
  'b3333333-3333-3333-3333-333333333333'
);

DELETE FROM users
WHERE id IN (
  'a3333333-3333-3333-3333-333333333333',
  'b3333333-3333-3333-3333-333333333333'
)
OR (
  tenant_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
  )
  AND email IN (
    'inventory@companya.local',
    'inventory@companyb.local'
  )
);

-- B2B Admins + Branch Managers only (upsert by primary key)
INSERT INTO users (id, tenant_id, branch_id, role_id, full_name, email, password_hash) VALUES
  -- Company A: B2B Admin
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, 3, 'Asad', 'admin@companya.local', '{{PASSWORD_HASH}}'),
  -- Company A: 2 Branch Managers (Wah Cantt + Haripur)
  ('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 2, 'Bilal Khan', 'branch.wah@companya.local', '{{PASSWORD_HASH}}'),
  ('a4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 2, 'Sara Ahmed', 'branch.haripur@companya.local', '{{PASSWORD_HASH}}'),
  -- Company B: B2B Admin
  ('b1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', NULL, 3, 'Hassan Raza', 'admin@companyb.local', '{{PASSWORD_HASH}}'),
  -- Company B: 1 Branch Manager (Taxilla)
  ('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 2, 'Omar Sheikh', 'branch@companyb.local', '{{PASSWORD_HASH}}'),
  -- SoftwareFlux: B2B Admin (upward product flow — password: admin123)
  ('c1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', NULL, 3, 'SoftwareFlux Admin', 'softwareflux@company.com', '{{ADMIN123_HASH}}')
ON CONFLICT (id) DO UPDATE
SET
  tenant_id = EXCLUDED.tenant_id,
  branch_id = EXCLUDED.branch_id,
  role_id = EXCLUDED.role_id,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  is_active = true;

-- Drop legacy Company A BM email if a duplicate row still exists
DELETE FROM users
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
  AND email = 'branch@companya.local'
  AND id <> 'a2222222-2222-2222-2222-222222222222';

INSERT INTO scoring_scales (tenant_id, code, name, max_points) VALUES
  ('11111111-1111-1111-1111-111111111111', 'punctuality', 'Punctuality', 10),
  ('11111111-1111-1111-1111-111111111111', 'sales_target', 'Sales target', 20),
  ('11111111-1111-1111-1111-111111111111', 'customer_service', 'Customer service', 15),
  ('22222222-2222-2222-2222-222222222222', 'punctuality', 'Punctuality', 10),
  ('22222222-2222-2222-2222-222222222222', 'sales_target', 'Sales target', 20),
  ('22222222-2222-2222-2222-222222222222', 'customer_service', 'Customer service', 15),
  ('33333333-3333-3333-3333-333333333333', 'punctuality', 'Punctuality', 10),
  ('33333333-3333-3333-3333-333333333333', 'sales_target', 'Sales target', 20),
  ('33333333-3333-3333-3333-333333333333', 'customer_service', 'Customer service', 15)
ON CONFLICT (tenant_id, code) DO NOTHING;

INSERT INTO taxes (id, tenant_id, name, rate_percent) VALUES
  ('aa111111-1111-1111-1111-111111111101', '11111111-1111-1111-1111-111111111111', 'GST', 17),
  ('aa111111-1111-1111-1111-111111111102', '11111111-1111-1111-1111-111111111111', 'Service', 5),
  ('bb111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222222', 'GST', 17),
  ('bb111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222222', 'Service', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO offers (id, tenant_id, name, percent) VALUES
  ('aa222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'Seasonal', 10),
  ('bb222222-2222-2222-2222-222222222201', '22222222-2222-2222-2222-222222222222', 'Seasonal', 10)
ON CONFLICT (id) DO NOTHING;

-- Staff designations (B2B Admin master data). BM assigns staff roles from dropdown.
INSERT INTO designations (tenant_id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Inventory Manager'),
  ('11111111-1111-1111-1111-111111111111', 'Cashier'),
  ('11111111-1111-1111-1111-111111111111', 'Production Staff'),
  ('11111111-1111-1111-1111-111111111111', 'Delivery Staff'),
  ('11111111-1111-1111-1111-111111111111', 'Website Manager'),
  ('22222222-2222-2222-2222-222222222222', 'Inventory Manager'),
  ('22222222-2222-2222-2222-222222222222', 'Cashier'),
  ('22222222-2222-2222-2222-222222222222', 'Production Staff'),
  ('22222222-2222-2222-2222-222222222222', 'Delivery Staff'),
  ('22222222-2222-2222-2222-222222222222', 'Website Manager'),
  ('33333333-3333-3333-3333-333333333333', 'Inventory Manager'),
  ('33333333-3333-3333-3333-333333333333', 'Cashier'),
  ('33333333-3333-3333-3333-333333333333', 'Production Staff'),
  ('33333333-3333-3333-3333-333333333333', 'Delivery Staff'),
  ('33333333-3333-3333-3333-333333333333', 'Website Manager'),
  ('33333333-3333-3333-3333-333333333333', 'Branch Manager')
ON CONFLICT (tenant_id, name) DO NOTHING;
