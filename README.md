# FitCore Gym Management System

A database-backed website for a university database systems project. It includes validated forms, live report views, and complete create, read, update, and delete controls for members, employees, trainers, membership plans, classes, enrollments, and payments.

The schema and sample data were reconstructed from the **Task C** report and corrected so that primary keys, foreign keys, data types, and relationships are consistent. The website supports MySQL 8+ and an embedded SQLite fallback, so teammates can run it even when MySQL is unavailable.

## Run locally

1. Install Node.js 22.5 or newer.
2. Run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000`.

Without `.env.local`, the embedded database is created automatically in `data/gym.db`. When `.env.local` contains the MySQL settings shown in `.env.example`, the same API and frontend use MySQL instead.

## Logging in

Every page requires signing in at `/login.html`. Demo accounts (seeded automatically):

| Username   | Password      | Role    | Notes                                   |
|------------|---------------|---------|------------------------------------------|
| `admin`    | `admin123`    | admin   | Full access to everything                |
| `trainer1` | `trainer123`  | trainer | Linked to trainer `E-18` (Kelly Monahan) |
| `trainer2` | `trainer123`  | trainer | Linked to trainer `E-37` (Corey Parker)  |
| `member1`  | `member123`   | member  | Linked to member `M-46` (Jeff Emmerich)  |
| `member2`  | `member123`   | member  | Linked to member `M-22`                  |

Role permissions:
- **Admin** — full read/write access to every table.
- **Trainer** — can view all members and classes, but can only edit their *own* classes and mark attendance on enrollments in their own classes. No access to employee or payment records.
- **Member** — can view their own profile, enrollments, and payments, view the class/trainer catalog, and self-enroll in classes. No access to other members' data, employee records, or payments.

### ⚠ The login itself is intentionally vulnerable to SQL injection

At the requester's ask, `/api/auth/login` in `server.js` builds its query with
string concatenation instead of parameters, and the `users` table stores
passwords in plain text — unlike every other query in this app, which is
already parameterized. This is meant for practicing/exploiting SQL injection
before patching it, not for real use. Try signing in as `admin` with the
password `' OR '1'='1` — the WHERE clause becomes always-true and logs you in
without knowing the real password. To fix it, swap the raw string in
`handleLogin` for a parameterized query (`dbGet("SELECT * FROM users WHERE
username=? AND password=?", [username, password])`) and hash passwords
instead of storing them as plain text. Do not deploy this anywhere reachable
by anyone else until that's fixed.

## Test

Run `npm test` to verify seeded queries, validation, and all four CRUD operations.

## MySQL setup

1. Sign in to a MySQL 8+ server.
2. Run `database/create.sql`.
3. Run `database/load.sql`.
4. Create a least-privilege application user with `SELECT`, `INSERT`, `UPDATE`, and `DELETE` access to `gym_db`.
5. Copy `.env.example` to `.env.local` and enter that user's local credentials.

## Project contents

- `public/` - current FitCore website (`login.html` and `auth.js` handle sign-in and role-based UI)
- `server.js` - HTTP server, validation, CRUD API, sessions, and role-based access control
- `database/create.sql` - corrected MySQL schema (includes the `users` table)
- `database/load.sql` - corrected Task C sample data
- `database/migrations/003_add_users.sql` - adds login accounts to an existing MySQL database
- `TaskB-html-only/` - earlier HTML-only deliverable
- `output/pdf/TaskB.pdf` - PDF version of the Task B deliverable
