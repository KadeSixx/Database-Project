const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const envFile = path.join(__dirname, ".env.local");
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "data");
const useMysql = process.env.DB_ENGINE === "mysql" && !process.env.DATA_DIR;
let db;
let pool;

if (useMysql) {
  const mysql = require("mysql2/promise");
  pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "gym_db",
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true,
    decimalNumbers: true,
  });
} else {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(path.join(DATA_DIR, "gym.db"));
  db.exec("PRAGMA foreign_keys = ON");

  db.exec(`
  CREATE TABLE IF NOT EXISTS membership_plans (
    plan_id TEXT PRIMARY KEY, plan_name TEXT NOT NULL UNIQUE,
    monthly_cost REAL NOT NULL CHECK(monthly_cost >= 0),
    duration_days INTEGER NOT NULL CHECK(duration_days > 0),
    benefits TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS members (
    member_id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
    phone TEXT NOT NULL, email TEXT NOT NULL UNIQUE, join_date TEXT NOT NULL,
    plan_id TEXT NOT NULL REFERENCES membership_plans(plan_id)
      ON UPDATE CASCADE ON DELETE RESTRICT
  );
  CREATE TABLE IF NOT EXISTS employees (
    employee_id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
    phone TEXT NOT NULL, email TEXT NOT NULL UNIQUE, address TEXT NOT NULL,
    salary REAL NOT NULL CHECK(salary >= 0)
  );
  CREATE TABLE IF NOT EXISTS trainers (
    employee_id TEXT PRIMARY KEY REFERENCES employees(employee_id)
      ON UPDATE CASCADE ON DELETE RESTRICT,
    join_date TEXT NOT NULL, specialization TEXT NOT NULL, certification TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS classes (
    class_id TEXT PRIMARY KEY,
    trainer_id TEXT NOT NULL REFERENCES trainers(employee_id)
      ON UPDATE CASCADE ON DELETE RESTRICT,
    class_name TEXT NOT NULL, class_time TEXT NOT NULL,
    capacity INTEGER NOT NULL CHECK(capacity > 0), room_location TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS enrollments (
    enrollment_id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES members(member_id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES classes(class_id)
      ON UPDATE CASCADE ON DELETE RESTRICT,
    enrollment_date TEXT NOT NULL,
    attendance_status TEXT NOT NULL CHECK(attendance_status IN ('Present','Absent','Excused')),
    UNIQUE(member_id, class_id)
  );
  CREATE TABLE IF NOT EXISTS payments (
    payment_id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES members(member_id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    amount REAL NOT NULL CHECK(amount > 0), payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL CHECK(payment_status IN ('Paid','Pending','Failed'))
  );
  -- ================================================================
  -- ⚠ INTENTIONALLY VULNERABLE FOR PRACTICE — READ BEFORE COPYING ⚠
  -- Passwords are stored in PLAIN TEXT and /api/auth/login below builds
  -- its SQL with string concatenation instead of parameters, so it is
  -- exploitable (e.g. username: admin, password: ' OR '1'='1). This was
  -- left unprotected on purpose so the vulnerability can be studied and
  -- then patched. Never do this in a real app:
  --   - hash passwords (e.g. Node's crypto.scrypt) instead of storing them
  --   - always use parameterized queries, exactly like every other query
  --     in this file already does.
  -- ================================================================
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','trainer','member')),
    display_name TEXT NOT NULL,
    member_id TEXT REFERENCES members(member_id) ON UPDATE CASCADE ON DELETE CASCADE,
    employee_id TEXT REFERENCES trainers(employee_id) ON UPDATE CASCADE ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (
      (role = 'admin' AND member_id IS NULL AND employee_id IS NULL) OR
      (role = 'trainer' AND employee_id IS NOT NULL AND member_id IS NULL) OR
      (role = 'member' AND member_id IS NOT NULL AND employee_id IS NULL)
    )
  );
  `);

function seed(table, columns, rows) {
  const placeholders = columns.map(() => "?").join(",");
  const statement = db.prepare(
    `INSERT OR IGNORE INTO ${table} (${columns.join(",")}) VALUES (${placeholders})`
  );
  for (const row of rows) statement.run(...row);
}

  seed("membership_plans", ["plan_id", "plan_name", "monthly_cost", "duration_days", "benefits"], [
  ["P-01", "Basic", 29, 31, "Gym floor and locker room access"],
  ["P-02", "Standard", 49, 31, "Gym access and unlimited group classes"],
  ["P-03", "Gold Tier", 30, 31, "Free Classes, Showers, T-Shirt"],
  ["P-04", "Premium", 79, 31, "Unlimited classes, sauna access, and one trainer session"],
  ["P-05", "Annual", 499, 365, "Full-year gym and group class access"],
]);
  seed("members", ["member_id", "first_name", "last_name", "phone", "email", "join_date", "plan_id"], [
  ["M-46", "Jeff", "Emmerich", "8846514059", "Mable_Bartell19@hotmail.com", "2025-04-08", "P-03"],
  ["M-22", "Courtney", "O'Hara-Homenick", "7682641302", "Bruce_Price78@gmail.com", "2025-03-17", "P-03"],
  ["M-47", "Jared", "Bartoletti", "9629238795", "Nicole.Grant@gmail.com", "2024-12-03", "P-03"],
  ["M-49", "Katrina", "Dibbert", "5589920933", "Donnie_Lebsack@hotmail.com", "2025-09-10", "P-03"],
  ["M-33", "Ada", "Hodkiewicz", "5057881598", "Clyde_Davis63@gmail.com", "2024-12-27", "P-03"],
]);
  seed("employees", ["employee_id", "first_name", "last_name", "phone", "email", "address", "salary"], [
  ["E-18", "Kelly", "Monahan", "5023488005", "Wayne_Okuneva@gmail.com", "386 Rodriguez Club", 67992],
  ["E-37", "Corey", "Parker", "1955626099", "Frances.Miller@yahoo.com", "4159 Ottis Light", 82564],
  ["E-03", "Yolanda", "Carter", "1476691968", "Isaac.Paucek21@hotmail.com", "383 Dayne Groves", 67078],
  ["E-49", "Vivian", "Berge", "6605909521", "Virginia.Macejkovic73@hotmail.com", "161 Stoltenberg Center", 98014],
  ["E-30", "Jeanette", "Turcotte", "7748166525", "Randal_Hirthe35@hotmail.com", "574 W Washington Street", 60219],
]);
  seed("trainers", ["employee_id", "join_date", "specialization", "certification"], [
  ["E-18", "2026-02-03", "General Fitness", "National Gym Certification"],
  ["E-37", "2026-03-15", "Strength Training", "National Gym Certification"],
  ["E-03", "2026-04-19", "Mobility", "National Gym Certification"],
  ["E-49", "2024-11-06", "Cardio", "National Gym Certification"],
  ["E-30", "2025-02-16", "Conditioning", "National Gym Certification"],
]);
  seed("classes", ["class_id", "trainer_id", "class_name", "class_time", "capacity", "room_location"], [
  ["C-738", "E-18", "Ivory", "07:30", 22, "Room 738"],
  ["C-156", "E-18", "Magenta", "09:00", 31, "Room 156"],
  ["C-642", "E-37", "Azure", "11:30", 26, "Room 642"],
  ["C-729", "E-49", "Violet", "17:30", 37, "Room 729"],
  ["C-722", "E-30", "Maroon", "19:00", 12, "Room 722"],
]);
  seed("enrollments", ["enrollment_id", "member_id", "class_id", "enrollment_date", "attendance_status"], [
  ["EN-34A", "M-46", "C-738", "2026-08-27", "Excused"],
  ["EN-44", "M-22", "C-156", "2026-02-18", "Present"],
  ["EN-34B", "M-47", "C-642", "2026-10-03", "Excused"],
  ["EN-11", "M-49", "C-729", "2026-07-18", "Present"],
  ["EN-50", "M-33", "C-722", "2026-03-01", "Absent"],
]);
  seed("payments", ["payment_id", "member_id", "amount", "payment_method", "payment_status"], [
  ["PAY-19-12", "M-46", 15, "Visa", "Paid"],
  ["PAY-15-13", "M-22", 35, "Mastercard", "Paid"],
  ["PAY-15-10", "M-47", 83, "Diners Club", "Paid"],
  ["PAY-14-07", "M-49", 11, "Discover", "Paid"],
  ["PAY-41-12", "M-33", 60, "Maestro", "Paid"],
  ]);
  // Demo login accounts. Passwords are plain text on purpose (see the
  // warning above the `users` table) — these are throwaway local dev
  // credentials only, never reuse them anywhere real.
  seed("users", ["user_id", "username", "password", "role", "display_name", "member_id", "employee_id"], [
  ["U-01", "admin", "admin123", "admin", "System Administrator", null, null],
  ["U-02", "trainer1", "trainer123", "trainer", "Kelly Monahan", null, "E-18"],
  ["U-03", "trainer2", "trainer123", "trainer", "Corey Parker", null, "E-37"],
  ["U-04", "member1", "member123", "member", "Jeff Emmerich", "M-46", null],
  ["U-05", "member2", "member123", "member", "Courtney O'Hara-Homenick", "M-22", null],
  ]);
}

