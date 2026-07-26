# BD Tracker

BD Tracker is an internal operations platform used to manage BD-related workflows across performance tracking, customer tracking, master data management, Q&A tickets, approval requests, and ads tracking.

The repository currently contains:

- `web/`: the primary production-facing application used by the team today
- `mobile/`: an early-stage Flutter client that is not yet the main operating surface
- `supabase/`: backend-related configuration and edge functions

## Audience Guide

| Audience | Read This For | Priority |
| --- | --- | --- |
| End users | What the product is for, what each tab does, who should use it, and how to access it | High |
| Internal developers and AI assistants | Project structure, architecture, roles, data flow, setup, runtime behavior, and implementation conventions | High |

## Product Summary

BD Tracker is designed to give operations, BD, and admin users a single workspace for day-to-day execution:

- Track team performance records
- Track customer activity and related operational notes
- Manage shared master/reference data
- Submit and resolve internal Q&A tickets
- Review and process approvals
- Monitor ads tracking records

---

## End User Guide

### Who This Product Is For

This product is intended for:

- BD team members
- Operations admins
- Internal reviewers and approvers
- Super admins managing system data and approvals

### Login and Access

- Users sign in with an assigned account through Supabase Auth.
- Some screens and actions depend on the user role.
- A special `super admin` experience exists for selected users only.

### Main Web Modules

The web app is tab-based. Users normally work inside one or more of the following modules.

| Tab | Purpose | Typical Actions |
| --- | --- | --- |
| `Team Performance` | Track BD performance records | Create, edit, filter, search, export |
| `Customers` | Track customer-related operational records | Create, edit, filter, search, export |
| `Management` | Maintain shared master data | Add, edit, activate/deactivate, manage core lookup values |
| `Q&A` | Manage internal Q&A tickets | Submit tickets, update status, answer tickets, attach files |
| `Ads Tracking` | Monitor ad-related records and states | Review records, filter status, inspect details |
| `Approvals` | Review approval requests | Approve, reject, inspect attachments and request details |
| `Pink Life` | Super-admin-only internal module | Restricted internal use |

### What Each Module Does

#### Team Performance

Used to maintain performance records for BD operations.

- View records over time
- Filter by date, BD, customer type, point type, and category
- Search by customer name or note content
- Create and edit records
- Export data to Excel

#### Customers

Used to manage customer tracking records.

- View customer tracking entries
- Filter by month, date range, BD, customer name, and combo/voucher flags
- Search records quickly
- Create and edit entries
- Export data to Excel

#### Management

Used to manage shared reference data used across the platform.

- Maintain master data such as BD, customer type, point type, and related entities
- Update labels, states, and ordering
- Keep downstream modules consistent

#### Q&A

Used for internal questions and issue handling.

- Submit a new ticket
- Track status through `Active`, `In Progress`, `Done`, and `Archive`
- Add and review attachments
- Let admins respond and update ticket state
- See realtime updates when another user changes the same ticket

#### Ads Tracking

Used to monitor ad records and their time-based status.

- View ads tracking records
- Inspect details
- Filter by status
- Maintain operational visibility for campaign periods

#### Approvals

Used for approval workflows.

- Review pending requests
- Approve or reject
- See request details and attachments
- Follow realtime updates on request state

### Realtime Behavior

- Many screens update in realtime using Supabase channels.
- The app now loads only the active tab on first entry.
- A tab loads its own data the first time the user opens it.
- Once a tab has been visited, it stays mounted so its realtime subscriptions can continue working without forcing a full reload when the user returns to that tab.

### Important Usage Notes

- Actions such as approve, archive, delete, and update affect real data.
- Some modules are role-sensitive and may expose different controls to different users.
- If a tab has never been opened in the current session, it will not subscribe to realtime updates yet.
- When that tab is opened for the first time, it fetches the latest state from the database.

### Web Access

For local development or internal testing:

