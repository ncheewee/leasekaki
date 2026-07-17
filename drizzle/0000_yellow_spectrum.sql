CREATE TYPE "public"."lister_kind" AS ENUM('owner', 'agent');--> statement-breakpoint
CREATE TYPE "public"."listing_kind" AS ENUM('hdb_whole_unit', 'hdb_room', 'private_whole_unit', 'private_room');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"kind" "listing_kind" NOT NULL,
	"lister_kind" "lister_kind" DEFAULT 'owner' NOT NULL,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"estate" text NOT NULL,
	"address_hint" text NOT NULL,
	"exact_unit" text,
	"bedrooms" text NOT NULL,
	"furnishing" text NOT NULL,
	"available_from" text NOT NULL,
	"asking_rent" integer NOT NULL,
	"suggested_rent_min" integer,
	"suggested_rent_max" integer,
	"rent_evidence" jsonb,
	"photo_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
