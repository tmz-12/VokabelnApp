import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const localeEnum = pgEnum("ui_locale", ["de", "en", "zh-TW"]);
export const appearanceEnum = pgEnum("appearance", ["light", "dark", "system"]);
export const roleEnum = pgEnum("user_role", ["user", "admin"]);
export const vocabularyLevelEnum = pgEnum("vocabulary_level", ["C1", "C2"]);
export const learningStatusEnum = pgEnum("learning_status", ["new", "learning", "known"]);
export const studyModeEnum = pgEnum("study_mode", [
  "continue",
  "new",
  "learning",
  "known-review",
  "favorites",
  "priority",
  "c2-upgrade",
]);
export const studySessionStatusEnum = pgEnum("study_session_status", [
  "active",
  "completed",
  "abandoned",
]);

// Better Auth core tables. Property names intentionally match its Drizzle adapter contract.
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [index("session_user_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [index("account_user_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  role: roleEnum("role").default("user").notNull(),
  uiLocale: localeEnum("ui_locale").default("de").notNull(),
  appearance: appearanceEnum("appearance").default("system").notNull(),
  sessionSize: integer("session_size").default(20).notNull(),
  dailyGoalWords: integer("daily_goal_words").default(20).notNull(),
  secondaryTranslationVisible: boolean("secondary_translation_visible").default(true).notNull(),
  soundEffectsEnabled: boolean("sound_effects_enabled").default(false).notNull(),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  timezone: varchar("timezone", { length: 80 }).default("Europe/Berlin").notNull(),
  ...timestamps,
});

export const collections = pgTable("collections", {
  id: text("id").primaryKey(),
  code: varchar("code", { length: 80 }).notNull().unique(),
  name: text("name").notNull(),
  sourceVersion: varchar("source_version", { length: 40 }),
  ...timestamps,
});

export const chapters = pgTable(
  "chapters",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
    chapterNumber: integer("chapter_number").notNull(),
    sortOrder: integer("sort_order").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("chapter_collection_number_uq").on(table.collectionId, table.chapterNumber),
    index("chapter_sort_idx").on(table.collectionId, table.sortOrder),
  ],
);

export const vocabulary = pgTable(
  "vocabulary",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id").notNull().references(() => collections.id, { onDelete: "restrict" }),
    chapterId: text("chapter_id").references(() => chapters.id, { onDelete: "restrict" }),
    level: vocabularyLevelEnum("level").notNull(),
    groupLabel: text("group_label").notNull(),
    orderInChapter: integer("order_in_chapter"),
    orderInGroup: integer("order_in_group").notNull(),
    headword: text("headword").notNull(),
    german: text("german").notNull(),
    english: text("english").notNull(),
    traditionalChinese: text("traditional_chinese").notNull(),
    sourceReference: text("source_reference"),
    formsRaw: text("forms_raw"),
    examplesGerman: jsonb("examples_german").$type<string[]>().default([]).notNull(),
    chunks: jsonb("chunks").$type<unknown[]>().default([]).notNull(),
    isKey: boolean("is_key").default(false).notNull(),
    isC2Upgrade: boolean("is_c2_upgrade").default(false).notNull(),
    sourcePage: integer("source_page").notNull(),
    searchText: text("search_text").notNull(),
    ...timestamps,
  },
  (table) => [
    index("vocabulary_chapter_idx").on(table.chapterId),
    index("vocabulary_level_idx").on(table.level),
    index("vocabulary_key_idx").on(table.isKey),
    index("vocabulary_source_order_idx").on(table.chapterId, table.orderInChapter),
  ],
);

export const userVocabularyState = pgTable(
  "user_vocabulary_state",
  {
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    vocabularyId: text("vocabulary_id").notNull().references(() => vocabulary.id, { onDelete: "cascade" }),
    favorite: boolean("favorite").default(false).notNull(),
    status: learningStatusEnum("status").default("new").notNull(),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
    firstKnownAt: timestamp("first_known_at", { withTimezone: true }),
    reviewCount: integer("review_count").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.vocabularyId] }),
    index("user_vocab_status_idx").on(table.userId, table.status),
    index("user_vocab_favorite_idx").on(table.userId, table.favorite),
  ],
);