async function dbAll(sql, params = []) {
  if (useMysql) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  }
  return db.prepare(sql).all(...params);
}

async function dbGet(sql, params = []) {
  const rows = await dbAll(sql, params);
  return rows[0];
}

async function dbRun(sql, params = []) {
  if (useMysql) {
    const [result] = await pool.execute(sql, params);
    return { changes: result.affectedRows, insertId: result.insertId };
  }
  return db.prepare(sql).run(...params);
}

const fullName = (alias) => useMysql
  ? `CONCAT(${alias}.first_name, ' ', ${alias}.last_name)`
  : `${alias}.first_name || ' ' || ${alias}.last_name`;

const entities = {
  plans: {
    table: "membership_plans", id: "plan_id",
    fields: ["plan_id", "plan_name", "monthly_cost", "duration_days", "benefits"],
    required: ["plan_id", "plan_name", "monthly_cost", "duration_days", "benefits"],
  },
  members: {
    table: "members", id: "member_id",
    fields: ["member_id", "first_name", "last_name", "phone", "email", "join_date", "plan_id"],
    required: ["member_id", "first_name", "last_name", "phone", "email", "join_date", "plan_id"],
    list: `SELECT m.*, p.plan_name FROM members m
      JOIN membership_plans p ON p.plan_id=m.plan_id ORDER BY m.member_id`,
  },
  employees: {
    table: "employees", id: "employee_id",
    fields: ["employee_id", "first_name", "last_name", "phone", "email", "address", "salary"],
    required: ["employee_id", "first_name", "last_name", "phone", "email", "address", "salary"],
  },
  trainers: {
    table: "trainers", id: "employee_id",
    fields: ["employee_id", "join_date", "specialization", "certification"],
    required: ["employee_id", "join_date", "specialization", "certification"],
    list: `SELECT t.*, ${fullName("e")} AS employee_name
      FROM trainers t JOIN employees e ON e.employee_id=t.employee_id ORDER BY t.employee_id`,
  },
  classes: {
    table: "classes", id: "class_id",
    fields: ["class_id", "trainer_id", "class_name", "class_time", "capacity", "room_location"],
    required: ["class_id", "trainer_id", "class_name", "class_time", "capacity", "room_location"],
    list: `SELECT c.*, ${fullName("e")} AS trainer_name
      FROM classes c JOIN employees e ON e.employee_id=c.trainer_id ORDER BY c.class_id`,
  },
  enrollments: {
    table: "enrollments", id: "enrollment_id",
    fields: ["enrollment_id", "member_id", "class_id", "enrollment_date", "attendance_status"],
    required: ["enrollment_id", "member_id", "class_id", "enrollment_date", "attendance_status"],
    list: `SELECT x.*, ${fullName("m")} AS member_name, c.class_name
      FROM enrollments x JOIN members m ON m.member_id=x.member_id
      JOIN classes c ON c.class_id=x.class_id ORDER BY x.enrollment_id`,
  },
  payments: {
    table: "payments", id: "payment_id",
    fields: ["payment_id", "member_id", "amount", "payment_method", "payment_status"],
    required: ["payment_id", "member_id", "amount", "payment_method", "payment_status"],
    list: `SELECT p.*, ${fullName("m")} AS member_name
      FROM payments p JOIN members m ON m.member_id=p.member_id ORDER BY p.payment_id`,
  },
};

