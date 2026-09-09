# Aspekte neu C1/C2 vocabulary data

Recommended runtime file: `aspekte_neu_c1_c2_vocabulary_app.json`.

Audit/full file: `aspekte_neu_c1_c2_vocabulary.json` (includes `rawText` from the PDF blocks).

Validation report: `aspekte_neu_c1_c2_import_report.json`.

Reproducible converter: `convert_aspekte_vocab.py`.

## Core totals
- C1 entries: 3,270 total
- C1 entries assigned to Kapitel 1–10: 3,269
- C1 entries explicitly printed under `Ohne Kapitelangabe`: 1
- highlighted C1 key entries: 350 (35 per Kapitel)
- C2 Upgrade entries: 180 (18 per Kapitel)
- total app entries: 3,450
- Kapitel: 10

## Source-specific note
The PDF chapter headers sum to 3,269 C1 entries (Kapitel 10 has 329). The PDF cover states 3,270 C1 entries because one final entry, `die Klette ,-n`, is explicitly printed under `Ohne Kapitelangabe`. The converter preserves this faithfully with `chapter: null` rather than guessing a chapter.

## Recommended app usage
Treat `entries` as immutable vocabulary content. Keep user state (favorite, new/learning/known, review history) in a separate store keyed by `entry.id`. For the one entry with `chapter: null`, either expose an `Ohne Kapitelangabe`/`Unassigned` group or hide it from chapter progression while keeping it searchable.
