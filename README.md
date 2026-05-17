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
- The current user role is resolved via [web/lib/useCurrentUserRole.ts](/Users/nhuffan/Documents/Projects/BD-tracker/web/lib/useCurrentUserRole.ts).
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

Role resolution is handled in [web/lib/useCurrentUserRole.ts](/Users/nhuffan/Documents/Projects/BD-tracker/web/lib/useCurrentUserRole.ts).

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

- Shared reference data is loaded via [web/lib/useMasters.ts](/Users/nhuffan/Documents/Projects/BD-tracker/web/lib/useMasters.ts)
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

### Suggested Reading Order for New Contributors

| Step | File or Area | Why |
| --- | --- | --- |
| 1 | [web/components/HomeTabs.tsx](/Users/nhuffan/Documents/Projects/BD-tracker/web/components/HomeTabs.tsx) | Understand app entry and tab lifecycle |
| 2 | [web/lib/useCurrentUserRole.ts](/Users/nhuffan/Documents/Projects/BD-tracker/web/lib/useCurrentUserRole.ts) | Understand role-based behavior |
| 3 | [web/lib/useMasters.ts](/Users/nhuffan/Documents/Projects/BD-tracker/web/lib/useMasters.ts) | Understand master data caching |
| 4 | One business module page | Learn a full workflow end-to-end |
| 5 | Related dialogs/helpers | See write flows, exports, and attachment handling |

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