```bash
cd web
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

---

## Internal Developer Guide

This section is intentionally detailed so a new engineer or AI assistant can understand the project quickly and work on it safely.

### High-Level Architecture

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Frontend web app | Next.js 16 + React 19 + TypeScript | Main UI and workflow logic |
| Styling/UI primitives | Tailwind CSS 4 + Radix UI + shadcn-style components | Shared UI structure and styling |
| Auth and data backend | Supabase | Authentication, tables, realtime subscriptions |
| Notifications | Sonner | Toast feedback |
| Data export | `xlsx`, `xlsx-js-style`, `docx`, `file-saver` | Excel and document export |
| Mobile client | Flutter + `supabase_flutter` | Early-stage companion app |

### Repository Structure

```text
BD-tracker/
├── web/        # Main Next.js application
├── mobile/     # Flutter application
└── supabase/   # Supabase-related config and functions
```

### Current Product Status

| Surface | Status | Notes |
| --- | --- | --- |
| `web` | Primary operating surface | Actively used, feature-rich, role-aware |
| `mobile` | Early-stage | Setup exists, feature scope is still limited |

### Web Application Structure

The web app is built around a tabbed dashboard rendered from [web/components/HomeTabs.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/components/HomeTabs.tsx).

Core behavior:

- Authentication is checked before rendering the main app.
- The current user role is resolved through [web/lib/auth/userRoleContext.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/lib/auth/userRoleContext.tsx) and [web/lib/auth/useCurrentUserRole.ts](/Users/nhuffan/Documents/Projects/BD-tracker/web/lib/auth/useCurrentUserRole.ts).
- Tab configuration lives in [web/lib/app/tabsConfig.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/lib/app/tabsConfig.tsx).
- The header exposes tab navigation and account/logout controls.
- Each major product area is implemented as a self-contained page component under `web/components/...`.

### Web Module Map

| Module | Primary File | Notes |
| --- | --- | --- |
| Authentication gate | [web/app/page.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/app/page.tsx) | Redirects unauthenticated users to login |
| Login page | [web/app/login/page.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/app/login/page.tsx) | Uses Supabase password auth |
| Root dashboard tabs | [web/components/HomeTabs.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/components/HomeTabs.tsx) | Controls tab mounting and persistence |
| Header/navigation | [web/components/AppHeader.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/components/AppHeader.tsx) | Main tab switcher |
| Performance | [web/components/performance/RecordsPage.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/components/performance/RecordsPage.tsx) | Main performance module |
| Customer tracking | [web/components/customer/CustomerTrackingPage.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/components/customer/CustomerTrackingPage.tsx) | Customer tracking module |
| Management | [web/components/manager/ManagementPage.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/components/manager/ManagementPage.tsx) | Entry point for master data management |
| Q&A | [web/components/qa/QAPage.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/components/qa/QAPage.tsx) | Ticket management |
| Approvals | [web/components/approvals/ApprovalsPage.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/components/approvals/ApprovalsPage.tsx) | Approval request management |
| Ads tracking | [web/components/ads-tracking/AdsTrackingPage.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/components/ads-tracking/AdsTrackingPage.tsx) | Ads tracking workflows |
| Theme toggle | [web/components/ThemeToggle.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/components/ThemeToggle.tsx) | Light/dark toggle |

### Roles and Access Model

Role resolution is handled in [web/lib/auth/useCurrentUserRole.ts](/Users/nhuffan/Documents/Projects/BD-tracker/web/lib/auth/useCurrentUserRole.ts) and exposed to the tab tree through [web/lib/auth/userRoleContext.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/lib/auth/userRoleContext.tsx).

Current model:

- `viewer`
- `admin`
- `super admin` determined by a hard-coded user id check in the current implementation

Practical implications:

- Not every user sees the same controls
- Some tabs or actions are effectively admin-only
- `Pink Life` is currently restricted to `super admin`

### Data and State Model

The app is primarily Supabase-driven:

- Auth state comes from `supabase.auth`
- CRUD reads and writes happen directly from page/dialog components
- Realtime updates use Supabase channels
- A small amount of client caching exists for master data

Master data behavior:

- Shared reference data is loaded via [web/lib/features/masters/useMasters.ts](/Users/nhuffan/Documents/Projects/BD-tracker/web/lib/features/masters/useMasters.ts)
- It maintains a simple in-memory cache keyed by category
- It supports invalidation through a custom `masters-updated` browser event

### Tab Loading Strategy

The tab-loading behavior is important for performance and architectural understanding.

Previous behavior:

- All dashboard tabs were force-mounted immediately
- All modules loaded their initial API calls at app startup
- This created unnecessary load and slowed down first entry

Current behavior:

- Only the active tab is mounted on first load
- A tab mounts and loads data only when the user first visits it
- Once visited, the tab remains mounted and hidden rather than being destroyed
- This allows its existing realtime subscriptions to stay active without re-fetching merely because the user switches away and back

This behavior is implemented in [web/components/HomeTabs.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/components/HomeTabs.tsx) using an internal visited-tab list.
The tab registry itself lives in [web/lib/app/tabsConfig.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/lib/app/tabsConfig.tsx).

### Realtime Expectations

Developers should understand the tradeoff:

- A tab that has never been opened in the current session is not yet subscribed to realtime events
- When it is opened, it performs a fresh load from the database, so it still gets the latest persisted state
- A visited tab keeps its subscription alive because it remains mounted

This is an intentional optimization, not a data integrity issue.

### Attachments and Uploads

Some modules support attachment upload and preview, especially Q&A and Approvals.

Relevant areas:

- [web/components/qa/dialogs/CreateQATicketDialog.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/components/qa/dialogs/CreateQATicketDialog.tsx)
- [web/components/qa/dialogs/QATicketDetailDialog.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/components/qa/dialogs/QATicketDetailDialog.tsx)
- [web/components/approvals/ApprovalRequestDialog.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/components/approvals/ApprovalRequestDialog.tsx)
- [web/app/api/cloudinary/upload/route.ts](/Users/nhuffan/Documents/Projects/BD-tracker/web/app/api/cloudinary/upload/route.ts)
- [web/app/api/cloudinary/delete/route.ts](/Users/nhuffan/Documents/Projects/BD-tracker/web/app/api/cloudinary/delete/route.ts)

At runtime:

- Client dialogs prepare files and local previews
- Upload requests go through internal API routes
- Stored attachment metadata is then written back into Supabase records

### Exports

The project supports exporting business data:

- Excel exports in performance and customer modules
- Document export for archived QA tickets

Useful files:

- [web/components/performance/helpers/exportExcel.ts](/Users/nhuffan/Documents/Projects/BD-tracker/web/components/performance/helpers/exportExcel.ts)
- [web/components/customer/helpers/exportTrackingExcel.ts](/Users/nhuffan/Documents/Projects/BD-tracker/web/components/customer/helpers/exportTrackingExcel.ts)

### Setup for Internal Development

#### Prerequisites

- Node.js 18 or newer
- npm
- A valid Supabase project
- Environment values for public Supabase access

#### Web Environment Variables

Create `web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

