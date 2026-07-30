# Pomodoro Timer

A pomodoro countdown timer, built as a frontend practice project.

The point of this repo is not the timer itself, but going through a full
frontend workflow once: planning -> staged implementation -> unit tests ->
Git version control -> AI-assisted development (Claude Code + Cursor).

Author: Hannah

## What it does

- Focus, short break and long break sessions, 25 / 5 / 15 minutes by default
- Start, pause, resume and reset
- Counts finished focus sessions, and takes a long break after every fourth
- Chimes, washes the screen and raises a desktop notification when time is up
- Durations are editable and held to whole minutes between 1 and 120
- Settings and the session count survive a reload
- Works on a phone and on a desktop

## Tech stack

- Vite + TypeScript, no framework, plain DOM
- Vitest for unit tests
- No dependencies at runtime

## Getting started

```bash
npm install
npm run dev      # dev server on http://localhost:5173
npm run test     # unit tests
npm run build    # type check + production build
```

Notifications need a secure context, so use the dev server rather than opening
`index.html` from the file system.

## How it is put together

```
src/
├─ models/     types and constants, no logic
├─ services/   business rules and side effects, never touch the DOM
├─ ui/         render and emit events, hold no business rules
├─ utils/      small pure helpers
├─ styles/     base.css holds the tokens, layout.css the layout
└─ main.ts     wiring only
```

Dependencies run one way: `ui -> services -> models`.

Two decisions worth knowing before reading the code:

- The countdown is derived from a deadline (`endAt - now()`) on every tick
  rather than accumulated, so a throttled background tab cannot make it drift.
- TypeScript never sets a style. It writes two custom properties, `--mode` and
  `--fill`, and CSS does the rendering.

See `docs/Architecture.md` for the rest, and `docs/Todo.md` for the stages the
project was built in.