function normalize(entity, input) {
  const value = { ...input };
  if (entity === "members") value.plan_id = value.plan_id || value.membership_plan;
  if (entity === "classes") value.trainer_id = value.trainer_id || value.trainer;
  if (entity === "enrollments") {
    value.member_id = value.member_id || value.member;
    value.class_id = value.class_id || value.class;
  }
  if (entity === "payments") value.member_id = value.member_id || value.member;
  if (entity === "plans") {
    value.duration_days = Number.parseInt(value.duration_days || value.duration, 10);
    value.monthly_cost = Number(value.monthly_cost);
  }
  if (entity === "employees") value.salary = Number(value.salary);
  if (entity === "classes") value.capacity = Number(value.capacity);
  if (entity === "payments") {
    value.amount = Number(value.amount);
    const methods = {
      cash: "Cash", "credit-card": "Visa", "debit-card": "Mastercard", online: "Online",
    };
    value.payment_method = methods[value.payment_method] || value.payment_method;
    value.payment_status = titleCase(value.payment_status);
  }
  if (entity === "enrollments") value.attendance_status = titleCase(value.attendance_status);
  return value;
}

function titleCase(value) {
  value = String(value || "");
  return value ? value[0].toUpperCase() + value.slice(1).toLowerCase() : value;
}

