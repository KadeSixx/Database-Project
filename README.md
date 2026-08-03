# FitCore Gym Management System

A database-backed website for a university database systems project. It includes validated forms, live report views, and complete create, read, update, and delete controls for members, employees, trainers, membership plans, classes, enrollments, and payments.

The schema and sample data were reconstructed from the **Task C** report and corrected so that primary keys, foreign keys, data types, and relationships are consistent. The website supports MySQL 8+ and an embedded SQLite fallback, so teammates can run it even when MySQL is unavailable.

## Run locally

1. Install Node.js 22.5 or newer.
2. Run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000`.

Without `.env.local`, the embedded database is created automatically in `data/gym.db`. When `.env.local` contains the MySQL settings shown in `.env.example`, the same API and frontend use MySQL instead.

## Test

Run `npm test` to verify seeded queries, validation, and all four CRUD operations.

## MySQL setup

1. Sign in to a MySQL 8+ server.
2. Run `database/create.sql`.
3. Run `database/load.sql`.
4. Create a least-privilege application user with `SELECT`, `INSERT`, `UPDATE`, and `DELETE` access to `gym_db`.
5. Copy `.env.example` to `.env.local` and enter that user's local credentials.

## Project contents

- `public/` - current FitCore website
- `server.js` - HTTP server, validation, and CRUD API
- `database/create.sql` - corrected MySQL schema
- `database/load.sql` - corrected Task C sample data
- `TaskB-html-only/` - earlier HTML-only deliverable
- `output/pdf/TaskB.pdf` - PDF version of the Task B deliverable
