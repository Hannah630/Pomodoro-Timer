TypeScript strict mode is on. Never use `any`; use `unknown` plus a narrowing check.

Model states with union types (`'idle' | 'running' | 'paused'`) so illegal states cannot be represented.

Keep business rules out of the UI layer. Views only render and call service methods.

Services must not touch the DOM. Inject side-effect sources (such as `now()`) through the constructor so they can be replaced in tests.

Use `import type` for type-only imports (`verbatimModuleSyntax` is enabled).

Prefer plain functions and small classes over abstractions added "just in case".