function validate(config, value) {
  const errors = {};
  for (const field of config.required) {
    if (value[field] === undefined || value[field] === null || String(value[field]).trim() === "") {
      errors[field] = "This field is required.";
    }
  }
  if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (value.phone && !/^[+()\d\s.-]{7,25}$/.test(value.phone)) {
    errors.phone = "Enter a valid phone number.";
  }
  for (const field of ["salary", "monthly_cost"]) {
    if (field in value && (!Number.isFinite(value[field]) || value[field] < 0)) {
      errors[field] = "Enter a number greater than or equal to zero.";
    }
  }
  for (const field of ["amount", "capacity", "duration_days"]) {
    if (field in value && (!Number.isFinite(value[field]) || value[field] <= 0)) {
      errors[field] = "Enter a number greater than zero.";
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Authentication, sessions, and role-based permissions
// ---------------------------------------------------------------------------

const SESSION_COOKIE = "fitcore_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours, sliding expiration
const sessions = new Map(); // token -> { user, expires }

function parseCookies(req) {
  const cookies = {};
  const header = req.headers.cookie;
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}

function currentUser(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) {
    sessions.delete(token);
    return null;
  }
  session.expires = Date.now() + SESSION_TTL_MS;
  return session.user;
}

function startSession(res, user) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { user, expires: Date.now() + SESSION_TTL_MS });
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}`
  );
}

function endSession(req, res) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (token) sessions.delete(token);
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

// Row-level scoping applied to list queries for non-admin roles. Each clause
// references the table alias used in that entity's `list` query.
const SCOPE = {
  members: { member: { clause: "m.member_id = ?", params: (u) => [u.memberId] } },
  enrollments: {
    trainer: {
      clause: "x.class_id IN (SELECT class_id FROM classes WHERE trainer_id = ?)",
      params: (u) => [u.employeeId],
    },
    member: { clause: "x.member_id = ?", params: (u) => [u.memberId] },
  },
  payments: { member: { clause: "p.member_id = ?", params: (u) => [u.memberId] } },
};

// Confirms a signed-in trainer/member owns (or may act on) a specific record.
// Admins always pass. Roles/entities with no ownership rule also pass, since
// the capability check already gated access for them.
async function ownerCheck(entity, id, user) {
  if (user.role === "admin") return true;
  if (entity === "members" && user.role === "member") return id === user.memberId;
  if (entity === "enrollments" && (user.role === "member" || user.role === "trainer")) {
    const row = await dbGet(`SELECT member_id, class_id FROM enrollments WHERE enrollment_id=?`, [id]);
    if (!row) return false;
    if (user.role === "member") return row.member_id === user.memberId;
    const cls = await dbGet(`SELECT trainer_id FROM classes WHERE class_id=?`, [row.class_id]);
    return !!cls && cls.trainer_id === user.employeeId;
  }
  if (entity === "payments" && user.role === "member") {
    const row = await dbGet(`SELECT member_id FROM payments WHERE payment_id=?`, [id]);
    return !!row && row.member_id === user.memberId;
  }
  if (entity === "classes" && user.role === "trainer") {
    const row = await dbGet(`SELECT trainer_id FROM classes WHERE class_id=?`, [id]);
    return !!row && row.trainer_id === user.employeeId;
  }
  return true;
}

// Per-role CRUD capabilities for every entity. `editableFields`, when
// present, restricts which columns a PUT may change for that role.
function capabilitiesFor(user) {
  const full = { read: true, create: true, update: true, delete: true };
  const none = { read: false, create: false, update: false, delete: false };
  if (user.role === "admin") {
    return Object.fromEntries(Object.keys(entities).map((name) => [name, { ...full }]));
  }
  if (user.role === "trainer") {
    return {
      plans: { read: true, create: false, update: false, delete: false },
      members: { read: true, create: false, update: false, delete: false },
      employees: { ...none },
      trainers: { read: true, create: false, update: false, delete: false },
      classes: {
        read: true, create: false, delete: false, update: true,
        editableFields: ["class_name", "class_time", "capacity", "room_location"],
      },
      enrollments: { read: true, create: false, update: true, delete: false, editableFields: ["attendance_status"] },
      payments: { ...none },
    };
  }
  if (user.role === "member") {
    return {
      plans: { read: true, create: false, update: false, delete: false },
      members: { read: true, create: false, update: false, delete: false },
      employees: { ...none },
      trainers: { read: true, create: false, update: false, delete: false },
      classes: { read: true, create: false, update: false, delete: false },
      enrollments: { read: true, create: true, update: false, delete: true },
      payments: { read: true, create: false, update: false, delete: false },
    };
  }
  return Object.fromEntries(Object.keys(entities).map((name) => [name, { ...none }]));
}

// ⚠ INTENTIONALLY VULNERABLE TO SQL INJECTION — practice/learning only ⚠
// Unlike every other query in this file, this one is built by concatenating
// user input directly into the SQL string instead of using `?` placeholders.
// That means the username/password fields aren't just data to the database —
// they can inject their own SQL. Try logging in with:
//   username: admin
//   password: ' OR '1'='1
// ...and the WHERE clause becomes always-true, logging you in as the first
// matching user without knowing the real password. Once you've explored
// this (e.g. also try `' OR role='admin' --` in the username field to log
// in as an admin without any password), fix it by switching back to a
// parameterized query, like `dbGet("SELECT * FROM users WHERE username=? AND
// password=?", [username, password])`.
async function handleLogin(req, res) {
  const body = await readJson(req);
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username || !password) return json(res, 400, { error: "Enter a username and password." });

  const sql = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;
  let row;
  if (useMysql) {
    const [rows] = await pool.query(sql);
    row = rows[0];
  } else {
    row = db.prepare(sql).get();
  }
  if (!row) {
    return json(res, 401, { error: "Incorrect username or password." });
  }

  const user = {
    userId: row.user_id,
    username: row.username,
    role: row.role,
    displayName: row.display_name,
    memberId: row.member_id,
    employeeId: row.employee_id,
  };
  startSession(res, user);
  return json(res, 200, { user, capabilities: capabilitiesFor(user) });
}

