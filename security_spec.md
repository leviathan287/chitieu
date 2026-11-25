# Security Specification — Sổ Chi Tiêu (`bills`)

## 1. Data Invariants
1. **Strict Ownership**: Every document in `/bills/{billId}` must contain `userId == request.auth.uid` on creation, and `userId` is immutable on updates. Only the owner with a verified email (`request.auth.token.email_verified == true`) can read, list, create, update, or delete their own bills.
2. **Schema & Key Rigidity**: Creation requires exact keys `['userId', 'name', 'amount', 'date', 'category', 'isPaid', 'createdAt', 'updatedAt']` (`hasAll` + `hasOnly`), preventing shadow/ghost fields. Updates only permit `['isPaid', 'category', 'updatedAt']` or `['name', 'amount', 'date', 'category', 'isPaid', 'updatedAt']` via `affectedKeys().hasOnly(...)`.
3. **Path Variable Hardening**: Single-document operations (`get`, `create`, `update`, `delete`) require `billId` to match `^[a-zA-Z0-9_-]+$` and length `<= 128`.
4. **Value & Boundary Integrity**:
   - `name` must be a non-empty trimmed/valid string (`1 <= size <= 120`).
   - `amount` must be a finite number (`amount is int || amount is float`) strictly `> 0` and `<= 1000000000000`.
   - `date` must be a 10-character `YYYY-MM-DD` string matching `^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$`.
   - `category` must be one of `['Ăn uống', 'Mua sắm', 'Học phí', 'Du lịch', 'Thể thao', 'Khác']`.
   - `isPaid` must be a boolean (`is bool`).
5. **Temporal Integrity**: `createdAt == request.time` on create and `incoming().createdAt == existing().createdAt` on update; `updatedAt == request.time` on both create and update.
6. **Zero-Trust Queries**: `allow list` explicitly evaluates `resource.data.userId == request.auth.uid` with zero `get()` or `exists()` calls.

## 2. The "Dirty Dozen" Adversarial Payloads (All Must Yield `PERMISSION_DENIED`)
1. **Unauthenticated Write**: Create bill without `request.auth`.
2. **Unverified Email**: Create bill with `request.auth.token.email_verified == false`.
3. **Identity Spoofing on Create**: `userId: "other-user-uid"` while authenticated as `"attacker-uid"`.
4. **Cross-User Read (`get`)**: User B attempts `get` on User A's `/bills/{billId}`.
5. **Blanket List Scraping**: User queries `/bills` without `where('userId', '==', auth.uid)`.
6. **Shadow / Ghost Field Injection**: Create payload includes `isAdmin: true` or `extra: "junk"`.
7. **Owner Transfer on Update**: Owner attempts to update `userId` to another UID.
8. **CreatedAt Tampering on Update**: Owner attempts to modify `createdAt`.
9. **Client-Forged Timestamp**: Create or update with client `Date` instead of `request.time` (`serverTimestamp()`).
10. **Negative or Zero Amount**: Create or update with `amount: 0` or `amount: -50000` or `amount: "50000"`.
11. **Malformed Date String / Oversized Name**: Create with `date: "2026/11/23"` or `name` > 120 characters or `name: ""`.
12. **Document ID Poisoning**: Create at `/bills/../../etc/passwd` or 500-char ID.
