# FitCore Gym Management System

A database-backed website for a university database systems project. It includes validated forms, live report views, and complete create, read, update, and delete controls for members, employees, trainers, membership plans, classes, enrollments, and payments.

The schema and sample data were reconstructed from the **Task C** report and corrected so that primary keys, foreign keys, data types, and relationships are consistent. The runnable website uses Node's embedded SQLite database, so no separate database installation is needed. Corrected MySQL scripts are also included for submission or deployment to MySQL 8+.

## Run locally

1. Install Node.js 22.5 or newer.
2. Run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000`.

The embedded database is created automatically in `data/gym.db` on first launch.

## Test

Run `npm test` to verify seeded queries, validation, and all four CRUD operations.

## MySQL setup

1. Sign in to a MySQL 8+ server.
2. Run `database/create.sql`.
3. Run `database/load.sql`.

## Project contents

- `public/` - current FitCore website
- `server.js` - HTTP server, validation, and CRUD API
- `database/create.sql` - corrected MySQL schema
- `database/load.sql` - corrected Task C sample data
- `TaskB-html-only/` - earlier HTML-only deliverable
- `output/pdf/TaskB.pdf` - PDF version of the Task B deliverable
