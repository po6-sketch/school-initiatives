// إعدادات مشروع Supabase الخاص بموقع حصر المبادرات
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
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
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
  if (!value) return "";
  return String(value).slice(0, 10);
}
function renderTable() {
  tbody.innerHTML = "";
  const rows = records.slice(0, MAX_ROWS);
  rows.forEach((r, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="numcell">${i + 1}</td>
      <td><span class="saved-value">${escapeHtml(r.teacher_name)}</span></td>
      <td><span class="saved-value">${escapeHtml(r.initiative_title)}</span></td>
      <td><span class="saved-value">${escapeHtml(dateOnly(r.implementation_date))}</span></td>
      <td><span class="saved-value">${escapeHtml(r.notes || "")}</span></td>
      <td class="screen-only"><span class="saved-label">مسجلة</span></td>`;
    tbody.appendChild(tr);
  });
  for (let i = rows.length; i < MAX_ROWS; i++) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="numcell">${i + 1}</td>
      <td><input aria-label="اسم المعلمة" data-field="teacher_name" placeholder="اسم المعلمة" maxlength="150"></td>
      <td><input aria-label="عنوان المبادرة" data-field="initiative_title" placeholder="عنوان المبادرة" maxlength="250"></td>
      <td><input aria-label="تاريخ التنفيذ" data-field="implementation_date" type="date"></td>
      <td><textarea aria-label="ملاحظات" data-field="notes" placeholder="ملاحظات" maxlength="2000"></textarea></td>
      <td class="screen-only"><button class="save-row" type="button" data-save>حفظ</button></td>`;
    tbody.appendChild(tr);
  }
  updateCount();
}
async function loadRecords(showMessage = true) {
  if (!supabaseClient) return;
  if (showMessage) setStatus("جارٍ تحميل المبادرات من قاعدة البيانات...");
  const { data, error } = await supabaseClient
    .from("initiatives")
    .select("id, teacher_name, initiative_title, implementation_date, notes, created_at")
    .order("created_at", { ascending: true })
    .limit(MAX_ROWS);
  if (error) {
    console.error(error);
    setStatus("تعذر تحميل البيانات. تأكدي من وجود جدول initiatives وصلاحيات القراءة في Supabase.", "error");
    return;
  }
  records = data || [];
  renderTable();
  setStatus("متصل بقاعدة البيانات المشتركة. المبادرات المسجلة تظهر هنا لجميع من يفتح هذا الرابط.", "ok");
}
tbody.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-save]");
  if (!button) return;
  const row = button.closest("tr");
  const teacher_name = row.querySelector('[data-field="teacher_name"]').value.trim();
  const initiative_title = row.querySelector('[data-field="initiative_title"]').value.trim();
  const implementation_date = row.querySelector('[data-field="implementation_date"]').value || null;
  const notes = row.querySelector('[data-field="notes"]').value.trim();
  if (!teacher_name || !initiative_title) {
    alert("فضلاً أدخلي اسم المعلمة وعنوان المبادرة قبل الحفظ.");
    return;
  }
  if (records.length >= MAX_ROWS) {
    alert("اكتمل العدد المحدد وهو 30 مبادرة.");
    return;
  }
  button.disabled = true;
  button.textContent = "جارٍ الحفظ...";
  const { error } = await supabaseClient.from("initiatives").insert([{
    teacher_name, initiative_title, implementation_date, notes: notes || null
  }]);
  if (error) {
    console.error(error);
    button.disabled = false;
    button.textContent = "حفظ";
    setStatus("لم تُحفظ المبادرة. قد تكون صلاحية الإضافة غير مفعّلة في Supabase.", "error");
    alert("تعذر الحفظ. تأكدي من صلاحيات INSERT في Supabase ثم حاولي مجددًا.");
    return;
  }
  await loadRecords(false);
  setStatus("تم حفظ المبادرة بنجاح في قاعدة البيانات المشتركة.", "ok");
});
document.getElementById("refreshBtn").addEventListener("click", () => loadRecords(true));
document.getElementById("printBtn").addEventListener("click", () => window.print());
document.getElementById("exportBtn").addEventListener("click", () => {
  const data = [["م","اسم المعلمة","عنوان المبادرة","تاريخ التنفيذ","ملاحظات"],
    ...records.map((r,i) => [i+1,r.teacher_name,r.initiative_title,dateOnly(r.implementation_date),r.notes || ""])];
  const csv = "\uFEFF" + data.map(row => row.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8;"}));
  const a = document.createElement("a");
  a.href = url; a.download = "حصر_مبادرات_الثانوية_الأولى_بالمذنب.csv"; a.click();
  URL.revokeObjectURL(url);
});

if (!window.supabase || !window.supabase.createClient) {
  setStatus("تعذر تحميل مكتبة الاتصال. تحققي من اتصال الإنترنت ثم أعيدي فتح الصفحة.", "error");
} else {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  loadRecords();
}