If Cloudinary upload is enabled in your environment, also configure the variables used by the API routes under `web/app/api/cloudinary/`.

#### Install and Run Web

```bash
cd web
npm install
npm run dev
```

#### Production Build

```bash
cd web
npm run build
npm run start
```

### Mobile Setup

The mobile app is not yet the main end-user experience, but the setup is straightforward.

Create `mobile/.env`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run:

```bash
cd mobile
flutter pub get
flutter run
```

### Technology Stack

#### Web

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 |
| UI runtime | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| UI primitives | Radix UI |
| Component patterns | shadcn-style component structure |
| Backend service | Supabase |
| Icons | Lucide React |
| Toasts | Sonner |
| Local/browser data tooling | Dexie |
| Spreadsheet export | `xlsx`, `xlsx-js-style` |
| Document export | `docx` |

#### Mobile

| Area | Technology |
| --- | --- |
| Framework | Flutter |
| Language | Dart |
| Backend service | `supabase_flutter` |
| Env loading | `flutter_dotenv` |

### Current Development Notes

- The web app has already been optimized so initial app entry does not trigger every module's API load at once.
- Several modules rely on direct page-level data fetching rather than a shared global data layer.
- There is lightweight caching for masters, but most business datasets are fetched per module.
- Some lint warnings may still exist in non-critical areas such as image usage and a few hook dependency cases.

### Recommended Mental Model for Developers and AI Assistants

If you are modifying this project, the safest working assumptions are:

1. The web app is the source of truth for current product behavior.
2. Supabase is both the auth layer and the operational backend.
3. Realtime subscriptions matter for UX consistency, especially after a tab has been opened.
4. Most modules own their own fetch, filter, dialog, and save flows locally.
5. Shared master data is reused widely, so master-data changes can affect multiple tabs.
6. Performance regressions often come from mounting too much UI too early or forcing unnecessary refreshes.
7. Role handling is central to behavior and should be checked before changing tab visibility or actions.

### Database and Feature Maintenance Guidelines

