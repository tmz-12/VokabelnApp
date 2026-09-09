# VokabelnApp design system

## Concept: the annotated language atlas

Learning C1/C2 vocabulary is a long, serious journey through a text, not a game board. Kapitel appear as stations along a precisely drawn editorial route. Fine annotation lines, offset labels, and progress rings give it the character of a contemporary cultural map. The atlas is the single expressive gesture; controls and lists remain calm and direct.

## Color tokens

Light:

- `paper` `#F7F5EF` — warm reading ground
- `ink` `#18201D` — primary text
- `moss` `#315C4B` — primary action and progress
- `cobalt` `#315F9A` — C2 and informational accent
- `saffron` `#C47A24` — priority marker and milestones
- `rule` `#D8D8CE` — separators and paths

Dark:

- `paper` `#111714`
- `ink` `#EEF1EA`
- `moss` `#7DC6A5`
- `cobalt` `#86AFE0`
- `saffron` `#EDB266`
- `rule` `#38423D`

State colors use separate semantic success, warning, and error pairs and never carry meaning without text or shape.

## Typography

- Interface and German display: `Manrope`, variable, with broad counters and disciplined weights.
- Chinese fallback: `Noto Sans TC`; system sans fallback for resilience.
- Headwords use weight and size as the visual anchor; labels remain sentence case, never tracked all-caps.
- Base text is 16px/1.55. Reading measure is 60–72 characters on desktop and 35–60 on mobile.
- Numeric progress uses tabular figures.

## Layout

Mobile journey:

```text
[greeting · streak / level]
[continue strip and daily progress]

Kapitel 1   (station)
               \
                (station)  Kapitel 2
                /
Kapitel 3   (station)

[labeled bottom navigation]
```

Desktop journey:

```text
[rail]  [compact masthead / continue] [daily progress]
        [                                         ]
        [ wide plotted Kapitel atlas + annotation ]
        [                                         ]
```

Primary content is left-aligned. The journey uses intentional offsets; prose and controls do not.

## Interaction and motion

- Fast feedback (100–160ms) for press, favorite, and focus states.
- 220–320ms for chapter preview/sheet transitions; only transform and opacity.
- Flashcard flip is the principal study motion and remains interruptible.
- Route/progress animation occurs only when progress changed, not continuously.
- `prefers-reduced-motion` removes spatial movement and preserves instant state/announcements.

## Component discipline

- Use one rounded treatment for action surfaces and a different, tighter radius for inputs; lists rely primarily on rules and spacing.
- Lucide stroke icons at 18/20/24px; decorative SVG geometry is hidden from assistive technology.
- Every icon-only control has an accessible name and relevant pressed/expanded state.
- Sheets preserve the originating page; primary flows use routes, not modals.

## Explicit anti-patterns

- No mascot, generic blobs, neon gradients, glass panels, stat-card wall, or identical floating cards.
- No emoji as structural icons.
- No decorative eyebrow labels, arbitrary numbering, or automatic section reveal effects.
- No combined C1/C2 mastery visualization.
