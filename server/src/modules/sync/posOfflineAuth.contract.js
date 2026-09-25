/**
 * FluxOne-POS offline auth contract (bootstrap + delta)
 *
 * Cloud syncs branch_manager + cashier users with bcrypt password hashes so the
 * desktop POS can verify login offline after the first bootstrap.
 *
 * Snapshot path:
 *   data.users[]
 *
 * Each user item shape:
 *   {
 *     id, loginId, email, role, fullName, name,
 *     branchId, tenantId, isActive,
 *     passwordHash,  // bcrypt string, e.g. $2a$10$...
 *     password        // same value as passwordHash (alias)
 *   }
 *
 * POS rules (Cashier / Branch Manager desktop):
 *   1. On every bootstrap and delta, upsert data.users into the local SQLite DB.
 *   2. Store passwordHash (or password) locally — it is a bcrypt hash, NOT plaintext.
 *   3. Offline login: find user by loginId/email, then bcrypt.compare(typedPassword, passwordHash).
 *   4. Never log or display the hash. Treat it as a secret at rest.
 *   5. Cloud online login (POST /api/auth/login) still works for cashiers; this hash
 *      is only for local/offline verification after sync.
 *   6. When isActive becomes false, cloud stops sending that user — deactivate or
 *      delete the local row on the next sync.
 *   7. Password resets on cloud: next bootstrap/delta replaces local passwordHash.
 *
 * Roles included: branch_manager, cashier (same branch as the sync token).
 * b2b_admin is never included in this list.
 */

export const POS_OFFLINE_AUTH_FIELDS = Object.freeze({
  list: 'users',
  loginId: 'loginId',
  emailAlias: 'email',
  hash: 'passwordHash',
  hashAlias: 'password',
})
