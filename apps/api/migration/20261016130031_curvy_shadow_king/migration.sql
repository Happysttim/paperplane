CREATE TYPE "provider" AS ENUM('google', 'naver', 'local');--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"address" varchar(254) NOT NULL,
	"verified_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"src_email" varchar(50) NOT NULL UNIQUE,
	"domain_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forwards" (
	"id" serial PRIMARY KEY,
	"email_id" integer NOT NULL,
	"rule" json DEFAULT '[]',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"forward_email" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premiums" (
	"user_id" integer PRIMARY KEY,
	"started_at" timestamp NOT NULL,
	"expired_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY,
	"refresh_hash" text NOT NULL UNIQUE,
	"user_id" integer NOT NULL,
	"revoke" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"user_email" varchar(50) UNIQUE,
	"name" varchar(10) NOT NULL,
	"password_hash" text,
	"provider" "provider" DEFAULT 'local'::"provider" NOT NULL,
	"provider_id" varchar(100),
	"has_premium" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "delivery_email_created" ON "deliveries" ("email_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "destination_user_address" ON "destinations" ("user_id","address");--> statement-breakpoint
CREATE INDEX "user_id_index" ON "emails" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "src_email_index" ON "emails" ("src_email");--> statement-breakpoint
CREATE INDEX "refresh_hash_index" ON "sessions" ("refresh_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_index" ON "users" ("user_email");--> statement-breakpoint
CREATE UNIQUE INDEX "user_provider_index" ON "users" ("provider","provider_id");--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_email_id_emails_id_fkey" FOREIGN KEY ("email_id") REFERENCES "emails"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id");--> statement-breakpoint
ALTER TABLE "forwards" ADD CONSTRAINT "forwards_email_id_emails_id_fkey" FOREIGN KEY ("email_id") REFERENCES "emails"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "premiums" ADD CONSTRAINT "premiums_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;