Use this section when adding new database objects, product features, or dashboard tabs. It is meant to keep future work aligned with the current project structure instead of growing one-off patterns.

#### Core Rules

- The web app in `web/` is the source of truth for current production behavior.
- Each feature/tab should own its page, tables, dialogs, export helpers, fetch/save flow, and realtime subscription behavior.
- Put shared code in `web/lib/shared/` only when at least two unrelated features need it.
- Put domain-specific helpers under `web/lib/features/<feature>/`.
- Put external SDK/client setup under `web/lib/integrations/`.
- Put auth and role helpers under `web/lib/auth/`.
- Put app-shell configuration, including the tab registry, under `web/lib/app/`.
- Do not add a new table or column just to duplicate data that can be reached through a foreign key or `masters` lookup.
- Do not create experiment tables in production Supabase unless the matching feature code is also being added.

#### Current Library Structure

`web/lib/README.md` is the source of truth for helper placement:

- `web/lib/app/`: app-shell configuration and tab composition.
- `web/lib/auth/`: user role, session, and authorization helpers.
- `web/lib/features/`: feature-specific business helpers.
- `web/lib/integrations/`: Supabase, Cloudinary, and other external service clients.
- `web/lib/shared/`: small cross-feature utilities.
- `web/lib/utils.ts`: shadcn/ui compatibility helper for `cn`; keep this path stable.

#### Adding a New Feature or Tab

1. Define the workflow first.
   - What durable business entity does the feature own?
   - Which users can see it?
   - Which actions are admin-only or super-admin-only?
   - Does it need realtime, export, attachments, optimistic updates, or local/offline state?

2. Decide whether a new table is actually needed.
   - Reuse `masters` for shared reference data.
   - Reuse existing business tables when the data belongs to an existing workflow.
   - Add a table only when the feature owns a new durable entity.

3. Add schema through Supabase migrations.
   - Put migration SQL under `supabase/migrations/`.
   - Keep SQL explicit and reviewable.
   - Enable RLS for any table in `public`.
   - Add policies that match the real access model.
   - Add indexes for commonly filtered, joined, sorted, or realtime-queried columns.

4. Add the web implementation.
   - Create feature UI under `web/components/<feature>/`.
   - Add domain helpers under `web/lib/features/<feature>/` only when needed.
   - Keep feature-local types close to the feature unless they are used globally.
   - Wire new tabs in `web/lib/app/tabsConfig.tsx`.
   - Pass role context from the tab registry instead of re-fetching role state in every child.

5. Keep tab loading lightweight.
   - New tabs should load data only after they mount.
   - Do not force-mount every tab.
   - Do not trigger every feature query during app startup.
   - If using realtime, subscribe inside the mounted feature page and remove channels on unmount.

6. Add validation and feedback.
   - Validate required fields before writing.
   - Use `sonner` toasts for success and failure.
   - Put destructive actions behind confirmation dialogs.
   - Preserve existing viewer, admin, and super-admin behavior.

7. Verify the feature.
   - Run `cd web && npm run lint`.
   - Run `cd web && npm run build` for larger UI or schema changes.
   - Test first tab visit, refresh, create/edit/delete, realtime updates, exports, empty states, and role-gated actions.

#### Database Rules

Current active public tables:

- `records`
- `customer_tracking`
- `masters`
- `profiles`
- `qa_tickets`
- `approval_requests`
- `ad_tracking_records`
- `bd_monthly_levels`
- `bd_level_monthly_kpis`

Removed unused or experimental tables should not be recreated unless the feature is intentionally restored:

- `word_chain_rooms`
- `word_chain_moves`
- `vietnamese_words`
- `qa_ticket_attachments`

Naming conventions:

- Tables: plural `snake_case`, for example `approval_requests`.
- Columns: `snake_case` with clear business meaning.
- Foreign keys: `<entity>_id`, for example `bd_id` or `created_by_user_id`.
- Date-only values: `date`, for example `event_date`.
- Timestamps: `created_at`, `updated_at`, `reviewed_at`, `done_at`.
- Month scope: `month_key` in `YYYY-MM` format where the existing code expects it.
- Status columns: text with an explicit check constraint when the state set is small and stable.

For normal mutable business tables, prefer:

