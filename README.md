# Pariya School Management System — Supabase Edition

Full migration off Google Sheets, onto Supabase (Postgres + Auth + Storage + Edge Functions). Built,
tested with real numbers, and finalized.

## Your login

- Go to the app, choose **Staff / Admin**, and sign in with the credentials given to you separately in
  chat (not written here on purpose — this repo may be public on GitHub).
- **Change this password immediately** from Settings → My Account once you're in, so no one else who saw
  that chat message can log in either.

## What's live on your Supabase project

- **Full database schema** — school_settings, sessions/terms, classes (all 12 seeded), subjects, staff,
  students, student_scores, student_term_summary, fee_structure, fee_payments, awards, testimonials,
  security_pins, timetable, school_websites — every Google Sheet replaced with a real table.
- **Row Level Security** on every table, enforcing admin / headmaster / principal / bursar / teacher /
  student permissions at the database level (not just hidden in the UI — verified, see Testing below).
- **Report card engine** as Postgres functions/triggers (`recompute_class_term`, `recompute_annual_summary`)
  reproducing your exact grading scale, the "dead subject" exclusion rule, standard-competition tie-break
  ranking, and the Third Term annual summary — recalculated automatically every time a score is saved.
- **Storage buckets** for school logos, signatures, and student/staff photos.
- **Auth** via a `provision-user` Edge Function + shadow-email pattern, so staff sign in with Staff ID and
  students sign in with Admission No + Class, while still using real Supabase Auth sessions underneath.
- **Standard curriculum already seeded** across all 12 classes (Nursery/Primary/JSS/SS), including Islamic
  Religious Studies, Qur'an, Arabic, and Hausa alongside the core Nigerian curriculum — editable anytime
  from Curriculum & Assignments.

## What the app can do

- Staff and student sign-in (persistent session)
- **Classes & Scores** — enter/edit scores per class/term; averages, grades, and positions
  auto-recompute on save
- Report card view/print, with per-subject position labels, signatures pulled live from Staff Directory
- **Master List** per class
- **Curriculum & Assignments** — create/rename/remove subjects, assign subjects to classes, assign teachers
  to class+subject pairs
- **Staff Directory** — add/edit/deactivate staff, assign positions, set passwords (creates real logins)
- **Students** — add/edit/deactivate, assign class, set passwords
- **Timetable** — weekly grid per class, teacher dropdowns scoped to actual assignments, live
  double-booking conflict detection across the whole school
- **Certificates & Awards** — Best Student award tracking, printable Best Student / Testimonial
  (graduating classes only) / Staff certificates
- **Analytics** — class averages and pass rates per term
- **CA Tracker** — score-entry completion % per class
- **Fees** — record payments per class/term, force paid/unpaid override
- **School Websites vault** — CRUD for related portal URLs/credentials
- **Bulk Import** — paste-CSV tool for migrating student/staff rosters out of Google Sheets
- **Settings** — school profile, security PINs, active term switch, change your own password
- **Student portal** — view report card by term, automatically blocked if fees aren't paid

## Testing performed before calling this done

- Hand-calculated a full term of scores across 4 students and verified averages, grades, positions, the
  dead-subject exclusion rule, and per-subject tie-break ranking against the database's actual output —
  every number matched.
- Ran a full 3-term cycle and verified the Third Term annual summary against hand math — matched to the
  decimal.
- Simulated an unpaid student's session directly against the database (not the UI) and confirmed they see
  **zero** score/summary rows. Simulated a paid student's session and confirmed they see **only their own
  4 subject scores**, nothing from classmates.
- Found and fixed two real bugs in the process: a temp-table collision that crashed bulk score saves, and a
  fail-open fees bug where a student with no payment on file was silently treated as "paid" instead of
  blocked. Both fixed and re-verified.
- All 7 JS files pass syntax checks, no duplicate function names across files, every script tag resolves.
- Test/demo data was fully cleaned up afterward — your database currently has only the `admin` account.

## Known low-priority items (not blockers)

- Supabase's linter flags ~150 "multiple permissive policies" notices — pairs of policies like "admin can
  do everything" + "anyone signed in can read" on the same table, which Postgres correctly OR's together.
  No practical impact at single-school scale; consolidating them is a nice-to-have.
- "Leaked password protection" (checks new passwords against known-breached lists) is off by default — a
  toggle in your Supabase Dashboard under Auth → Policies, not something set via SQL. Worth enabling
  whenever convenient.

## Not built (flagged honestly, not silently skipped)

- Visual polish to fully match the original app's richer layout (same colour palette/fonts, simpler layout)
- CSV import for historical **scores** (only students/staff bulk-import today)
- Excel/Word export buttons on Master List/Timetable (print-to-PDF works today via the browser's Print
  dialog)

## Deploying from GitHub

This is a static site (HTML/CSS/JS, no build step), so GitHub Pages works directly:

1. Push this folder's contents to a GitHub repo (e.g. `pariya-sms`).
2. In the repo: **Settings → Pages → Source** → select the branch (usually `main`) and root folder → Save.
3. GitHub gives you a URL like `https://<your-username>.github.io/pariya-sms/` within a minute or two.
4. Every future `git push` to that branch redeploys automatically — no build step, no CI config needed.

Netlify or Vercel work the same way if you'd rather use those instead — just point either at the repo with
no build command and an output directory of `/`.

**Before your first push**, double check:
- No real student/staff passwords or personal data are hardcoded anywhere in these files (they aren't —
  everything lives in Supabase, not in the code).
- The Supabase URL and publishable key in `app.js` are meant to be public (that's what Row Level Security
  is for) — safe to commit as-is.
- If this repo is public, don't add the admin password to any commit, issue, or commit message. Anyone
  who can read the repo could otherwise read the password and log in as your admin.

## How to run it locally

Static site, no build step:
1. Open `index.html` directly in a browser, or
2. Deploy the whole `pariya-sms-app` folder to Netlify, Vercel, or GitHub Pages as-is, or
3. Locally: `npx serve .` inside this folder, then open the printed localhost URL.

Supabase connection details (project URL + publishable key) are already embedded in `app.js` — no `.env`
needed; the publishable key is safe to expose in the browser since RLS is what actually protects the data.

## Suggested next steps for you

1. Log in as `admin`, change the password immediately.
2. **Staff Directory** → add your real teachers, headmaster, principal, bursar.
3. **Curriculum & Assignments** → trim the SS subject list per class to match each student's actual track
   (Science/Arts/Commercial) — right now SS has every typical elective assigned as a starting point.
4. **Students** → add your real student rosters (or use **Bulk Import** to paste a CSV).
5. Assign teachers to class+subject pairs, then start entering scores in **Classes & Scores**.