async function handleLogout(req, res) {
  endSession(req, res);
  return json(res, 200, { message: "Signed out." });
}

async function handleMe(req, res) {
  const user = currentUser(req);
  if (!user) return json(res, 401, { error: "Not signed in." });
  return json(res, 200, { user, capabilities: capabilitiesFor(user) });
}

async function handleListUsers(res) {
  const rows = await dbAll(
    `SELECT user_id, username, role, display_name, member_id, employee_id FROM users ORDER BY user_id`
  );
  return json(res, 200, rows);
}

async function handleCreateUser(req, res) {
  const body = await readJson(req);
  const value = {
    user_id: String(body.user_id || "").trim(),
    username: String(body.username || "").trim(),
    password: String(body.password || ""),
    role: String(body.role || ""),
    display_name: String(body.display_name || "").trim(),
    member_id: body.member_id ? String(body.member_id).trim() : null,
    employee_id: body.employee_id ? String(body.employee_id).trim() : null,
  };

  const errors = {};
  if (!value.user_id) errors.user_id = "This field is required.";
  if (!value.username) errors.username = "This field is required.";
  if (!value.password || value.password.length < 8) errors.password = "Use at least 8 characters.";
  if (!["admin", "trainer", "member"].includes(value.role)) errors.role = "Choose a valid role.";
  if (!value.display_name) errors.display_name = "This field is required.";
  if (value.role === "trainer" && !value.employee_id) errors.employee_id = "Select the trainer's employee record.";
  if (value.role === "member" && !value.member_id) errors.member_id = "Select the member's record.";
  if (value.role === "admin" && (value.member_id || value.employee_id)) {
    errors.role = "Admin accounts should not be linked to a member or trainer record.";
  }
  if (Object.keys(errors).length) return json(res, 422, { error: "Validation failed.", fields: errors });

  if (value.role === "trainer" && !(await dbGet(`SELECT 1 FROM trainers WHERE employee_id=?`, [value.employee_id]))) {
    return json(res, 422, { error: "Validation failed.", fields: { employee_id: "That employee is not registered as a trainer." } });
  }
  if (value.role === "member" && !(await dbGet(`SELECT 1 FROM members WHERE member_id=?`, [value.member_id]))) {
    return json(res, 422, { error: "Validation failed.", fields: { member_id: "That member record does not exist." } });
  }

  // Account-creation stays parameterized (only /api/auth/login is the
  // deliberately vulnerable one) — but the password is still stored in
  // plain text, matching the `users` table's practice-only design.
  try {
    await dbRun(
      `INSERT INTO users (user_id, username, password, role, display_name, member_id, employee_id)
       VALUES (?,?,?,?,?,?,?)`,
      [
        value.user_id, value.username, value.password, value.role, value.display_name,
        value.role === "member" ? value.member_id : null,
        value.role === "trainer" ? value.employee_id : null,
      ]
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY" || /UNIQUE constraint failed/i.test(error.message)) {
      const field = /username/i.test(error.message) ? "username" : "user_id";
      return json(res, 409, {
        error: "Please correct the highlighted field.",
        fields: { [field]: field === "username" ? "That username is already taken." : "That User ID already exists." },
      });
    }
    throw error;
  }
  return json(res, 201, { message: "User account created.", id: value.user_id });
}

