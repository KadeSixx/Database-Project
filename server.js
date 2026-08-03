const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, "gym.db"));
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
      ON UPDATE CASCADE ON DELETE RESTRICT,
    amount REAL NOT NULL CHECK(amount > 0), payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL CHECK(payment_status IN ('Paid','Pending','Failed'))
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
  ["P-03", "Gold Tier", 30, 31, "Free Classes, Showers, T-Shirt"],
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
    list: `SELECT t.*, e.first_name || ' ' || e.last_name AS employee_name
      FROM trainers t JOIN employees e ON e.employee_id=t.employee_id ORDER BY t.employee_id`,
  },
  classes: {
    table: "classes", id: "class_id",
    fields: ["class_id", "trainer_id", "class_name", "class_time", "capacity", "room_location"],
    required: ["class_id", "trainer_id", "class_name", "class_time", "capacity", "room_location"],
    list: `SELECT c.*, e.first_name || ' ' || e.last_name AS trainer_name
      FROM classes c JOIN employees e ON e.employee_id=c.trainer_id ORDER BY c.class_id`,
  },
  enrollments: {
    table: "enrollments", id: "enrollment_id",
    fields: ["enrollment_id", "member_id", "class_id", "enrollment_date", "attendance_status"],
    required: ["enrollment_id", "member_id", "class_id", "enrollment_date", "attendance_status"],
    list: `SELECT x.*, m.first_name || ' ' || m.last_name AS member_name, c.class_name
      FROM enrollments x JOIN members m ON m.member_id=x.member_id
      JOIN classes c ON c.class_id=x.class_id ORDER BY x.enrollment_id`,
  },
  payments: {
    table: "payments", id: "payment_id",
    fields: ["payment_id", "member_id", "amount", "payment_method", "payment_status"],
    required: ["payment_id", "member_id", "amount", "payment_method", "payment_status"],
    list: `SELECT p.*, m.first_name || ' ' || m.last_name AS member_name
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

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
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
  if (url.pathname === "/api/dashboard" && req.method === "GET") {
    const result = {};
    for (const [name, config] of Object.entries(entities)) {
      result[name] = db.prepare(`SELECT COUNT(*) AS count FROM ${config.table}`).get().count;
    }
    result.revenue = db.prepare(
      "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE payment_status='Paid'"
    ).get().total;
    return json(res, 200, result);
  }

  const match = url.pathname.match(/^\/api\/([a-z]+)(?:\/([^/]+))?$/);
  if (!match || !entities[match[1]]) return json(res, 404, { error: "API route not found." });
  const [entity, encodedId] = [match[1], match[2]];
  const config = entities[entity];
  const id = encodedId ? decodeURIComponent(encodedId) : null;

  try {
    if (req.method === "GET") {
      if (id) {
        const record = db.prepare(
          `SELECT * FROM ${config.table} WHERE ${config.id}=?`
        ).get(id);
        return record ? json(res, 200, record) : json(res, 404, { error: "Record not found." });
      }
      return json(res, 200, db.prepare(config.list || `SELECT * FROM ${config.table}`).all());
    }

    if (req.method === "POST" || req.method === "PUT") {
      const value = normalize(entity, await readJson(req));
      const errors = validate(config, value);
      if (Object.keys(errors).length) return json(res, 422, { error: "Validation failed.", fields: errors });

      if (req.method === "POST") {
        const fields = config.fields;
        db.prepare(
          `INSERT INTO ${config.table} (${fields.join(",")}) VALUES (${fields.map(() => "?").join(",")})`
        ).run(...fields.map((field) => value[field]));
        return json(res, 201, { message: "Record created.", id: value[config.id] });
      }

      if (!id) return json(res, 400, { error: "Record ID is required." });
      const fields = config.fields.filter((field) => field !== config.id);
      const result = db.prepare(
        `UPDATE ${config.table} SET ${fields.map((field) => `${field}=?`).join(",")} WHERE ${config.id}=?`
      ).run(...fields.map((field) => value[field]), id);
      return result.changes
        ? json(res, 200, { message: "Record updated.", id })
        : json(res, 404, { error: "Record not found." });
    }

    if (req.method === "DELETE") {
      if (!id) return json(res, 400, { error: "Record ID is required." });
      const result = db.prepare(
        `DELETE FROM ${config.table} WHERE ${config.id}=?`
      ).run(id);
      return result.changes
        ? json(res, 200, { message: "Record deleted." })
        : json(res, 404, { error: "Record not found." });
    }

    return json(res, 405, { error: "Method not allowed." });
  } catch (error) {
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
    res.writeHead(200, { "Content-Type": mimeTypes[path.extname(file)] || "application/octet-stream" });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) return api(req, res, url);
  staticFile(req, res, url);
});

server.listen(PORT, () => {
  console.log(`FitCore is running at http://localhost:${PORT}`);
});
