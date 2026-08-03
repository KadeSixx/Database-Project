const entityByPage = {
  "members.html": "members", "employees.html": "employees",
  "trainers.html": "trainers", "membership-plans.html": "plans",
  "classes.html": "classes", "enrollment.html": "enrollments",
  "payments.html": "payments",
};

const definitions = {
  plans: {
    title: "Membership Plans", id: "plan_id",
    fields: ["plan_id", "plan_name", "monthly_cost", "duration_days", "benefits"],
    labels: ["Plan ID", "Plan Name", "Monthly Cost", "Duration (days)", "Benefits"],
  },
  members: {
    title: "Members", id: "member_id",
    fields: ["member_id", "first_name", "last_name", "phone", "email", "join_date", "plan_id"],
    labels: ["Member ID", "First Name", "Last Name", "Phone", "Email", "Join Date", "Plan ID"],
  },
  employees: {
    title: "Employees", id: "employee_id",
    fields: ["employee_id", "first_name", "last_name", "phone", "email", "address", "salary"],
    labels: ["Employee ID", "First Name", "Last Name", "Phone", "Email", "Address", "Salary"],
  },
  trainers: {
    title: "Trainers", id: "employee_id",
    fields: ["employee_id", "join_date", "specialization", "certification"],
    labels: ["Employee ID", "Join Date", "Specialization", "Certification"],
  },
  classes: {
    title: "Classes", id: "class_id",
    fields: ["class_id", "trainer_id", "class_name", "class_time", "capacity", "room_location"],
    labels: ["Class ID", "Trainer ID", "Class Name", "Time", "Capacity", "Room"],
  },
  enrollments: {
    title: "Enrollments", id: "enrollment_id",
    fields: ["enrollment_id", "member_id", "class_id", "enrollment_date", "attendance_status"],
    labels: ["Enrollment ID", "Member ID", "Class ID", "Date", "Attendance"],
  },
  payments: {
    title: "Payments", id: "payment_id",
    fields: ["payment_id", "member_id", "amount", "payment_method", "payment_status"],
    labels: ["Payment ID", "Member ID", "Amount", "Method", "Status"],
  },
};

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || "The request failed.");
    error.fields = body.fields || {};
    error.detail = body.detail;
    throw error;
  }
  return body;
}

function feedback(form, message, type) {
  let element = form.querySelector(".form-feedback");
  if (!element) {
    element = document.createElement("div");
    element.className = "form-feedback";
    element.setAttribute("role", "status");
    form.prepend(element);
  }
  element.className = `form-feedback ${type}`;
  element.textContent = message;
}

function showFieldErrors(form, errors) {
  form.querySelectorAll(".field-error").forEach((item) => item.remove());
  for (const [field, message] of Object.entries(errors)) {
    const aliases = {
      plan_id: "membership_plan", trainer_id: "trainer",
      member_id: "member", class_id: "class", duration_days: "duration",
    };
    const input = form.elements[field] || form.elements[aliases[field]];
    if (!input) continue;
    const error = document.createElement("small");
    error.className = "field-error";
    error.textContent = message;
    input.closest(".form-group")?.append(error);
  }
}

async function populateSelect(select, entity, label) {
  try {
    const records = await request(`/api/${entity}`);
    const current = select.value;
    select.innerHTML = '<option value="" disabled selected>Select an option</option>';
    for (const record of records) {
      const option = document.createElement("option");
      const id = record[definitions[entity].id];
      option.value = id;
      option.textContent = `${id} — ${label(record)}`;
      select.append(option);
    }
    if (current && [...select.options].some((option) => option.value === current)) select.value = current;
  } catch {
    select.innerHTML = '<option value="" disabled selected>Database unavailable</option>';
  }
}

