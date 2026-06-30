# Prodisenyo ProBuild

Prodisenyo ProBuild is a Next.js and Supabase operations system for attendance uploads, attendance review, payroll generation, overtime requests, payroll approvals, project budgeting, cost estimation, material requests, analytics, and workspace administration.

The app is designed for construction and operations teams that need one shared workspace for biometric attendance files, payroll calculations, approval workflows, and project cost tracking.

## Core Features

- Role-based dashboard experience for CEO, payroll manager, engineer, and employee accounts.
- Biometric attendance upload and parsing from spreadsheet-style attendance exports.
- Attendance review workflow before payroll generation.
- Payroll preview, branch-specific employee rates, paid hours, deductions, overtime, holidays, and payroll report submission.
- CEO approval queues for payroll reports, overtime approvals, and estimate reviews.
- Overtime request workflow for employees and managers.
- Budget tracker for project-level cost planning and payment progress.
- Cost estimator workflow for engineer-submitted estimates and CEO review.
- Material request workflow.
- Historical payroll, attendance, and dashboard analytics.
- Supabase-backed authentication, database storage, row-level security, and server actions.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase Auth, Database, Storage, and Row Level Security
- Server Actions
- SWR
- Framer Motion
- Recharts
- pdf-lib
- xlsx
- Lucide React icons

## User Roles

### CEO

CEO users can review the full operational picture.

- View dashboard and analytics.
- Review submitted payroll reports.
- Approve or reject overtime.
- Review submitted cost estimates.
- Manage users.
- Reset workspace data.
- Access budget tracking.

### Payroll Manager

Payroll managers handle attendance and payroll preparation.

- Upload attendance reports.
- Review attendance.
- Generate payroll.
- Edit payroll calculations when allowed.
- Configure employee branch rates and regular paid hours.
- Submit payroll reports for CEO approval.
- Create overtime requests.
- Access budget tracking in view-oriented workflows.

### Engineer

Engineers focus on planning and requests.

- Use Budget Tracker.
- Create cost estimates.
- Submit estimates for CEO review.
- Submit material requests.
- Submit overtime requests.

### Employee

Employees have a smaller request-focused workflow.

- View their home page.
- Submit overtime requests.

## Main Workflows

## Attendance To Payroll

1. Payroll manager opens `Upload Attendance`.
2. User selects one or more attendance files.
3. User clicks `Review Attendance Reports`.
4. The app parses the files, saves the attendance import, and redirects to `Review Attendance`.
5. Payroll manager reviews attendance rows.
6. Payroll manager opens `Generate Payroll`.
7. Payroll manager generates payroll preview.
8. Payroll manager can adjust rates, paid hours, overtime, deductions, paid holidays, and related payroll data.
9. Payroll manager submits the payroll report.
10. CEO reviews the submitted payroll report.
11. CEO approves or rejects the payroll report.

## Branch-Specific Payroll Rates

The payroll rate modal lets payroll managers save employee rates per branch or site.

Saved values are stored in `employee_branch_rates`.

Important fields:

- `employee_name`
- `employee_name_key`
- `role_code`
- `site_name`
- `site_name_key`
- `daily_rate`
- `regular_paid_hours`

If Supabase shows an error such as `regular_paid_hours column does not exist`, run the repair SQL in `supabase/repair-payroll-schema.sql`.

## Overtime Requests

Users submit overtime requests from `Request Overtime`.

Requests can be:

- Manual approval requests.
- Advance overtime requests that can be auto-approved on the request date when payroll is generated.

Overtime request data is stored in `overtime_requests` and can be linked to `payroll_adjustments`.

If Supabase shows an error such as `overtime_requests.approval_mode does not exist`, run the repair SQL in `supabase/repair-payroll-schema.sql`.

## Budget Tracker

Budget Tracker is used for project cost planning and payment tracking.

Typical workflow:

1. Create or open a budget project.
2. Add budget items.
3. Track payment status.
4. Review summaries by project status and amount.

Budget tracker code lives under:

```text
features/budget-tracker/
```

Server mutations live in:

```text
actions/budgetTracker.ts
```

## Cost Estimator

Engineers can prepare project estimates and submit them for CEO review.

Typical workflow:

1. Engineer creates an estimate.
2. Engineer adds materials and estimate items.
3. Engineer submits the estimate.
4. CEO reviews it in `Estimate Reviews`.
5. CEO approves or rejects it.
6. Approved estimates can feed project planning and budget tracking.

Cost estimator code lives under:

```text
features/cost-estimator/
```

Server mutations live in:

```text
actions/costEstimator.ts
```

## Project Structure

```text
app/                    Route entry points and layouts
actions/                Server actions and privileged write operations
features/               Domain code organized by feature
components/             Shared cross-feature UI components
lib/                    App-wide infrastructure and shared helpers
types/                  Shared application types
public/                 Static assets
supabase/               Database schema, seed, reset, and repair SQL
scripts/                Utility scripts
biometrics/             Sample or local biometric input files
templates/              Static template assets
```

## Feature-First Architecture

The repository follows a feature-first structure. Route files in `app/` should stay thin and should mainly assemble feature-level components.

Preferred feature layout:

```text
features/<feature-name>/
  components/
  hooks/
  utils/
  types.ts
```

Guidelines:

- Put presentational and feature UI in `features/<feature-name>/components`.
- Put reusable client-side orchestration and state in `features/<feature-name>/hooks`.
- Put pure helpers, selectors, mappers, formatters, and constants in `features/<feature-name>/utils`.
- Put feature-local types in `features/<feature-name>/types.ts`.
- Put server mutations and privileged writes in `actions/*.ts`.
- Put shared UI primitives in `components/`.
- Put shared infrastructure in `lib/`.
- Put app-wide shared types in `types/`.

