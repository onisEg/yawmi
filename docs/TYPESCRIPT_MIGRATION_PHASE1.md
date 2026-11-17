# Yawmi — strict TypeScript, phase 1: Tasks and Notes

## Scope

- Canonical TypeScript sources:
  - `src/types/domain.ts` — typed representations of the **existing** Task and Note JSON formats, with optional legacy fields.
  - `src/features/tasks/task-model.ts` — typed, pure task grouping and priority/manual sorting.
  - `src/features/notes/note-model.ts` — typed, pure note search and pinning/order selectors.
- `tsconfig.json` has `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `noEmit: true`, and `lib: ["ES2022","DOM"]`.
- `typescript` is a pinned devDependency in `package-lock.json`, compiled and type-checked with `npm ci`.
- Browser-compatible `.js` files are generated via esbuild from these TypeScript files. GitHub Pages can serve them directly without server-side compilation.
- `npm run generate:models` updates generated browser scripts, `npm run typecheck` checks strict types, and `npm run check:generated` verifies that committed JavaScript exactly matches the TypeScript sources.
- `npm run build` and `npm test` automatically run static checking and generated-JS verification before assembling native web assets.

## Safety constraints

This is deliberately **incremental**: the app's ~10k-line legacy `index.html` is not converted wholesale. Existing task and note renderer callbacks, storage keys, sync payloads, data rows, UI labels, and CSS remain untouched.

Do not modify production `main` or Supabase data/policies. This PR builds on the previous draft `refactor/ui-css-tasks-notes-modules`.

## Local workflow

```bash
npm ci
npm run typecheck
npm run generate:models
npm test
```

Edit **.ts** sources only and commit their generated `.js` outputs after running the command. CI intentionally fails when the generated scripts are stale.

## Testing levels

1. **Compile-time checks:** TypeScript strict checks enforce shape and parameter contracts in migrated modules. They do not validate externally sourced data at runtime.
2. **Unit tests:** task grouping and ordering, note search, pinned notes, immutable source arrays; JS browser output is executed via Node's VM.
3. **Regression checks:** old JSON backups, data merges, deleted-record tombstones, localStorage key compatibility, PWA precache and Capacitor asset parity.
4. **Smoke tests:** Android emulator installs and launches the app, detects blank screens, JavaScript syntax failures and fatal Android errors.
5. **Still pending:** realistic browser automation of create/edit/delete task/note journeys, real-device Android testing, background notifications, user migration/sync tests with test accounts, and runtime schema validation (e.g. Zod) for external JSON.

## Next phase

Move shared DOM components and one self-contained task UI slice into typed functions, inject dependencies, add browser E2E tests, and keep release signing certificate and beta package name stable for in-place updates.