```sql
id uuid primary key default gen_random_uuid(),
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

Skip `updated_at` only for append-only tables or static lookup tables where it is genuinely not useful.

#### RLS and Authorization

- Enable RLS on every new table in `public`.
- Do not use `auth.role()` in new policies.
- Use `TO authenticated` or `TO anon` policy clauses.
- `TO authenticated` alone is authentication, not authorization. Add ownership or role checks when users should not see every row.
- Do not use user-editable metadata for authorization decisions.
- Prefer `profiles.role` or trusted app metadata for role decisions.
- For update policies, define both `USING` and `WITH CHECK`.
- Be careful with `SECURITY DEFINER`; do not add it just to bypass permission errors.

#### Foreign Keys and Master Data

- Use `masters` for shared reference categories such as `bd`, `bd_level`, `customer_type`, and `point_type`.
- Store ids in business tables and map them to labels in UI.
- Avoid duplicate label columns unless the label must be snapshotted historically.
- Keep inactive master rows when historical records still reference them.
- Before deleting a master item, check every related table that references it.

#### Realtime

If a feature needs realtime:

- Ensure the table is available to Supabase Realtime.
- Subscribe in the feature page or component that owns the list.
- Use stable channel names such as `<feature>-changes`.
- Handle `INSERT`, `UPDATE`, and `DELETE` when the UI can show all three.
- Keep selected/open dialog state synchronized when realtime updates the selected row.
- Remember that a tab subscribes only after it has been opened for the first time.

#### Attachments

Current attachment behavior:

- Q&A attachment metadata is stored in `qa_tickets.attachments` JSONB.
- Approval attachment metadata is stored in `approval_requests.images` JSONB.
- Files are uploaded and deleted through Cloudinary API routes under `web/app/api/cloudinary/`.
- Supabase Storage is not currently part of the attachment flow.

Do not add Supabase attachment tables or Supabase Storage flows unless the product intentionally changes this architecture.

When adding attachment support:

- Reuse the Cloudinary API route pattern unless there is a strong reason not to.
- Store only metadata needed by UI and cleanup: ids, names, sizes, resource type, public id, URLs, format, version, and thumbnail URL.
- Delete Cloudinary resources when deleting rows or removing attachments.
- Keep upload routes server-side; never expose Cloudinary secrets in client code.

#### Migrations and Cleanup

Use migrations so the repo remembers schema changes:

- Put schema changes in `supabase/migrations/`.
- Prefer creating migration files with the Supabase CLI when available.
- Keep migration SQL explicit.
- For destructive changes, record why the object is unused and whether data exists.
- Avoid broad `cascade` drops unless dependencies have been reviewed.
- After schema changes, verify the live database and update docs, types, and code references.

Before dropping a table or column:

1. Search references in `web`, `mobile`, and `supabase/functions`.
2. Check row count and non-null count.
3. Check foreign keys, views, triggers, and policies.
4. Confirm whether the data belongs only to an old experiment.
5. Prefer explicit `drop table` or `drop column` statements in a migration.
6. Verify with Supabase table listing or catalog queries after applying.

#### Mobile Maintenance

- Treat `mobile/` as early-stage unless this README says otherwise.
- Keep mobile Supabase access aligned with the web schema.
- Do not add mobile-only tables unless the web app also understands the workflow.
- When changing a table used by `mobile/lib/features/home/data/performance_repository.dart`, update the Dart models too.

### Suggested Reading Order for New Contributors

| Step | File or Area | Why |
| --- | --- | --- |
| 1 | [web/components/HomeTabs.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/components/HomeTabs.tsx) | Understand app entry and tab lifecycle |
| 2 | [web/lib/app/tabsConfig.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/lib/app/tabsConfig.tsx) | Understand tab registration and role-context wiring |
| 3 | [web/lib/auth/userRoleContext.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/lib/auth/userRoleContext.tsx) | Understand role-based behavior |
| 4 | [web/lib/features/masters/useMasters.ts](/Users/nhuffan/Documents/Projects/BD-tracker/web/lib/features/masters/useMasters.ts) | Understand master data caching |
| 5 | One business module page | Learn a full workflow end-to-end |
| 6 | Related dialogs/helpers | See write flows, exports, and attachment handling |

---

## Quick Start

### For End Users

- Use the `web` app
- Sign in with your assigned account
- Work inside the relevant tabs for your role

### For Developers

```bash
cd web
npm install
npm run dev
```

### For Mobile Experiments

```bash
cd mobile
flutter pub get
flutter run
```
