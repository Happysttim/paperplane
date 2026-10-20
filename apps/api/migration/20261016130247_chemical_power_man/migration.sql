ALTER TABLE "emails" ALTER COLUMN "src_email" SET DATA TYPE varchar(254) USING "src_email"::varchar(254);--> statement-breakpoint
ALTER TABLE "forwards" ALTER COLUMN "forward_email" SET DATA TYPE varchar(254) USING "forward_email"::varchar(254);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "user_email" SET DATA TYPE varchar(254) USING "user_email"::varchar(254);