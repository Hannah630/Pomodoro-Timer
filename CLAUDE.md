# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Rules

Reply in Traditional Chinese. Keep all code, comments, commit messages and
**everything the interface shows the user** in English.

Before coding:

- explain the approach
- analyse the architecture
- do not modify unrelated files

Always:

- keep code clean
- avoid duplication
- follow SOLID principles
- explain trade-offs, and never rename variables without a reason

## Commands

```bash
npm run dev          # dev server on http://localhost:5173
npm run test         # all unit tests, once
npm run test:watch   # re-run on change
npm run build        # tsc --noEmit, then vite build
```

Run one file or one test:

```bash
npx vitest run src/services/timer.service.spec.ts
npx vitest run -t "never reports a negative remaining time"
```

`npm run build` is the type check as well as the bundle — run it, not just the
tests, before calling a change done.

## What this project is

A pomodoro timer built as a frontend practice project. The point is the
workflow — planning, staged implementation, unit tests, Git — as much as the
app. `docs/Architecture.md` records the decisions and why; `docs/Todo.md` is
the stage-by-stage log. Keep both current when behaviour changes.

Vite + TypeScript, no framework, no runtime dependencies. Vitest in the **node**
environment, so no jsdom: a module that touches `document` at import time
cannot be tested.

## Architecture

Dependencies run one way: `ui → services → models`. `main.ts` is wiring only.

| Layer | Owns | Must not |
| --- | --- | --- |
| `models/` | types, constants | any logic |
| `services/` | business rules, side effects | touch the DOM |
| `ui/` | rendering, events | hold business rules |
| `main.ts` | assembling and forwarding | hold business rules |

### Invariants worth knowing before editing

**The countdown is derived, never accumulated.** `TimerService` records a
deadline and every tick recomputes `endAt - now()`. Subtracting a fixed amount
per interval would turn a throttled background tab into permanent drift. The
session length is captured when the session begins, so a settings change
mid-run cannot move the denominator the dial divides by.

**TypeScript never sets a style.** It writes two custom properties on the root,
`--mode` and `--fill`; CSS does the rendering. `--fill` is registered with
`@property` so a single transition on `:root` smooths everything that reads it.

**Services own their own invariants.** `TimerService` validates durations
because settings also arrive from storage, a path that never touches the form.
Storage checks the envelope — parseable, right shape, right version — and hands
the contents on; the exception is history records, which go straight to the
screen with nothing downstream to reject them, so they are validated field by
field.

**Three storage keys.** `pomodoro-timer` (settings, lifetime counters),
`pomodoro-timer:history` and `pomodoro-timer:weather`. History grows, settings
do not, and the weather is disposable — kept apart so that a corrupted one
cannot take the others down with it. Settings are versioned with a **chained**
migration (v1 → v2 → v3): a new version describes only the difference it
introduces.

**Side-effect sources are injected**, not imported: `now()`, `createId()`, and
a two-method `KeyValueStorage` instead of `Storage`. This is what lets a 25
minute countdown, a corrupt save and a 90 day retention limit all be tested in
plain node.

**Per-tick rendering is separated from event-driven updates.** The timer ticks
about once a frame. Views whose value the user can be typing into — the task
field, the settings form — expose a separate method for writing that value, so
a render never overwrites what is being typed. The same split keeps the
sixty-times-a-second repaint on the small hundredths text rather than the large
clock.

## Testing

Pure functions are exported from the module that uses them and tested there
(`labels.ts`, `history-format.ts`, `weather-format.ts`, `settings-view.ts`).
Services that are nothing but browser side effects —
`notification.service.ts`, `focus-guard.ts`, `geolocation.service.ts`,
`network.ts` — have no specs; mocking `AudioContext`, `Notification` or
`fetch` would only assert that the calls written are the calls written. That
is a deliberate gap, so changes there need manual checking.

## TypeScript

Strict, with `noUncheckedIndexedAccess` and `verbatimModuleSyntax`. Never
`any` — use `unknown` and narrow. Model states as unions so illegal
combinations cannot be expressed. `TimerSettings` and `TimerState` are
`readonly`; build patches through a mapped type that strips it rather than
loosening the type.

## Styles

`base.css` holds the tokens, `layout.css` the layout and components. Colours
come from tokens only — no colour literals in `layout.css`. Shared type and
spacing scales are tokens too; one-off component dimensions can be local.

## Git

Conventional Commits, English, one concern per commit. Each stage is a
`feat/…` branch merged back with `--no-ff`. Commit bodies explain *why*, not
what the diff already shows.
