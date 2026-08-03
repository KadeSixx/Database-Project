const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "tmp", "test-data");
const base = "http://127.0.0.1:3101";
let server;

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await fetch(`${base}/api/dashboard`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Test server did not start.");
}

test.before(async () => {
  fs.rmSync(dataDir, { recursive: true, force: true });
  server = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: { ...process.env, PORT: "3101", DATA_DIR: dataDir },
    stdio: "ignore",
  });
  await waitForServer();
});

test.after(async () => {
  const exited = new Promise((resolve) => server.once("exit", resolve));
  server.kill();
  await exited;
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test("serves the dashboard and seeded Task C data", async () => {
  const page = await fetch(`${base}/`);
  assert.equal(page.status, 200);
  const dashboard = await (await fetch(`${base}/api/dashboard`)).json();
  assert.equal(dashboard.members, 5);
  assert.equal(dashboard.classes, 5);
});

test("supports create, read, update, and delete", async () => {
  const record = {
    member_id: "M-TEST", first_name: "Test", last_name: "Member",
    phone: "5551234567", email: "test@example.com",
    join_date: "2026-08-03", plan_id: "P-03",
  };
  const created = await fetch(`${base}/api/members`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  assert.equal(created.status, 201);

  const read = await (await fetch(`${base}/api/members/M-TEST`)).json();
  assert.equal(read.first_name, "Test");

  const updated = await fetch(`${base}/api/members/M-TEST`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...record, first_name: "Updated" }),
  });
  assert.equal(updated.status, 200);

  const deleted = await fetch(`${base}/api/members/M-TEST`, { method: "DELETE" });
  assert.equal(deleted.status, 200);
  assert.equal((await fetch(`${base}/api/members/M-TEST`)).status, 404);
});

test("rejects invalid input with field-level errors", async () => {
  const response = await fetch(`${base}/api/members`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ member_id: "BAD", email: "not-an-email" }),
  });
  const body = await response.json();
  assert.equal(response.status, 422);
  assert.equal(body.error, "Validation failed.");
  assert.equal(body.fields.email, "Enter a valid email address.");
  assert.ok(body.fields.first_name);
});
