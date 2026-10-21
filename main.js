// إعدادات Supabase
const SUPABASE_URL = "https://xuapwqkzorjkiyqgpqkc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_PDh8zWfV91aP1baOQQe9oA_Y-uw6QeM";

const MAX_ROWS = 30;
const tbody = document.getElementById("tableBody");
const countEl = document.getElementById("recordCount");
const statusEl = document.getElementById("status");

let records = [];
let supabaseClient = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function setStatus(message, kind = "") {
  statusEl.textContent = message;
  statusEl.className = "notice" + (kind ? " " + kind : "");
}

function updateCount() {
  countEl.textContent = records.length;
}

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : "";
}

function renderTable() {
  tbody.innerHTML = "";

  for (let i = 0; i < MAX_ROWS; i++) {
    const r = records[i];
    const tr = document.createElement("tr");

    if (r) {
      tr.innerHTML = `
        <td class="numcell">${i + 1}</td>
        <td><span class="saved-value">${escapeHtml(r.teacher_name)}</span></td>
        <td><span class="saved-value">${escapeHtml(r.initiative_title)}</span></td>
        <td><span class="saved-value">${escapeHtml(dateOnly(r.implementation_date))}</span></td>
        <td><span class="saved-value">${escapeHtml(r.notes || "")}</span></td>
        <td class="screen-only"><span class="saved-label">مسجلة</span></td>`;
    } else {
      tr.innerHTML = `
        <td class="numcell">${i + 1}</td>
        <td><input data-field="teacher_name" placeholder="اسم المعلمة" maxlength="150"></td>
        <td><input data-field="initiative_title" placeholder="عنوان المبادرة" maxlength="250"></td>
        <td><input data-field="implementation_date" type="date"></td>
        <td><textarea data-field="notes" placeholder="ملاحظات" maxlength="2000"></textarea></td>
        <td class="screen-only"><button class="save-row" type="button" data-save>حفظ</button></td>`;
    }

    tbody.appendChild(tr);
  }

  updateCount();
}

async function loadRecords(showMessage = true) {
  if (!supabaseClient) return;

  if (showMessage) {
    setStatus("جارٍ تحميل المبادرات من قاعدة البيانات...");
  }

  const { data, error } = await supabaseClient
    .from("initiatives")
    .select("id, teacher_name, initiative_title, implementation_date, notes, created_at")
    .order("created_at", { ascending: true })
    .limit(MAX_ROWS);

  if (error) {
    console.error(error);
    renderTable();
    setStatus("تعذر الاتصال بقاعدة البيانات: " + error.message, "error");
    return;
  }

  records = data || [];
  renderTable();
  setStatus("تم الاتصال بقاعدة البيانات المشتركة بنجاح.", "ok");
}

tbody.addEventListener("click", async event => {
  const button = event.target.closest("[data-save]");
  if (!button) return;

  const row = button.closest("tr");
  const teacher_name = row.querySelector('[data-field="teacher_name"]').value.trim();
  const initiative_title = row.querySelector('[data-field="initiative_title"]').value.trim();
  const implementation_date = row.querySelector('[data-field="implementation_date"]').value || null;
  const notes = row.querySelector('[data-field="notes"]').value.trim();

  if (!teacher_name || !initiative_title) {
    alert("أدخلي اسم المعلمة وعنوان المبادرة أولًا.");
    return;
  }

  if (records.length >= MAX_ROWS) {
    alert("اكتمل العدد المحدد: 30 مبادرة.");
    return;
  }

  button.disabled = true;
  button.textContent = "جارٍ الحفظ...";

  const { error } = await supabaseClient
    .from("initiatives")
    .insert([{ teacher_name, initiative_title, implementation_date, notes: notes || null }]);

  if (error) {
    button.disabled = false;
    button.textContent = "حفظ";
    setStatus("تعذر الحفظ: " + error.message, "error");
    return;
  }

  await loadRecords(false);
});

document.getElementById("refreshBtn").addEventListener("click", () => loadRecords());
document.getElementById("printBtn").addEventListener("click", () => window.print());

document.getElementById("exportBtn").addEventListener("click", () => {
  const data = [
    ["م", "اسم المعلمة", "عنوان المبادرة", "تاريخ التنفيذ", "ملاحظات"],
    ...records.map((r, i) => [
      i + 1,
      r.teacher_name,
      r.initiative_title,
      dateOnly(r.implementation_date),
      r.notes || ""
    ])
  ];

  const csv = "\uFEFF" + data
    .map(row => row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");

  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "حصر_المبادرات.csv";
  a.click();
  URL.revokeObjectURL(url);
});

renderTable();

if (!window.supabase || !window.supabase.createClient) {
  setStatus("تعذر تحميل مكتبة الاتصال. تحققي من الإنترنت ثم أعيدي فتح الموقع.", "error");
} else {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  loadRecords().catch(error => {
    console.error(error);
    setStatus("حدث خطأ أثناء الاتصال: " + error.message, "error");
  });
}