async function prepareForm() {
  const page = location.pathname.split("/").pop() || "index.html";
  const entity = entityByPage[page];
  const form = document.querySelector("form");
  if (!entity || !form) return;
  form.dataset.entity = entity;
  if (form.elements.membership_plan) {
    await populateSelect(form.elements.membership_plan, "plans", (row) => `${row.plan_name} — $${row.monthly_cost}`);
  }
  if (entity === "trainers" && form.elements.employee_id) {
    await populateSelect(form.elements.employee_id, "employees", (row) => `${row.first_name} ${row.last_name}`);
  }
  if (form.elements.trainer) {
    await populateSelect(form.elements.trainer, "trainers", (row) => row.employee_name);
  }
  if (form.elements.member) {
    await populateSelect(form.elements.member, "members", (row) => `${row.first_name} ${row.last_name}`);
  }
  if (form.elements.class) {
    await populateSelect(form.elements.class, "classes", (row) => row.class_name);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showFieldErrors(form, {});
    if (!form.reportValidity()) return;
    const submit = form.querySelector('[type="submit"]');
    const originalLabel = submit.textContent;
    submit.disabled = true;
    submit.textContent = "Saving…";
    try {
      const body = Object.fromEntries(new FormData(form).entries());
      await request(`/api/${entity}`, { method: "POST", body: JSON.stringify(body) });
      feedback(form, "Record saved successfully. Opening the live database records…", "success");
      form.reset();
      window.setTimeout(() => {
        location.assign(`/records.html?entity=${encodeURIComponent(entity)}&saved=1`);
      }, 650);
    } catch (error) {
      showFieldErrors(form, error.fields);
      feedback(form, error.detail ? `${error.message} ${error.detail}` : error.message, "error");
    } finally {
      submit.disabled = false;
      submit.textContent = originalLabel;
    }
  });
}

async function loadDashboard() {
  const stats = document.querySelectorAll("[data-stat]");
  if (!stats.length) return;
  try {
    const data = await request("/api/dashboard");
    stats.forEach((element) => {
      const key = element.dataset.stat;
      element.textContent = key === "revenue" ? `$${Number(data[key]).toFixed(2)}` : data[key];
    });
  } catch {
    stats.forEach((element) => { element.textContent = "—"; });
  }
}

function cellValue(record, field) {
  const value = record[field];
  if (field === "amount" || field === "monthly_cost" || field === "salary") {
    return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }
  return value ?? "—";
}