## Important Routes

```text
/home                         Role-aware home page
/upload-attendance            Upload attendance reports
/review-attendance            Review parsed attendance rows
/generate-payroll             Generate and submit payroll
/request-overtime             Submit overtime requests
/payroll-reports              CEO payroll report review
/overtime-approvals           CEO overtime approval queue
/budget-tracker               Budget tracking
/cost-estimator               Engineer cost estimator
/estimate-reviews             CEO estimate review queue
/request-material             Material request form
/attendance-analytics         Attendance analytics
/payroll-analytics            Payroll analytics
/settings                     Profile and account settings
/add-user                     User management
/reset-data                   Workspace reset
```

## Environment Variables

Create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

Do not commit real Supabase keys.

The service role key is used by server actions for privileged database writes. Keep it private.

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Run lint:

```bash
npm run lint
```

Build for production:

```bash
npm run build
```

Start a production build:

```bash
npm start
```

## Supabase Setup

The main schema file is:

```text
supabase/schema.sql
```

Additional schema files:

```text
supabase/budget-tracker-schema.sql
supabase/cost-estimator-schema.sql
```

Useful maintenance files:

```text
supabase/clear-data.sql
supabase/repair-payroll-schema.sql
```

For a new Supabase project, apply the schema SQL files in Supabase SQL Editor. If the project was created earlier and is missing newer payroll columns, run:

```text
supabase/repair-payroll-schema.sql
```

That repair file adds:

- `employee_branch_rates.regular_paid_hours`
- `overtime_requests.approval_mode`
- `overtime_requests.auto_approved_at`
- `overtime_requests.payroll_adjustment_id`
- `overtime_requests.role_code`
- The overtime approval mode check constraint.
- The overtime auto-approval lookup index.
- A PostgREST schema reload notification.

## Seed Users

Seed user data is stored in:

```text
supabase/seed-users.json
```

The seed script is:

```text
scripts/seed-users.mjs
```

Run:

```bash
npm run seed:users
```

Make sure `.env.local` contains valid Supabase keys before running the seed script.

## Route Protection

Route protection is handled in:

```text
proxy.ts
lib/supabase/middleware.ts
```

When adding a new role-specific page:

- Add the route entry in `app/`.
- Update the matcher in `proxy.ts`.
- Update protected prefixes and role allowlists in `lib/supabase/middleware.ts`.
- Keep page-level role checks as defense in depth when the page is privileged.

## Server Actions

Server actions live in `actions/`.

Important action files:

```text
actions/attendance.ts          Attendance import persistence
actions/payroll.ts             Payroll reports, overtime sync, approvals
actions/payrollRates.ts        Employee branch rate saves
actions/budgetTracker.ts       Budget tracker mutations
actions/costEstimator.ts       Cost estimator mutations
actions/materialRequests.ts    Material request mutations
actions/users.ts               User management
actions/resetData.ts           Workspace reset
actions/auth.ts                Auth-related actions
```

Actions should validate and normalize inputs before writing to the database.

## Common Troubleshooting

### `column employee_branch_rates.regular_paid_hours does not exist`

Your Supabase database is behind the app schema.

Run:

```text
supabase/repair-payroll-schema.sql
```

### `column overtime_requests.approval_mode does not exist`

Your Supabase database is missing newer overtime request fields.

Run:

```text
supabase/repair-payroll-schema.sql
```

### Supabase schema was updated but errors still appear

Run the repair SQL and make sure this line succeeds:

```sql
notify pgrst, 'reload schema';
```

Then refresh the app. If the dev server still shows stale behavior, restart `npm run dev`.

### Sidebar or UI order looks stale during development

Next.js Turbopack can occasionally keep stale compiled output. Restart the dev server. If needed, stop the server, remove `.next`, and run:

```bash
npm run dev
```

### Uploaded files were restored after refresh but cannot be parsed

Browser `File` objects cannot be fully restored from local storage after refresh. Re-select the files and process them again.

## Coding Standards

Naming conventions:

- React component files use PascalCase, for example `BudgetTrackerPageClient.tsx`.
- Hooks start with `use`, for example `useHistoricalDashboardData.ts`.
- Utility files use camelCase, for example `analyticsSelectors.ts`.
- Feature folders use kebab-case, for example `budget-tracker`.
- Server action exports use an `Action` suffix when they are callable mutations.

Component guidelines:

- Keep route files thin.
- Split large client components into smaller components, hooks, and utilities.
- Prefer components under the owning feature before creating shared abstractions.
- Avoid embedding database writes directly in React components.
- Keep helpers explicit and domain-named.

## Key Feature Folders

```text
features/app                  Shared app state provider and PWA registration
features/home                 Role-aware home page
features/attendance           Attendance review
features/payroll              Payroll generation, edits, approvals, overtime queues
features/payroll-reports      Payroll report archive and CEO review
features/dashboard            CEO dashboard and historical summaries
features/analytics            Attendance and payroll analytics
features/budget-tracker       Budget tracker
features/cost-estimator       Cost estimator and estimate reviews
features/material-requests    Material requests
features/overtime-requests    Overtime request form
features/settings             Profile, password, avatar, and reset settings
features/user-management      User management
features/reset-data           Workspace reset UI
```

## Notes For Future Development

- Match the existing feature-first structure before adding new folders.
- Keep Supabase schema changes mirrored in `types/database.ts` when database types change.
- Add repair SQL when a change must be applied to an already-running Supabase project.
- Revalidate affected routes after successful server mutations when needed.
- Preserve role protection changes when adding new pages.
- Keep user-facing toast messages plain and action-oriented.

## Codex Repo Rules

Project-specific coding and collaboration instructions live in:

```text
AGENTS.md
```

Keep `AGENTS.md` updated whenever the repository architecture or development rules change.
