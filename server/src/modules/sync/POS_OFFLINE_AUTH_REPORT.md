# POS Offline Auth — Password Sync Report

**For:** FluxOne-POS (Cashier / Branch Manager desktop)  
**From:** FluxOne Cloud (B2B)  
**Date:** 2026-09-25  
**Status:** Live on `GET /api/sync/bootstrap` and `GET /api/sync/delta`

---

## Problem we fixed

Cashier works on **cloud** (`POST /api/auth/login`).  
After the first BM login, the desktop app synced users **without** passwords, so local cashier / BM login showed **Invalid id or password**.

## What cloud now sends

On bootstrap / delta, `data.users[]` includes a **bcrypt password hash** for every active branch manager and cashier of that branch.

Example shape:

```json
{
  "id": "c78b2436-75c6-4c7f-a2f4-6b1f2ef36878",
  "loginId": "CS-Flux1",
  "email": "CS-Flux1",
  "role": "cashier",
  "fullName": "Asad Cashier",
  "name": "Asad Cashier",
  "branchId": "1f0eeee5-47b8-4a12-892b-9bf0430777a5",
  "tenantId": "33333333-3333-3333-3333-333333333333",
  "isActive": true,
  "passwordHash": "$2a$10$.......................................",
  "password": "$2a$10$......................................."
}
```

- `passwordHash` and `password` are the **same bcrypt hash** (not the real password text).
- Cloud never sends plaintext passwords.

## What POS must do

1. On bootstrap and every delta, **upsert** each `users[]` row into the local database.
2. Persist `passwordHash` (or `password`) next to `loginId` / `email`.
3. Offline login flow:
   - Look up user by `loginId` (or `email`)
   - Run `bcrypt.compare(typedPassword, storedHash)`
   - Allow login only if compare succeeds and `isActive` is true
4. Do **not** compare plaintext to plaintext — the field is a hash.
5. Do **not** print hashes in logs or UI.
6. When a user disappears from the next sync (deactivated on cloud), disable or remove the local row.
7. After a password change on cloud, the next sync replaces the local hash — no manual step.

## Verify in Postman

1. `POST /api/auth/login` as branch manager → copy `token` and `user.branchId`
2. `GET /api/sync/bootstrap?branchId=<branchId>` with `Authorization: Bearer <token>`
3. Confirm each user in `data.users` has `passwordHash` starting with `$2a$` or `$2b$`

## Cashier note

Cashier cloud login already works. After POS stores these hashes locally, the same cashier credentials (`CS-Flux1` + password) will also work **offline on the desktop** without calling the API.

Contract file in cloud repo: `server/src/modules/sync/posOfflineAuth.contract.js`