async function loadLegacyReport() {
  const entity = document.body.dataset.report;
  if (!entity) return;
  const table = document.querySelector("table");
  const tbody = table?.querySelector("tbody");
  if (!tbody) return;
  const map = {
    members: ["member_id", "first_name", "last_name", "phone", "email", "join_date", "plan_name"],
    trainers: ["employee_id", "employee_name", "join_date", "specialization", "certification"],
    classes: ["class_id", "class_name", "trainer_name", "class_time", "capacity", "room_location"],
    payments: ["payment_id", "member_name", "amount", "payment_method", "payment_status"],
  };
  try {
    const rows = await request(`/api/${entity}`);
    tbody.innerHTML = rows.map((row) => `<tr>${map[entity].map((field) =>
      `<td>${escapeHtml(cellValue(row, field))}</td>`).join("")}</tr>`).join("");
    const count = document.querySelector(".card-header p");
    if (count) count.textContent = `Showing ${rows.length} live database records`;
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="8">${escapeHtml(error.message)}</td></tr>`;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

let activeEntity = "members";

async function loadRecords(entity) {
  const root = document.querySelector("[data-records]");
  if (!root) return;
  activeEntity = entity;
  const definition = definitions[entity];
  document.querySelector("[data-record-title]").textContent = definition.title;
  document.querySelectorAll("[data-entity-link]").forEach((link) => {
    link.classList.toggle("active", link.dataset.entityLink === entity);
  });
  const head = root.querySelector("thead");
  const body = root.querySelector("tbody");
  head.innerHTML = `<tr>${definition.labels.map((label) => `<th>${label}</th>`).join("")}<th>Actions</th></tr>`;
  body.innerHTML = '<tr><td colspan="9">Loading records…</td></tr>';
  try {
    const rows = await request(`/api/${entity}`);
    body.innerHTML = rows.length ? rows.map((row) => `<tr>
      ${definition.fields.map((field) => `<td>${escapeHtml(cellValue(row, field))}</td>`).join("")}
      <td class="table-actions">
        <button class="btn-link" data-edit="${escapeHtml(row[definition.id])}">Edit</button>
        <button class="btn-link danger" data-delete="${escapeHtml(row[definition.id])}">Delete</button>
      </td></tr>`).join("") : '<tr><td colspan="9">No records found.</td></tr>';
    root.querySelector("[data-count]").textContent = `${rows.length} record${rows.length === 1 ? "" : "s"}`;
  } catch (error) {
    body.innerHTML = `<tr><td colspan="9">${escapeHtml(error.message)}</td></tr>`;
  }
}

async function openEditor(id) {
  const definition = definitions[activeEntity];
  const record = await request(`/api/${activeEntity}/${encodeURIComponent(id)}`);
  const dialog = document.querySelector("#record-editor");
  const fields = dialog.querySelector("[data-edit-fields]");
  fields.innerHTML = definition.fields.map((field, index) => {
    const type = /date/.test(field) ? "date" : /amount|cost|salary|capacity|duration/.test(field) ? "number" : "text";
    const step = /amount|cost|salary/.test(field) ? ' step="0.01"' : "";
    const readonly = field === definition.id ? " readonly" : "";
    return `<div class="form-group"><label for="edit-${field}">${definition.labels[index]}</label>
      <input id="edit-${field}" name="${field}" type="${type}" value="${escapeHtml(record[field])}"${step}${readonly} required></div>`;
  }).join("");
  dialog.dataset.recordId = id;
  dialog.showModal();
}

async function prepareRecords() {
  const root = document.querySelector("[data-records]");
  if (!root) return;
  const initial = new URLSearchParams(location.search).get("entity");
  await loadRecords(definitions[initial] ? initial : "members");
  if (new URLSearchParams(location.search).get("saved") === "1") {
    const notice = document.createElement("div");
    notice.className = "import-notice success-notice";
    notice.setAttribute("role", "status");
    notice.innerHTML = "<strong>Record saved</strong><p>The table below is displaying the updated database.</p>";
    root.before(notice);
    history.replaceState({}, "", `/records.html?entity=${encodeURIComponent(activeEntity)}`);
  }
  document.querySelectorAll("[data-entity-link]").forEach((link) => {
    link.addEventListener("click", () => loadRecords(link.dataset.entityLink));
  });
  root.addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit]");
    const remove = event.target.closest("[data-delete]");
    if (edit) await openEditor(edit.dataset.edit);
    if (remove && confirm(`Delete record ${remove.dataset.delete}? This cannot be undone.`)) {
      try {
        await request(`/api/${activeEntity}/${encodeURIComponent(remove.dataset.delete)}`, { method: "DELETE" });
        await loadRecords(activeEntity);
      } catch (error) {
        alert(error.message);
      }
    }
  });
  const dialog = document.querySelector("#record-editor");
  dialog.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.target).entries());
    try {
      await request(`/api/${activeEntity}/${encodeURIComponent(dialog.dataset.recordId)}`, {
        method: "PUT", body: JSON.stringify(body),
      });
      dialog.close();
      await loadRecords(activeEntity);
    } catch (error) {
      feedback(event.target, error.message, "error");
    }
  });
  dialog.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => dialog.close());
  });
}

document.addEventListener("DOMContentLoaded", () => {
  prepareForm();
  loadDashboard();
  loadLegacyReport();
  prepareRecords();
});

// Browsers may restore form pages from the back-forward cache without firing
// DOMContentLoaded again. Reload those snapshots so database options and event
// handlers always reconnect when navigating from the dashboard.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) location.reload();
});
