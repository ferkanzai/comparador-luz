CREATE TABLE "bill" (
	"user_id" text NOT NULL,
	"id" uuid NOT NULL,
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "bill_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"month" text NOT NULL,
	"period_start" date,
	"period_end" date,
	"provider" varchar(100) NOT NULL,
	"paid" numeric NOT NULL,
	"credit" numeric NOT NULL,
	"kwh" numeric,
	"consumption_kind" text NOT NULL,
	"peak_kwh" numeric,
	"flat_kwh" numeric,
	"valley_kwh" numeric,
	"review_signature" varchar(80),
	"review_reason" varchar(500),
	"notes" varchar(2000) NOT NULL,
	CONSTRAINT "bill_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "bill_breakdown" (
	"user_id" text NOT NULL,
	"bill_id" uuid NOT NULL,
	"energy" numeric NOT NULL,
	"power" numeric NOT NULL,
	"social" numeric NOT NULL,
	"snoee" numeric NOT NULL,
	"meter" numeric NOT NULL,
	"services" numeric NOT NULL,
	"electricity_tax" numeric NOT NULL,
	"vat" numeric NOT NULL,
	"services_vat" numeric NOT NULL,
	CONSTRAINT "bill_breakdown_user_id_bill_id_pk" PRIMARY KEY("user_id","bill_id")
);
--> statement-breakpoint
CREATE TABLE "bill_profile" (
	"user_id" text NOT NULL,
	"bill_id" uuid NOT NULL,
	"days" numeric,
	"peak_kwh" numeric,
	"flat_kwh" numeric,
	"valley_kwh" numeric,
	"peak_kw" numeric,
	"valley_kw" numeric,
	"taxes" boolean NOT NULL,
	"vat" numeric,
	"electricity_tax" numeric,
	"minimum_tax" boolean NOT NULL,
	CONSTRAINT "bill_profile_user_id_bill_id_pk" PRIMARY KEY("user_id","bill_id")
);
--> statement-breakpoint
CREATE TABLE "bill_tariff" (
	"user_id" text NOT NULL,
	"bill_id" uuid NOT NULL,
	"tariff_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"provider" varchar(100) NOT NULL,
	"kind" text NOT NULL,
	"energy_peak" numeric,
	"energy_flat" numeric,
	"energy_valley" numeric,
	"power_peak" numeric,
	"power_valley" numeric,
	"power_kind" text NOT NULL,
	"power_unit" text NOT NULL,
	"meter_day" numeric,
	"meter_estimate" text NOT NULL,
	"social_day" numeric,
	"social_estimate" text NOT NULL,
	"social_in_electricity_tax" boolean NOT NULL,
	"snoee_kwh" numeric,
	"services_month" numeric,
	"url" varchar(2000) NOT NULL,
	"checked_on" date,
	"valid_until" date,
	"notes" varchar(2000) NOT NULL,
	CONSTRAINT "bill_tariff_user_id_bill_id_pk" PRIMARY KEY("user_id","bill_id")
);
--> statement-breakpoint
CREATE TABLE "save_rate" (
	"user_id" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tariff" (
	"user_id" text NOT NULL,
	"id" uuid NOT NULL,
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "tariff_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" varchar(100) NOT NULL,
	"provider" varchar(100) NOT NULL,
	"kind" text NOT NULL,
	"energy_peak" numeric,
	"energy_flat" numeric,
	"energy_valley" numeric,
	"power_peak" numeric,
	"power_valley" numeric,
	"power_kind" text NOT NULL,
	"power_unit" text NOT NULL,
	"meter_day" numeric,
	"meter_estimate" text NOT NULL,
	"social_day" numeric,
	"social_estimate" text NOT NULL,
	"social_in_electricity_tax" boolean NOT NULL,
	"snoee_kwh" numeric,
	"services_month" numeric,
	"url" varchar(2000) NOT NULL,
	"checked_on" date,
	"valid_until" date,
	"notes" varchar(2000) NOT NULL,
	CONSTRAINT "tariff_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "tariff_period" (
	"user_id" text NOT NULL,
	"id" uuid NOT NULL,
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "tariff_period_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"tariff_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"provider" varchar(100) NOT NULL,
	"kind" text NOT NULL,
	"energy_peak" numeric,
	"energy_flat" numeric,
	"energy_valley" numeric,
	"power_peak" numeric,
	"power_valley" numeric,
	"power_kind" text NOT NULL,
	"power_unit" text NOT NULL,
	"meter_day" numeric,
	"meter_estimate" text NOT NULL,
	"social_day" numeric,
	"social_estimate" text NOT NULL,
	"social_in_electricity_tax" boolean NOT NULL,
	"snoee_kwh" numeric,
	"services_month" numeric,
	"url" varchar(2000) NOT NULL,
	"checked_on" date,
	"valid_until" date,
	"notes" varchar(2000) NOT NULL,
	CONSTRAINT "tariff_period_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"user_id" text PRIMARY KEY NOT NULL,
	"days" numeric,
	"peak_kwh" numeric,
	"flat_kwh" numeric,
	"valley_kwh" numeric,
	"peak_kw" numeric,
	"valley_kw" numeric,
	"taxes" boolean NOT NULL,
	"vat" numeric,
	"electricity_tax" numeric,
	"minimum_tax" boolean NOT NULL,
	"current_tariff_id" uuid,
	"current_since" date
);
--> statement-breakpoint
ALTER TABLE "bill" ADD CONSTRAINT "bill_user_id_workspace_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."workspace"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_breakdown" ADD CONSTRAINT "bill_breakdown_user_id_bill_id_bill_user_id_id_fk" FOREIGN KEY ("user_id","bill_id") REFERENCES "public"."bill"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_profile" ADD CONSTRAINT "bill_profile_user_id_bill_id_bill_user_id_id_fk" FOREIGN KEY ("user_id","bill_id") REFERENCES "public"."bill"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_tariff" ADD CONSTRAINT "bill_tariff_user_id_bill_id_bill_user_id_id_fk" FOREIGN KEY ("user_id","bill_id") REFERENCES "public"."bill"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tariff" ADD CONSTRAINT "tariff_user_id_workspace_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."workspace"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tariff_period" ADD CONSTRAINT "tariff_period_user_id_workspace_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."workspace"("user_id") ON DELETE cascade ON UPDATE no action;