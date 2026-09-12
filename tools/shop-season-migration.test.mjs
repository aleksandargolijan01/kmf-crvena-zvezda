// Runs the real migration chain and a legacy-data upgrade on a fresh disposable database.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const connection = process.env.SHOP_TEST_DATABASE_URL;
const url = new URL(connection ?? 'http://invalid');
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/shop_phase1_test') throw Error('A fresh local shop_phase1_test database is required.');
if (!process.env.SHOP_TEST_PSQL) throw Error('Set SHOP_TEST_PSQL to the PostgreSQL psql executable.');
const directory = new URL('../backend/prisma/migrations/', import.meta.url);
const migrations = (await readdir(directory, { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
assert.equal(migrations.at(-1), '20260912120000_season_ticket_full_name');
const sql = [String.raw`DO $$ BEGIN IF to_regclass('public."User"') IS NOT NULL THEN RAISE EXCEPTION 'Database must be empty'; END IF; END $$;`];
for (const migration of migrations.slice(0, -1)) sql.push(await readFile(new URL(migration + '/migration.sql', directory), 'utf8'));
sql.push(String.raw`
INSERT INTO "SeasonTicket" ("id", "seasonKey", "cardNumber", "verificationMethod", "verifierHash", "verifierKeyVersion", "version", "updatedAt")
VALUES ('legacy-migration-test', 'OLD', 'TEST-001', 'PIN', 'preserved-old-hash', 1, 7, CURRENT_TIMESTAMP),
       ('legacy-numeric-test', 'OLD', '000123', 'LAST_NAME', 'preserved-name-hash', 1, 2, CURRENT_TIMESTAMP);
CREATE TEMP TABLE legacy_before AS SELECT "id", to_jsonb(t) AS original FROM "SeasonTicket" t;
`);
sql.push(await readFile(new URL(migrations.at(-1) + '/migration.sql', directory), 'utf8'));
sql.push(String.raw`
DO $$ BEGIN
  IF (SELECT count(*) FROM "SeasonTicket") <> 2 OR EXISTS (
    SELECT 1 FROM "SeasonTicket" t JOIN legacy_before b ON b.id = t.id
    WHERE to_jsonb(t) - 'fullName' <> b.original OR t."fullName" IS NOT NULL
  ) THEN RAISE EXCEPTION 'Legacy data changed'; END IF;
  BEGIN
    UPDATE "SeasonTicket" SET "fullName" = 'Тест Купац' WHERE id = 'legacy-migration-test';
    RAISE EXCEPTION 'Nonnumeric completed card accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE "SeasonTicket" SET "fullName" = 'Тест Купац', "verificationMethod" = 'FULL_NAME' WHERE id = 'legacy-numeric-test';
  IF (SELECT "cardNumber" FROM "SeasonTicket" WHERE id = 'legacy-numeric-test') <> '000123' THEN RAISE EXCEPTION 'Leading zeros lost'; END IF;
END $$;
`);
execFileSync(process.env.SHOP_TEST_PSQL, ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-d', connection], { input: sql.join('\n'), env: { ...process.env, PGCLIENTENCODING: 'UTF8' }, stdio: ['pipe', 'pipe', 'pipe'] });
console.log(`PASS ${migrations.length} real migrations: legacy records/fields preserved, missing names stay null, numeric constraint and leading zeros.`);
