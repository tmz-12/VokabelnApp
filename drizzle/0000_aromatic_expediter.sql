CREATE TYPE "public"."appearance" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TYPE "public"."learning_status" AS ENUM('new', 'learning', 'known');--> statement-breakpoint
CREATE TYPE "public"."ui_locale" AS ENUM('de', 'en', 'zh-TW');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."study_mode" AS ENUM('continue', 'new', 'learning', 'known-review', 'favorites', 'priority', 'c2-upgrade');--> statement-breakpoint
CREATE TYPE "public"."study_session_status" AS ENUM('active', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."vocabulary_level" AS ENUM('C1', 'C2');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" text PRIMARY KEY NOT NULL,
	"code" varchar(80) NOT NULL,
	"localization_key" varchar(120) NOT NULL,
	"icon_key" varchar(80) NOT NULL,
	"category" varchar(40) NOT NULL,
	"criteria" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "badges_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" text PRIMARY KEY NOT NULL,
	"collection_id" text NOT NULL,
	"chapter_number" integer NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" text PRIMARY KEY NOT NULL,
	"code" varchar(80) NOT NULL,
	"name" text NOT NULL,
	"source_version" varchar(40),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collections_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "daily_activity" (
	"user_id" text NOT NULL,
	"local_date" date NOT NULL,
	"unique_words_reviewed" integer DEFAULT 0 NOT NULL,
	"sessions_completed" integer DEFAULT 0 NOT NULL,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"daily_goal_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_activity_user_id_local_date_pk" PRIMARY KEY("user_id","local_date")
);
--> statement-breakpoint
CREATE TABLE "daily_reviewed_vocabulary" (
	"user_id" text NOT NULL,
	"local_date" date NOT NULL,
	"vocabulary_id" text NOT NULL,
	"first_reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_reviewed_vocabulary_user_id_local_date_vocabulary_id_pk" PRIMARY KEY("user_id","local_date","vocabulary_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "study_session_items" (
	"id" text PRIMARY KEY NOT NULL,
	"study_session_id" text NOT NULL,
	"vocabulary_id" text NOT NULL,
	"base_position" integer NOT NULL,
	"presentation_count" integer DEFAULT 0 NOT NULL,
	"requeue_count" integer DEFAULT 0 NOT NULL,
	"final_outcome" "learning_status",
	"last_answered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"chapter_id" text,
	"mode" "study_mode" NOT NULL,
	"requested_size" integer NOT NULL,
	"status" "study_session_status" DEFAULT 'active' NOT NULL,
	"base_item_count" integer NOT NULL,
	"current_position" integer DEFAULT 0 NOT NULL,
	"queue" jsonb NOT NULL,
	"result_snapshot" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"user_id" text NOT NULL,
	"badge_id" text NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_badges_user_id_badge_id_pk" PRIMARY KEY("user_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"ui_locale" "ui_locale" DEFAULT 'de' NOT NULL,
	"appearance" "appearance" DEFAULT 'system' NOT NULL,
	"session_size" integer DEFAULT 20 NOT NULL,
	"daily_goal_words" integer DEFAULT 20 NOT NULL,
	"secondary_translation_visible" boolean DEFAULT true NOT NULL,
	"sound_effects_enabled" boolean DEFAULT false NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"timezone" varchar(80) DEFAULT 'Europe/Berlin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_vocabulary_state" (
	"user_id" text NOT NULL,
	"vocabulary_id" text NOT NULL,
	"favorite" boolean DEFAULT false NOT NULL,
	"status" "learning_status" DEFAULT 'new' NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone,
	"first_known_at" timestamp with time zone,
	"review_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_vocabulary_state_user_id_vocabulary_id_pk" PRIMARY KEY("user_id","vocabulary_id")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocabulary" (
	"id" text PRIMARY KEY NOT NULL,
	"collection_id" text NOT NULL,
	"chapter_id" text,
	"level" "vocabulary_level" NOT NULL,
	"group_label" text NOT NULL,
	"order_in_chapter" integer,
	"order_in_group" integer NOT NULL,
	"headword" text NOT NULL,
	"german" text NOT NULL,
	"english" text NOT NULL,
	"traditional_chinese" text NOT NULL,
	"source_reference" text,
	"forms_raw" text,
	"examples_german" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"chunks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_key" boolean DEFAULT false NOT NULL,
	"is_c2_upgrade" boolean DEFAULT false NOT NULL,
	"source_page" integer NOT NULL,
	"search_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocabulary_overrides" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"vocabulary_id" text NOT NULL,
	"english_override" varchar(2000),
	"traditional_chinese_override" varchar(2000),
	"examples_german_override" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xp_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"event_type" varchar(80) NOT NULL,
	"points" integer NOT NULL,
	"vocabulary_id" text,
	"chapter_id" text,
	"study_session_id" text,
	"dedupe_key" varchar(220),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_activity" ADD CONSTRAINT "daily_activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reviewed_vocabulary" ADD CONSTRAINT "daily_reviewed_vocabulary_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reviewed_vocabulary" ADD CONSTRAINT "daily_reviewed_vocabulary_vocabulary_id_vocabulary_id_fk" FOREIGN KEY ("vocabulary_id") REFERENCES "public"."vocabulary"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_session_items" ADD CONSTRAINT "study_session_items_study_session_id_study_sessions_id_fk" FOREIGN KEY ("study_session_id") REFERENCES "public"."study_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_session_items" ADD CONSTRAINT "study_session_items_vocabulary_id_vocabulary_id_fk" FOREIGN KEY ("vocabulary_id") REFERENCES "public"."vocabulary"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vocabulary_state" ADD CONSTRAINT "user_vocabulary_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vocabulary_state" ADD CONSTRAINT "user_vocabulary_state_vocabulary_id_vocabulary_id_fk" FOREIGN KEY ("vocabulary_id") REFERENCES "public"."vocabulary"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary" ADD CONSTRAINT "vocabulary_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary" ADD CONSTRAINT "vocabulary_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_overrides" ADD CONSTRAINT "vocabulary_overrides_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_overrides" ADD CONSTRAINT "vocabulary_overrides_vocabulary_id_vocabulary_id_fk" FOREIGN KEY ("vocabulary_id") REFERENCES "public"."vocabulary"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_vocabulary_id_vocabulary_id_fk" FOREIGN KEY ("vocabulary_id") REFERENCES "public"."vocabulary"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_study_session_id_study_sessions_id_fk" FOREIGN KEY ("study_session_id") REFERENCES "public"."study_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chapter_collection_number_uq" ON "chapters" USING btree ("collection_id","chapter_number");--> statement-breakpoint
CREATE INDEX "chapter_sort_idx" ON "chapters" USING btree ("collection_id","sort_order");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_item_vocab_uq" ON "study_session_items" USING btree ("study_session_id","vocabulary_id");--> statement-breakpoint
CREATE INDEX "session_item_session_idx" ON "study_session_items" USING btree ("study_session_id");--> statement-breakpoint
CREATE INDEX "study_session_user_status_idx" ON "study_sessions" USING btree ("user_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "user_vocab_status_idx" ON "user_vocabulary_state" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "user_vocab_favorite_idx" ON "user_vocabulary_state" USING btree ("user_id","favorite");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "vocabulary_chapter_idx" ON "vocabulary" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "vocabulary_level_idx" ON "vocabulary" USING btree ("level");--> statement-breakpoint
CREATE INDEX "vocabulary_key_idx" ON "vocabulary" USING btree ("is_key");--> statement-breakpoint
CREATE INDEX "vocabulary_source_order_idx" ON "vocabulary" USING btree ("chapter_id","order_in_chapter");--> statement-breakpoint
CREATE UNIQUE INDEX "override_user_vocab_uq" ON "vocabulary_overrides" USING btree ("user_id","vocabulary_id");--> statement-breakpoint
CREATE INDEX "override_user_idx" ON "vocabulary_overrides" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "xp_dedupe_uq" ON "xp_events" USING btree ("user_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "xp_user_created_idx" ON "xp_events" USING btree ("user_id","created_at");