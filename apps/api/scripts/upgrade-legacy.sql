-- Legacy schema at checkpoint 64d19db. Run only through db:upgrade-legacy.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'user_id') THEN
    RAISE EXCEPTION 'Database is already upgraded or does not match the legacy schema';
  END IF;
  IF to_regclass('drizzle.__drizzle_migrations') IS NOT NULL THEN
    RAISE EXCEPTION 'Database already has a migration journal; inspect it before upgrading';
  END IF;
END $$;
ALTER TABLE sessions RENAME TO legacy_sessions;
ALTER SEQUENCE sessions_id_seq RENAME TO legacy_sessions_id_seq;
ALTER INDEX sessions_pkey RENAME TO legacy_sessions_pkey;
ALTER INDEX refresh_hash_index RENAME TO legacy_refresh_hash_index;
UPDATE legacy_sessions SET revoke = true;
ALTER TABLE users ALTER COLUMN user_email TYPE varchar(254);
ALTER TABLE emails ALTER COLUMN src_email TYPE varchar(254);
ALTER TABLE forwards ALTER COLUMN forward_email TYPE varchar(254);
ALTER TABLE domains ADD CONSTRAINT domains_name_unique UNIQUE(name);
CREATE UNIQUE INDEX user_provider_index ON users(provider, provider_id);
DROP INDEX user_id_index;
CREATE INDEX user_id_index ON emails(user_id);
DO $$ DECLARE item record; BEGIN
  FOR item IN SELECT conrelid::regclass AS table_name, conname FROM pg_constraint
    WHERE contype = 'f' AND conrelid IN ('emails'::regclass, 'forwards'::regclass, 'premiums'::regclass)
    AND confrelid IN ('users'::regclass, 'emails'::regclass)
  LOOP EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', item.table_name, item.conname); END LOOP;
END $$;
ALTER TABLE emails ADD CONSTRAINT emails_user_id_users_id_fkey FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE forwards ADD CONSTRAINT forwards_email_id_emails_id_fkey FOREIGN KEY(email_id) REFERENCES emails(id) ON DELETE CASCADE;
ALTER TABLE premiums ADD CONSTRAINT premiums_user_id_users_id_fkey FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE;
CREATE TABLE "deliveries" (
	"id" serial PRIMARY KEY,
	"event_id" varchar(100) NOT NULL UNIQUE,
	"email_id" integer NOT NULL,
	"destination" varchar(254) NOT NULL,
	"message_id" varchar(255) NOT NULL,
	"status" varchar(20) NOT NULL,
	"detail" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "destinations" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"address" varchar(254) NOT NULL,
	"verified_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY,
	"refresh_hash" text NOT NULL UNIQUE,
	"user_id" integer NOT NULL,
	"revoke" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
CREATE INDEX "delivery_email_created" ON "deliveries" ("email_id","created_at");
CREATE UNIQUE INDEX "destination_user_address" ON "destinations" ("user_id","address");
CREATE INDEX "refresh_hash_index" ON "sessions" ("refresh_hash");
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_email_id_emails_id_fkey" FOREIGN KEY ("email_id") REFERENCES "emails"("id") ON DELETE CASCADE;
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
