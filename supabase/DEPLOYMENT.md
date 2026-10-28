# Feature database deployment

On 2026-10-28, the following migrations were applied together in one transaction to the Kairos project `llmdxlglapimgoupgdjv` through the signed-in Dashboard SQL Editor:

- `20261028075337_appointment_management.sql`
- `20261028080905_chat_conversations.sql`

Before deployment, the exact additive DDL and two-user synthetic access tests passed inside a transaction that was rolled back. Metadata then confirmed both new tables and both added chat columns were absent. After committing deployment, the same access tests passed again and all synthetic users/rows were rolled back.

## Reproducible access tests

`tests/feature_access_rollback.sql` requires **both** feature migrations. Run it as the project's privileged SQL role only after inspecting auth.users triggers: it creates two synthetic auth users and relies on every triggered action being transactional. On this project, the only user trigger inserted a profile row; it made no external calls.

Tests cover owner CRUD, cross-user read/write denial, ownership transfer denial, cross-owner conversation foreign keys, retry-safe upserts, summary JSON roundtrip, legacy chat compatibility, conversation cascade behavior and unauthenticated denial. All reads/writes are scoped to random synthetic IDs, and the script ends with ROLLBACK. If a client stops execution after an error, execute ROLLBACK before doing anything else. Do not remove the rollback or reuse the script to persist test users.

## Migration history

The project had no `supabase_migrations.schema_migrations` registry. Dashboard execution did **not** register these versions with the CLI. Before using a future CLI `db push`, link the correct project, compare its live schema with these files, and repair migration history as already applied rather than replaying CREATE TABLE statements. Do not reset the production database.

## Validation boundaries

SQL role/JWT simulation verifies actual PostgreSQL policies and persistence. It does not exercise browser email OTP, a real user's AI response, or a physical phone. Those are distinct acceptance checks; no real patient data or external AI requests were used by these tests.
