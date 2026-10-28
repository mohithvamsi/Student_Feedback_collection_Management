# Student Feedback Collection Management (CampusVoice)

A beginner-friendly full-stack college project for collecting student feedback about courses and faculty. Students create accounts, submit a course rating and constructive comments, and track the review status. Administrators can view submissions and mark them submitted, reviewed, or resolved.

## 1. Problem and objectives

Students need a consistent way to share feedback about teaching, course content, resources, assessments, and facilities. CampusVoice organizes that feedback in one database-backed application so administrators can review submissions and identify areas for improvement.

### Roles
- **Student:** registers, signs in, submits feedback, and views only their own submissions.
- **Administrator:** signs in to view all feedback and update its status. Public registration always creates a student account; an administrator must be promoted manually by a trusted project owner in Supabase SQL Editor.

### Implemented MVP features
- Student registration and sign-in with bcrypt password hashing.
- Signed JSON Web Token (JWT) sessions with an eight-hour default expiry.
- Course/faculty fields, rating from 1–5, feedback category, comments, and submission timestamp.
- Student-specific feedback history.
- Admin overview of feedback, aggregate counts, average rating, and status updates.
- Input validation on both browser and server.
- Responsive interface, loading/empty/error states, and confirmation-free status changes (status is reversible).
- Supabase PostgreSQL persistence; no browser localStorage is used for records or tokens.

Not included: password reset/email verification, anonymous feedback, editing/deleting submitted feedback, multiple institutions, export reports, and automated browser tests. Feedback is tied to the student account and is therefore not anonymous.

## 2. Technology stack

- HTML5, CSS3, Vanilla JavaScript
- Node.js (20 or newer recommended) and Express 5
- Supabase PostgreSQL
- npm packages: `@supabase/supabase-js` (database client), `bcryptjs` (password hashing), `jsonwebtoken` (signed tokens), `dotenv` (configuration), `helmet` (security headers), `express-rate-limit` (auth attempt limiting), and `cors` (explicitly disabled cross-origin browser access)

## 3. Folder structure

```text
student-feedback-collection-management/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── backend/
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── feedback.js
│   ├── server.js
│   ├── supabase.js
│   ├── package.json
│   ├── .env
│   ├── .env.example
│   └── .gitignore
├── database/
│   └── schema.sql
├── .gitignore
└── README.md
```

`backend/.env` is a local template in this downloaded project. Replace its placeholders before running and do not commit it. The `.gitignore` rules exclude it.

## 4. Prerequisites and installation links

