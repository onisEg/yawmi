# Yawmi — security and refactoring baseline (16 November 2026)

## Scope and safety

This document reports a **read-only audit**. No rows, users, RLS policies, Edge Functions or Supabase configuration were changed. The production `main` PWA is not modified by this feature branch.

## Connection and plan verification

- Supabase project: `yawmi` (`jtldivmllnzktnzgwtsm`), `ACTIVE_HEALTHY`, region `eu-west-2`.
- Project organization tier: **Free**. Do not rely on automatic database backups or a paid development branch.
- Available integrations permit introspection, read-only SQL and (when explicitly approved) project write operations. A successful SELECT is not itself proof of safe or unrestricted write permissions.
- Only **row counts**, schema information and policy definitions were inspected, never user-generated JSON content.
- Counts at time of audit: `public.yawmi_data = 2` rows; legacy `public.yawmi_sync = 1` row. Treat these as time-specific, not stable user totals.

## Current observed policy issues — action required before public release

1. `public.yawmi_data`: SELECT, INSERT and UPDATE ownership policies check `auth.uid() = user_id`. Keep this model for the current app and add integration tests for cross-account isolation.
2. `public.yawmi_sync`: policy `yawmi_sync_all` grants `ALL` to `anon` and `authenticated` with `USING (true)` and `WITH CHECK (true)`. The table contains at least one row and has `sync_code`, `data` JSONB and `updated_at`. Any browser user with Data API access may have broad read/write access. **High-priority security issue**, especially since the legacy table may hold private data. Current Android branch code reads/writes `yawmi_data` rather than `yawmi_sync`; this does **not** prove old deployed clients no longer use it. Verify clients, backup and migrate/retire safely before revoking the legacy policy.
3. `public.rls_auto_enable()` is marked `SECURITY DEFINER` and Supabase advisors report RPC EXECUTE callable by `anon` and `authenticated`. Review its event-trigger context and revoke unnecessary EXECUTE after approval. Advisor: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
4. Leaked-password protection is reported disabled; confirm current plan eligibility and available Auth options before changing subscription/settings. https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Next security milestone (requires separate approval)

- Export a verified database backup and document rollback for the legacy `yawmi_sync` table and all affected applications. Supabase Free does not include automatic daily database backups.
- Determine whether any released web client, legacy Android copy, or external consumer still needs `yawmi_sync`.
- Choose an explicit ownership/auth model before changing policies; avoid blindly replacing `true` with `auth.uid()` when there is no `user_id` column.
- Apply only the reviewed migration, then test that users can access their own content but cannot read or change another user's content. Re-run Supabase security advisors.
- Prefer staying with Supabase rather than migrating the production database to Neon/Render merely to follow another project's stack.

## Completed refactor milestone

- Create an isolated, side-effect-free pure module `src/features/focus/focus-clock.js` for wall-clock deadline arithmetic.
- Load the same file on Web/PWA and Android; ship it within native assets and PWA precache.
- Preserve `yawmi_focus_runtime_v2`, legacy user-data keys and cloud JSON formats.
- Add tests covering background timer delays, corrupted deadlines, same-origin offline asset caching, cross-device data merges and tombstones.
- Build/test in GitHub Actions and Android emulator before any merge into production.

## Next modularization milestones

1. Finish native QA on an actual Android phone; confirm status-bar insets, permissions and reminder scheduling with the screen off.
2. Extract remaining focus state transitions without renaming the saved key; freeze a JSON fixture format first.
3. Introduce storage and notification adapters, with explicit native/PWA behavior differences; do not rewrite the Supabase JSON data in this phase.
4. Extract common CSS tokens/components, then feature-specific views in small reviewable PRs.
5. Keep both Android and web regression tests passing, with rollback paths and no automatic deployment of development branches.