async function handleDeleteUser(res, targetId, requester) {
  if (targetId === requester.userId) return json(res, 400, { error: "You cannot delete the account you're signed in as." });
  const result = await dbRun(`DELETE FROM users WHERE user_id=?`, [targetId]);
  return result.changes
    ? json(res, 200, { message: "User account deleted." })
    : json(res, 404, { error: "User not found." });
}

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new Error("Request is too large.");
  }
  return raw ? JSON.parse(raw) : {};
}

async function api(req, res, url) {
  // Auth routes are the only ones reachable without an existing session.
  if (url.pathname === "/api/auth/login" && req.method === "POST") return handleLogin(req, res);
  if (url.pathname === "/api/auth/logout" && req.method === "POST") return handleLogout(req, res);
  if (url.pathname === "/api/auth/me" && req.method === "GET") return handleMe(req, res);

  const user = currentUser(req);
  if (!user) return json(res, 401, { error: "Please sign in to continue." });

  if (url.pathname === "/api/dashboard" && req.method === "GET") {
    const result = {};
    for (const [name, config] of Object.entries(entities)) {
      if (name === "employees" && user.role !== "admin") continue;
      result[name] = (await dbGet(`SELECT COUNT(*) AS count FROM ${config.table}`)).count;
    }
    if (user.role === "admin") {
      result.revenue = (await dbGet(
        "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE payment_status='Paid'"
      )).total;
    }
    return json(res, 200, result);
  }

  if (url.pathname === "/api/users" && req.method === "GET") {
    if (user.role !== "admin") return json(res, 403, { error: "Admins only." });
    return handleListUsers(res);
  }
  if (url.pathname === "/api/users" && req.method === "POST") {
    if (user.role !== "admin") return json(res, 403, { error: "Admins only." });
    try {
      return await handleCreateUser(req, res);
    } catch (error) {
      return json(res, 500, { error: "The database operation failed.", detail: error.message });
    }
  }
  const userMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
  if (userMatch && req.method === "DELETE") {
    if (user.role !== "admin") return json(res, 403, { error: "Admins only." });
    return handleDeleteUser(res, decodeURIComponent(userMatch[1]), user);
  }

  const match = url.pathname.match(/^\/api\/([a-z]+)(?:\/([^/]+))?$/);
  if (!match || !entities[match[1]]) return json(res, 404, { error: "API route not found." });
  const [entity, encodedId] = [match[1], match[2]];
  const config = entities[entity];
  const id = encodedId ? decodeURIComponent(encodedId) : null;
  const caps = capabilitiesFor(user)[entity] || { read: false, create: false, update: false, delete: false };

  try {
    if (req.method === "GET") {
      if (!caps.read) return json(res, 403, { error: "You don't have permission to view this data." });
      if (id) {
        if (!(await ownerCheck(entity, id, user))) {
          return json(res, 403, { error: "You don't have permission to view this record." });
        }
        const record = await dbGet(
          `SELECT * FROM ${config.table} WHERE ${config.id}=?`, [id]
        );
        return record ? json(res, 200, record) : json(res, 404, { error: "Record not found." });
      }
      const base = config.list || `SELECT * FROM ${config.table}`;
      const scope = SCOPE[entity]?.[user.role];
      const sql = scope ? base.replace(/ORDER BY/i, `WHERE ${scope.clause} ORDER BY`) : base;
      const params = scope ? scope.params(user) : [];
      return json(res, 200, await dbAll(sql, params));
    }

    if (req.method === "POST" || req.method === "PUT") {
      if (req.method === "POST" && !caps.create) {
        return json(res, 403, { error: "You don't have permission to create this record." });
      }
      if (req.method === "PUT" && !caps.update) {
        return json(res, 403, { error: "You don't have permission to update this record." });
      }
      if (req.method === "PUT" && id && !(await ownerCheck(entity, id, user))) {
        return json(res, 403, { error: "You don't have permission to modify this record." });
      }

      let value = normalize(entity, await readJson(req));

      // Members may only ever enroll themselves, regardless of what the form sent.
      if (req.method === "POST" && entity === "enrollments" && user.role === "member") {
        value.member_id = user.memberId;
      }

      // Roles with a restricted edit surface (e.g. trainers marking attendance)
      // may only change the listed fields; everything else keeps its current value.
      if (req.method === "PUT" && caps.editableFields) {
        const existing = await dbGet(`SELECT * FROM ${config.table} WHERE ${config.id}=?`, [id]);
        if (!existing) return json(res, 404, { error: "Record not found." });
        const merged = { ...existing };
        for (const field of caps.editableFields) if (field in value) merged[field] = value[field];
        value = merged;
      }

      const errors = validate(config, value);
      if (Object.keys(errors).length) return json(res, 422, { error: "Validation failed.", fields: errors });

      if (req.method === "POST") {
        const fields = config.fields;
        await dbRun(
          `INSERT INTO ${config.table} (${fields.join(",")}) VALUES (${fields.map(() => "?").join(",")})`,
          fields.map((field) => value[field])
        );
        return json(res, 201, { message: "Record created.", id: value[config.id] });
      }

      if (!id) return json(res, 400, { error: "Record ID is required." });
      const fields = config.fields.filter((field) => field !== config.id);
      const result = await dbRun(
        `UPDATE ${config.table} SET ${fields.map((field) => `${field}=?`).join(",")} WHERE ${config.id}=?`,
        [...fields.map((field) => value[field]), id]
      );
      return result.changes
        ? json(res, 200, { message: "Record updated.", id })
        : json(res, 404, { error: "Record not found." });
    }

    if (req.method === "DELETE") {
      if (!caps.delete) return json(res, 403, { error: "You don't have permission to delete this record." });
      if (!id) return json(res, 400, { error: "Record ID is required." });
      if (!(await ownerCheck(entity, id, user))) {
        return json(res, 403, { error: "You don't have permission to delete this record." });
      }
      const result = await dbRun(
        `DELETE FROM ${config.table} WHERE ${config.id}=?`, [id]
      );
      return result.changes
        ? json(res, 200, { message: "Record deleted." })
        : json(res, 404, { error: "Record not found." });
    }

    return json(res, 405, { error: "Method not allowed." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY" || /UNIQUE constraint failed/i.test(error.message)) {
      const message = `${error.message} ${error.sqlMessage || ""}`;
      let field = config.id;
      if (/email/i.test(message)) field = "email";
      else if (/plan_name/i.test(message)) field = "plan_name";
      else if (/member_id.*class_id|uq_member_class/i.test(message)) field = "member_id";
      const labels = {
        email: "That email address is already in use.",
        plan_name: "That plan name already exists.",
        member_id: entity === "enrollments"
          ? "That member is already enrolled in this class."
          : "That Member ID already exists.",
        employee_id: "That Employee ID already exists.",
        class_id: "That Class ID already exists.",
        enrollment_id: "That Enrollment ID already exists.",
        payment_id: "That Payment ID already exists.",
        plan_id: "That Plan ID already exists.",
      };
      return json(res, 409, {
        error: "Please correct the highlighted field.",
        fields: { [field]: labels[field] || "That value already exists." },
      });
    }
    const conflict = /UNIQUE|FOREIGN KEY|CHECK constraint/i.test(error.message);
    return json(res, conflict ? 409 : 500, {
      error: conflict
        ? "The record conflicts with existing or related data."
        : "The database operation failed.",
      detail: error.message,
    });
  }
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
};

function staticFile(req, res, url) {
  let relative = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  if (!path.extname(relative)) relative += ".html";
  const file = path.normalize(path.join(PUBLIC_DIR, relative));
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); return res.end("Forbidden");
  }
  fs.readFile(file, (error, content) => {
    if (error) {
      res.writeHead(error.code === "ENOENT" ? 404 : 500);
      return res.end(error.code === "ENOENT" ? "Not found" : "Server error");
    }
    const extension = path.extname(file);
    res.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Cache-Control": extension === ".html" || extension === ".js" ? "no-store" : "public, max-age=3600",
    });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) {
    try {
      return await api(req, res, url);
    } catch (error) {
      return json(res, 503, {
        error: "The database is temporarily unavailable.",
        detail: error.message,
      });
    }
  }
  staticFile(req, res, url);
});

async function start() {
  if (useMysql) await pool.query("SELECT 1");
  server.listen(PORT, () => {
    console.log(`FitCore is running at http://localhost:${PORT}`);
    console.log(`Database engine: ${useMysql ? "MySQL" : "embedded SQLite"}`);
  });
}

start().catch((error) => {
  console.error(`Unable to start FitCore: ${error.message}`);
  process.exitCode = 1;
});