export const vocabularyOverrides = pgTable(
  "vocabulary_overrides",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    vocabularyId: text("vocabulary_id").notNull().references(() => vocabulary.id, { onDelete: "cascade" }),
    englishOverride: varchar("english_override", { length: 2000 }),
    traditionalChineseOverride: varchar("traditional_chinese_override", { length: 2000 }),
    examplesGermanOverride: jsonb("examples_german_override").$type<string[] | null>(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("override_user_vocab_uq").on(table.userId, table.vocabularyId),
    index("override_user_idx").on(table.userId),
  ],
);

export const studySessions = pgTable(
  "study_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    chapterId: text("chapter_id").references(() => chapters.id, { onDelete: "restrict" }),
    mode: studyModeEnum("mode").notNull(),
    requestedSize: integer("requested_size").notNull(),
    status: studySessionStatusEnum("status").default("active").notNull(),
    baseItemCount: integer("base_item_count").notNull(),
    currentPosition: integer("current_position").default(0).notNull(),
    queue: jsonb("queue").$type<string[]>().notNull(),
    resultSnapshot: jsonb("result_snapshot").$type<Record<string, unknown> | null>(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("study_session_user_status_idx").on(table.userId, table.status, table.updatedAt)],
);

export const studySessionItems = pgTable(
  "study_session_items",
  {
    id: text("id").primaryKey(),
    studySessionId: text("study_session_id").notNull().references(() => studySessions.id, { onDelete: "cascade" }),
    vocabularyId: text("vocabulary_id").notNull().references(() => vocabulary.id, { onDelete: "restrict" }),
    basePosition: integer("base_position").notNull(),
    presentationCount: integer("presentation_count").default(0).notNull(),
    requeueCount: integer("requeue_count").default(0).notNull(),
    finalOutcome: learningStatusEnum("final_outcome"),
    lastAnsweredAt: timestamp("last_answered_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("session_item_vocab_uq").on(table.studySessionId, table.vocabularyId),
    index("session_item_session_idx").on(table.studySessionId),
  ],
);

export const xpEvents = pgTable(
  "xp_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 80 }).notNull(),
    points: integer("points").notNull(),
    vocabularyId: text("vocabulary_id").references(() => vocabulary.id, { onDelete: "set null" }),
    chapterId: text("chapter_id").references(() => chapters.id, { onDelete: "set null" }),
    studySessionId: text("study_session_id").references(() => studySessions.id, { onDelete: "set null" }),
    dedupeKey: varchar("dedupe_key", { length: 220 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("xp_dedupe_uq").on(table.userId, table.dedupeKey),
    index("xp_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const dailyActivity = pgTable(
  "daily_activity",
  {
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    localDate: date("local_date", { mode: "string" }).notNull(),
    uniqueWordsReviewed: integer("unique_words_reviewed").default(0).notNull(),
    sessionsCompleted: integer("sessions_completed").default(0).notNull(),
    xpEarned: integer("xp_earned").default(0).notNull(),
    dailyGoalCompleted: boolean("daily_goal_completed").default(false).notNull(),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.userId, table.localDate] })],
);

export const dailyReviewedVocabulary = pgTable(
  "daily_reviewed_vocabulary",
  {
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    localDate: date("local_date", { mode: "string" }).notNull(),
    vocabularyId: text("vocabulary_id").notNull().references(() => vocabulary.id, { onDelete: "cascade" }),
    firstReviewedAt: timestamp("first_reviewed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.localDate, table.vocabularyId] })],
);

export const badges = pgTable("badges", {
  id: text("id").primaryKey(),
  code: varchar("code", { length: 80 }).notNull().unique(),
  localizationKey: varchar("localization_key", { length: 120 }).notNull(),
  iconKey: varchar("icon_key", { length: 80 }).notNull(),
  category: varchar("category", { length: 40 }).notNull(),
  criteria: jsonb("criteria").$type<Record<string, unknown>>().notNull(),
  ...timestamps,
});

export const userBadges = pgTable(
  "user_badges",
  {
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    badgeId: text("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.badgeId] })],
);

export type Vocabulary = typeof vocabulary.$inferSelect;
export type UserVocabularyState = typeof userVocabularyState.$inferSelect;
export type VocabularyOverride = typeof vocabularyOverrides.$inferSelect;
