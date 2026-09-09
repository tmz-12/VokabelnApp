import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db, sql as client } from "../src/db";
import { badges, chapters, collections, vocabulary } from "../src/db/schema";

const entrySchema = z.object({
  id: z.string().min(1),
  level: z.enum(["C1", "C2"]),
  chapter: z.number().int().min(1).max(10).nullable(),
  groupLabel: z.string(),
  orderInChapter: z.number().int().positive().nullable(),
  orderInGroup: z.number().int().positive(),
  headword: z.string().min(1),
  german: z.string().min(1),
  english: z.string(),
  traditionalChinese: z.string(),
  sourceReference: z.string().nullable(),
  formsRaw: z.string().nullable(),
  examplesGerman: z.array(z.string()),
  chunks: z.array(z.unknown()),
  isKey: z.boolean(),
  isC2Upgrade: z.boolean(),
  sourcePage: z.number().int().positive(),
});

const datasetSchema = z.object({
  schemaVersion: z.string(),
  entries: z.array(entrySchema),
});

const badgeSeeds = [
  ["first-session", "badges.firstSession", "sparkles", "sessions", { sessions: 1 }],
  ["streak-7", "badges.streak7", "flame", "streak", { days: 7 }],
  ["streak-30", "badges.streak30", "flame", "streak", { days: 30 }],
  ["known-100", "badges.known100", "book-open-check", "mastery", { known: 100 }],
  ["known-500", "badges.known500", "book-open-check", "mastery", { known: 500 }],
  ["known-1000", "badges.known1000", "book-open-check", "mastery", { known: 1000 }],
  ["first-c1-chapter", "badges.firstC1Chapter", "map-pin-check", "chapter", { c1Chapters: 1 }],
  ["all-c1-chapters", "badges.allC1Chapters", "route", "chapter", { c1Chapters: 10 }],
  ["known-c2-50", "badges.knownC2Fifty", "gem", "mastery", { c2Known: 50 }],
  ["all-c2", "badges.allC2", "gem", "mastery", { c2Known: 180 }],
] as const;

function assertTotals(entries: z.infer<typeof entrySchema>[]) {
  const c1 = entries.filter((entry) => entry.level === "C1");
  const c2 = entries.filter((entry) => entry.level === "C2");
  const key = entries.filter((entry) => entry.isKey);
  const unassigned = c1.filter((entry) => entry.chapter === null);
  const chapterCount = new Set(entries.flatMap((entry) => entry.chapter ?? [])).size;
  const actual = { all: entries.length, c1: c1.length, c2: c2.length, key: key.length, unassigned: unassigned.length, chapters: chapterCount };
  const expected = { all: 3450, c1: 3270, c2: 180, key: 350, unassigned: 1, chapters: 10 };
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Vocabulary totals do not match validated source. Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
  if (unassigned[0]?.headword !== "die Klette") throw new Error("The single unassigned C1 entry must remain die Klette");
}

async function main() {
  const file = path.join(process.cwd(), "data", "seed", "aspekte_neu_c1_c2_vocabulary_app.json");
  const dataset = datasetSchema.parse(JSON.parse(await readFile(file, "utf8")));
  assertTotals(dataset.entries);

  const collectionId = "aspekte-neu-c1-c2";
  await db.insert(collections).values({ id: collectionId, code: collectionId, name: "Aspekte neu C1 + C2 Upgrade", sourceVersion: dataset.schemaVersion })
    .onConflictDoUpdate({ target: collections.id, set: { name: "Aspekte neu C1 + C2 Upgrade", sourceVersion: dataset.schemaVersion, updatedAt: new Date() } });

  const chapterRows = Array.from({ length: 10 }, (_, index) => ({
    id: `${collectionId}-k${String(index + 1).padStart(2, "0")}`,
    collectionId,
    chapterNumber: index + 1,
    sortOrder: index + 1,
  }));
  await db.insert(chapters).values(chapterRows).onConflictDoNothing();

  for (let offset = 0; offset < dataset.entries.length; offset += 200) {
    const rows = dataset.entries.slice(offset, offset + 200).map((entry) => ({
      ...entry,
      collectionId,
      chapterId: entry.chapter ? `${collectionId}-k${String(entry.chapter).padStart(2, "0")}` : null,
      searchText: [entry.headword, entry.german, entry.english, entry.traditionalChinese, ...entry.examplesGerman, JSON.stringify(entry.chunks)].join(" ").toLocaleLowerCase(),
    }));
    await db.insert(vocabulary).values(rows).onConflictDoUpdate({
      target: vocabulary.id,
      set: {
        collectionId,
        chapterId: sql`excluded.chapter_id`,
        level: sql`excluded.level`,
        groupLabel: sql`excluded.group_label`,
        orderInChapter: sql`excluded.order_in_chapter`,
        orderInGroup: sql`excluded.order_in_group`,
        headword: sql`excluded.headword`,
        german: sql`excluded.german`,
        english: sql`excluded.english`,
        traditionalChinese: sql`excluded.traditional_chinese`,
        sourceReference: sql`excluded.source_reference`,
        formsRaw: sql`excluded.forms_raw`,
        examplesGerman: sql`excluded.examples_german`,
        chunks: sql`excluded.chunks`,
        isKey: sql`excluded.is_key`,
        isC2Upgrade: sql`excluded.is_c2_upgrade`,
        sourcePage: sql`excluded.source_page`,
        searchText: sql`excluded.search_text`,
        updatedAt: new Date(),
      },
    });
  }

  await db.insert(badges).values(badgeSeeds.map(([id, localizationKey, iconKey, category, criteria]) => ({ id, code: id, localizationKey, iconKey, category, criteria }))).onConflictDoNothing();
  console.log(`Seed complete: ${dataset.entries.length} vocabulary entries, ${chapterRows.length} chapters, ${badgeSeeds.length} badges.`);
  await client.end();
}

main().catch(async (error) => {
  console.error(error);
  await client.end();
  process.exitCode = 1;
});