Install:
- [Visual Studio Code](https://code.visualstudio.com/)
- [Node.js LTS](https://nodejs.org/) (npm is included)
- [Git](https://git-scm.com/downloads)
- A free [Supabase account](https://supabase.com/)

Open the project folder in VS Code, then open **Terminal → New Terminal**. Commands below assume the terminal starts in the project root unless specified.

Verify installations:

```bash
node --version
npm --version
git --version
```

Node should be v20 or newer. If a command is not recognized, install the software and restart VS Code/your terminal.

## 5. Create the Supabase database

1. Sign in at https://supabase.com/ and create a new project. Save the database password privately.
2. Wait for the project to finish provisioning.
3. In the project dashboard, open **SQL Editor** → **New query**.
4. Open `database/schema.sql` in VS Code, copy the complete file, paste it into the SQL Editor, and click **Run**.
5. Open **Table Editor**. Confirm `app_users` and `feedback` exist.
6. Open **Project Settings → API** (the labels may vary slightly). Copy the project URL and the server-side secret/service-role key. The service-role key is privileged: use it only in `backend/.env`. Never paste it into frontend files, screenshots, GitHub, or public documentation.

### Create an administrator safely

First register a student account through the application. Then, in Supabase SQL Editor, run the following query after replacing the email with that account's email:

```sql
update public.app_users
set role = 'admin'
where email = 'your-admin-email@example.com';
```

Confirm exactly one row was updated. Sign out and sign back in so the new role is included in the JWT. Only a trusted project owner should run this SQL. Never expose admin promotion as a public API.

## 6. Environment variables

Open `backend/.env` and replace the placeholders:

```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_REAL_SERVER_SIDE_KEY
JWT_SECRET=YOUR_RANDOM_SECRET
JWT_EXPIRES_IN=8h
```

- `PORT`: local web server port.
- `NODE_ENV`: use `development` locally; use `production` when deployed.
- `SUPABASE_URL`: URL from your Supabase project settings.
- `SUPABASE_SERVICE_ROLE_KEY`: privileged key used only by the backend. Never commit it.
- `JWT_SECRET`: secret used to sign login tokens. Generate one from the project root with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy the output into `JWT_SECRET`. Do not share it. If the secret changes, existing tokens become invalid. `.env.example` documents the variable names with placeholders; `.env` contains your machine-specific values and must remain private.

## 7. Install and run

From the **project root**:

```bash
cd backend
npm install
npm run check
npm start
```

- `npm install` downloads the packages into `backend/node_modules/`.
- `npm run check` checks JavaScript syntax.
- `npm start` launches Express.

Expected terminal message: `CampusVoice is running at http://localhost:3000`

Open **http://localhost:3000** in your browser. Do not open `frontend/index.html` by double-clicking it; the application needs Express to serve the frontend and API.

To stop the server, focus the terminal and press `Ctrl+C`. For automatic restart while developing, use `npm run dev`.

## 8. Architecture

```text
Browser (HTML/CSS/Vanilla JS)
       │ fetch('/api/...')
       ▼
Express server (validation + JWT authorization)
       │ Supabase server client
       ▼
Supabase PostgreSQL (app_users, feedback)
```

The browser never connects directly to Supabase. Express serves files from `frontend/`, validates input, verifies the JWT, checks roles, and then uses the server-only Supabase key for database operations.

### Authentication and security notes

This teaching MVP uses custom email/password authentication rather than Supabase Auth. Passwords are hashed with bcrypt; the server signs an eight-hour JWT. The browser keeps the token in JavaScript memory only, so refreshing the page signs the user out. This avoids persistent browser token storage in the starter project, but means the user must sign in again after refresh.

PostgreSQL RLS is enabled on both tables without public policies. Since the server uses a privileged service key, RLS does not replace Express authorization; the server is the security boundary. Keep dependencies updated, use HTTPS in deployment, rotate leaked credentials, and consider moving to Supabase Auth and secure cookie sessions for a production system. Do not use real sensitive student data in a classroom demo.

## 9. REST API reference

All request and response bodies use JSON. Authenticated routes require `Authorization: Bearer <token>`. Tokens are returned by login/register.

| Method | Path | Purpose | Auth/permission | Success |
|---|---|---|---|---|
| GET | `/api/health` | Server health | Public | `200 {"status":"ok","service":"CampusVoice API"}` |
| POST | `/api/auth/register` | Create student account | Public; rate-limited | `201 {"token":"…","user":{…}}` |
| POST | `/api/auth/login` | Sign in | Public; rate-limited | `200 {"token":"…","user":{…}}` |
| GET | `/api/feedback` | List feedback | Student sees own; admin sees all | `200 {"feedback":[…]}` |
| POST | `/api/feedback` | Submit feedback | Student only | `201 {"feedback":{…}}` |
| PATCH | `/api/feedback/:id/status` | Update status | Admin only | `200 {"id":"…","status":"reviewed"}` |

Registration JSON: `fullName`, `email`, `password`, optional `department`. Password length is 8–72 characters. Public registration always assigns `student`.

Feedback JSON: `courseName` (2–120 chars), `courseCode` (0–30), `facultyName` (2–120), `rating` (integer 1–5), `category` (`teaching`, `course-content`, `resources`, `assessment`, `facilities`, `other`), and `comments` (10–2000 chars).

Common errors: `400` invalid input, `401` missing/invalid token or incorrect login, `403` insufficient role, `404` record/route not found, `409` duplicate email, `500` generic server error. Error responses use `{"error":"Readable explanation"}`. Database details and stack traces are logged server-side, not returned to the browser.

## 10. Sample usage and manual testing

1. Open the app and create a student account.
2. Submit feedback for a course, selecting a rating and category.
3. Confirm it appears in the dashboard after submission.
4. Sign out and sign back in; the record should still exist in Supabase.
5. Register another student account; it must not see the first student's feedback.
6. Promote a test account to admin with the SQL above, sign in again, and verify it can see feedback from both students.
7. As admin, change a feedback status to Reviewed or Resolved. Confirm the status persists after refreshing and signing in again.
8. Try empty fields, invalid email, password shorter than 8 characters, rating not selected, comments shorter than 10 characters, and duplicate email. The server should reject invalid requests with readable messages.
9. Try opening `/api/feedback` without a token using a REST client or browser; it should return `401`.
10. Resize the browser to mobile width and check forms, cards, and navigation.

The project includes a JavaScript syntax check (`npm run check`) but no automated database integration test. A real Supabase connection cannot be verified until you add your own credentials and run it.

## 11. Troubleshooting

- **Missing SUPABASE_URL / key:** Check `backend/.env` spelling and ensure the values belong to the same Supabase project. Restart the server after edits.
- **Invalid JWT_SECRET:** Generate a random secret using the command above; use at least 32 characters.
- **`relation ... does not exist`:** Run the full `database/schema.sql` in the correct Supabase project's SQL Editor.
- **Login fails for a newly created account:** Check the database connection and confirm the registration succeeded in `app_users`.
- **Port already in use:** Change `PORT=3001` in `.env`, restart, and open `http://localhost:3001`.
- **`npm` or `node` not recognized:** Install Node.js LTS, restart terminal/VS Code, and rerun version checks.
- **Unexpected 500:** Check the backend terminal logs. Never paste secrets or full environment files into issue reports.
- **CSS/JS seems old:** Hard-refresh the browser with `Ctrl+F5`.
- **Admin still sees student view:** Sign out and sign back in after promotion so a new token is issued.

## 12. Git and GitHub upload

1. Create an empty repository at https://github.com/new. Do not add a README if you already have one locally.
2. Open a terminal in the project root. Before staging, check the ignore rules:

```bash
git status --ignored
```

3. Initialize and commit:

```bash
git init
git status
git add .
git status
git commit -m "Build student feedback management project"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual repository URL, such as the HTTPS URL GitHub shows for your own repository. If Git asks you to configure a name/email, use:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Check the second `git status` output before committing. `backend/.env`, `node_modules/`, private student records, and database exports must not be staged. `.env.example` should be staged. After pushing, refresh the GitHub repository page and verify the project files are visible.

**Important:** `.gitignore` does not remove secrets already committed. If a credential was committed or pushed, rotate/revoke it immediately, remove it from repository history where appropriate, and check repository history and logs.

## 13. Limitations and future improvements

This MVP does not implement password reset, email verification, anonymous submissions, feedback editing/deletion, downloadable reports, or automated end-to-end tests. JWTs live only in browser memory and are lost on refresh. Before production deployment, use Supabase Auth or secure server-managed sessions, HTTPS, stricter account policies, backups, monitoring, and a formal privacy policy.

## 14. Final verification checklist

- [ ] SQL schema executed and `app_users` / `feedback` tables exist.
- [ ] Local `backend/.env` contains valid private credentials and is not committed.
- [ ] `npm run check` passes.
- [ ] `npm start` starts the server.
- [ ] `/api/health` returns status `ok`.
- [ ] Student registration, login, feedback submission, and history work.
- [ ] A student cannot see another student's feedback.
- [ ] Admin status updates work only after trusted role promotion.
- [ ] GitHub repository contains source and `.env.example`, not secrets.
