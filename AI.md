# AI Guide for BD Tracker

This file is a compact operating guide for AI assistants and developers maintaining BD Tracker. For deeper database and feature rules, read the `Database and Feature Maintenance Guidelines` section in `README.md`.

## Read First

1. `README.md`
2. `web/lib/README.md`
3. The feature files you are about to modify

## Current Mental Model

- `web/` is the primary production app.
- `mobile/` is early-stage and should not drive schema design by itself.
- Supabase handles auth, database, and realtime.
- Cloudinary handles current file uploads; Supabase Storage is not used for QA/Approval attachments.
- The web dashboard is tab-based and lazy-loads tabs through `web/components/HomeTabs.tsx` and `web/lib/app/tabsConfig.tsx`.
- Feature pages generally own their own fetch, realtime, dialogs, filtering, export, and save flows.

## Structure Rules

- App shell and tab registry: `web/lib/app/`
- Auth and roles: `web/lib/auth/`
- Domain helpers: `web/lib/features/<feature>/`
- External clients: `web/lib/integrations/`
- Cross-feature utilities: `web/lib/shared/`
- shadcn `cn` helper: keep `web/lib/utils.ts` stable
- UI primitives: `web/components/ui/`
- Feature UI: `web/components/<feature>/`

## Adding a Feature or Tab

1. Add the feature UI under `web/components/<feature>/`.
2. Add domain helpers under `web/lib/features/<feature>/` only when needed.
3. Add the tab in `web/lib/app/tabsConfig.tsx`.
4. Pass role context from the tab render function.
5. Keep tab data loading inside the feature page so first app entry stays light.
6. Add realtime subscriptions only after the feature mounts, and remove channels on unmount.
7. Preserve viewer/admin/super-admin behavior.

## Database Rules

- Use migrations for schema changes under `supabase/migrations/`.
- Enable RLS for every new `public` table.
- Use `TO authenticated` / `TO anon` policies, not `auth.role()`.
- Do not use user-editable metadata for authorization.
- Reuse `masters` for reference data.
- Avoid duplicate label columns when a foreign key to `masters` is enough.
- Before dropping anything, search references in `web`, `mobile`, and `supabase/functions`, then check row counts and dependencies.

## Current Active Tables

- `records`
- `customer_tracking`
- `masters`
- `profiles`
- `qa_tickets`
- `approval_requests`
- `ad_tracking_records`
- `merchant_invoices`
- `bd_monthly_levels`
- `bd_level_monthly_kpis`

Do not recreate removed experiment/unused tables unless the feature is intentionally restored:

- `word_chain_rooms`
- `word_chain_moves`
- `vietnamese_words`
- `qa_ticket_attachments`

## Attachment Rule

Current attachments use Cloudinary:

- Q&A: metadata in `qa_tickets.attachments`
- Approvals: metadata in `approval_requests.images`
- Merchant invoices: metadata in `merchant_invoices.proof_images`
- Upload/delete routes: `web/app/api/cloudinary/`

Do not add Supabase attachment tables or Supabase Storage flows unless the product intentionally changes this architecture.

## Safety

- Do not revert unrelated local changes.
- Use `rg` before edits.
- Keep changes scoped to the requested feature.
- Do not force-mount every tab or trigger every module query on startup.
- Run `cd web && npm run lint` after code changes.
- Run `cd web && npm run build` for larger UI/schema changes.
