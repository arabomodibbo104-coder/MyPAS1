// ============================================================
// TIMETABLE — constraint-based builder
// Detects teacher double-booking: a staff member cannot be placed
// in two different classes at the same day+period.
// ============================================================
const TT_DAYS = [1,2,3,4,5]; // Mon-Fri
const TT_DAY_LABELS = { 1:"Mon", 2:"Tue", 3:"Wed", 4:"Thu", 5:"Fri" };
const TT_PERIODS = [1,2,3,4,5,6,7,8];

async function renderTimetable() {
  const el = document.getElementById("panel-timetable");
  const term = state.terms.find(t => t.id === state.currentTermId);
  let daysRemainingHtml = "";
  if (term?.closing_date) {
    const diffDays = Math.ceil((new Date(term.closing_date) - new Date()) / 86400000);
    daysRemainingHtml = diffDays >= 0
      ? `<div class="tag" style="margin-bottom:12px;">📅 ${diffDays} day${diffDays!==1?"s":""} remaining in ${term.name}</div>`
      : `<div class="tag" style="margin-bottom:12px;opacity:.6;">${term.name} closing date has passed</div>`;
  }
  el.innerHTML = `${daysRemainingHtml}<div class="field"><label>Class</label>
    <select id="ttClassSelect" onchange="loadTimetableGrid()"><option value="">— choose —</option>
    ${state.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}</select></div>
    <div id="ttGrid"></div>`;
}

async function getOrCreateTimetable(classId) {
  const { data: existing } = await sb.from("timetables").select("id").eq("class_id", classId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existing) return existing.id;
  const { data: created, error } = await sb.from("timetables").insert({ class_id: classId, generated_by: state.staff?.id }).select("id").single();
  if (error) { alert(error.message); return null; }
  return created.id;
}

async function loadTimetableGrid() {
  const classId = document.getElementById("ttClassSelect").value;
  const grid = document.getElementById("ttGrid");
  if (!classId) { grid.innerHTML = ""; return; }
  grid.innerHTML = "Loading…";

  const timetableId = await getOrCreateTimetable(classId);
  if (!timetableId) return;
  state.ttCurrentId = timetableId;
  state.ttCurrentClass = classId;

  const [{ data: slots }, { data: assigns }] = await Promise.all([
    sb.from("timetable_slots").select("*, subjects(name), staff(full_name)").eq("timetable_id", timetableId),
    sb.from("class_teacher_subjects").select("staff_id, subject_id, staff(full_name), subjects(name)").eq("class_id", classId),
  ]);
  state.ttSlots = slots || [];
  state.ttAssigns = assigns || [];

  const slotMap = {};
  (slots||[]).forEach(s => { slotMap[`${s.day_of_week}_${s.period_index}`] = s; });

  let html = `<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Period</th>${TT_DAYS.map(d => `<th>${TT_DAY_LABELS[d]}</th>`).join("")}</tr></thead><tbody>`;
  TT_PERIODS.forEach(p => {
    html += `<tr><td style="font-weight:800;">${p}</td>`;
    TT_DAYS.forEach(d => {
      const key = `${d}_${p}`;
      const cell = slotMap[key];
      html += `<td style="min-width:120px;">
        <select data-day="${d}" data-period="${p}" data-prev-value="${cell ? cell.staff_id+"|"+cell.subject_id : ""}" onchange="saveTimetableCell(this)" style="width:100%;font-size:11px;">
          <option value="">— empty —</option>
          ${(assigns||[]).map(a => `<option value="${a.staff_id}|${a.subject_id}" ${cell && cell.staff_id===a.staff_id && cell.subject_id===a.subject_id ? "selected" : ""}>${a.subjects.name} (${a.staff.full_name})</option>`).join("")}
        </select>
      </td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table></div>
    <p style="color:var(--dash-muted);font-size:12px;margin-top:10px;">Only teachers already assigned to this class (via Curriculum & Assignments) appear in the dropdowns. Saving a slot automatically checks for double-booking against this teacher's other classes.</p>
    <div class="no-print" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
      <button class="btn" onclick="window.print()"><i class="fa-solid fa-print"></i> Print</button>
      <button class="btn" onclick="undoTimetableChange()" id="ttUndoBtn" disabled>↶ Undo Last Change</button>
      <button class="btn" onclick="downloadTimetablePdf()"><i class="fa-solid fa-file-pdf"></i> PDF</button>
      <button class="btn" onclick="downloadTimetableWord()"><i class="fa-solid fa-file-word"></i> Word</button>
      <button class="btn" onclick="downloadTimetableExcel()"><i class="fa-solid fa-file-excel"></i> Excel</button>
      <button class="btn" onclick="downloadTimetablePng()"><i class="fa-solid fa-file-image"></i> PNG</button>
    </div>`;
  grid.innerHTML = html;
}

// ---------- single-level undo ----------
let ttLastChange = null; // { day, period, previousValue }
function updateUndoButton() {
  const btn = document.getElementById("ttUndoBtn");
  if (btn) btn.disabled = !ttLastChange;
}

// ---------- exports ----------
function buildTimetableExportHtml(className) {
  const table = document.querySelector("#ttGrid table")?.outerHTML || "";
  // Strip the <select> dropdowns from a cloned copy for export, showing plain text instead.
  const wrapper = document.createElement("div");
  wrapper.innerHTML = table;
  wrapper.querySelectorAll("select").forEach(sel => {
    const chosen = sel.options[sel.selectedIndex];
    const span = document.createElement("span");
    span.textContent = (chosen && chosen.value) ? chosen.textContent : "—";
    sel.replaceWith(span);
  });
  const signatureRow = `<div style="display:flex;justify-content:space-between;margin-top:30px;font-size:12px;">
    <div>Prepared by: ____________________</div>
    <div>Approved by: ____________________</div>
  </div>`;
  return `<div>${wrapper.innerHTML}${signatureRow}</div>`;
}
function downloadTimetablePdf() {
  const cls = state.classes.find(c => c.id === state.ttCurrentClass);
  downloadBrandedPdf("Class Timetable", cls?.name || "", buildTimetableExportHtml(cls?.name), `Timetable_${(cls?.name||"").replace(/\s/g,"_")}.pdf`);
}
function downloadTimetableWord() {
  const cls = state.classes.find(c => c.id === state.ttCurrentClass);
  downloadBrandedWord("Class Timetable", cls?.name || "", buildTimetableExportHtml(cls?.name), `Timetable_${(cls?.name||"").replace(/\s/g,"_")}.doc`);
}
function downloadTimetableExcel() {
  const cls = state.classes.find(c => c.id === state.ttCurrentClass);
  const bodyHtml = buildTimetableExportHtml(cls?.name);
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8">
    <xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Timetable</x:Name>
    <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml>
    </head><body>${bodyHtml}</body></html>`;
  const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `Timetable_${(cls?.name||"").replace(/\s/g,"_")}.xls`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
async function downloadTimetablePng() {
  const cls = state.classes.find(c => c.id === state.ttCurrentClass);
  const gridEl = document.getElementById("ttGrid");
  if (typeof html2canvas === "undefined") { alert("Export library not loaded."); return; }
  const canvas = await html2canvas(gridEl, { scale: 2, backgroundColor: "#ffffff" });
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `Timetable_${(cls?.name||"").replace(/\s/g,"_")}.png`;
  a.click();
}

async function saveTimetableCell(selectEl) {
  const day = Number(selectEl.dataset.day), period = Number(selectEl.dataset.period);
  const val = selectEl.value;
  const previousValue = selectEl.dataset.prevValue || "";

  // Clear this slot
  if (!val) {
    await sb.from("timetable_slots").delete().eq("timetable_id", state.ttCurrentId).eq("day_of_week", day).eq("period_index", period);
    ttLastChange = { day, period, previousValue };
    updateUndoButton();
    selectEl.dataset.prevValue = "";
    return;
  }
  const [staff_id, subject_id] = val.split("|");

  // Conflict check: is this staff member already booked elsewhere at this day+period,
  // in ANY class's timetable (not just this one)?
  const { data: conflicts } = await sb.from("timetable_slots")
    .select("id, timetables(class_id, classes(name))")
    .eq("staff_id", staff_id).eq("day_of_week", day).eq("period_index", period)
    .neq("timetable_id", state.ttCurrentId);
  if (conflicts && conflicts.length) {
    const otherClass = conflicts[0].timetables?.classes?.name || "another class";
    alert(`Conflict: this teacher is already scheduled in ${otherClass} at this exact day/period. Choose a different slot or teacher.`);
    selectEl.value = previousValue;
    return;
  }

  const { error } = await sb.from("timetable_slots").delete().eq("timetable_id", state.ttCurrentId).eq("day_of_week", day).eq("period_index", period);
  if (error) { alert(error.message); return; }
  const { error: insErr } = await sb.from("timetable_slots").insert({
    timetable_id: state.ttCurrentId, day_of_week: day, period_index: period, staff_id, subject_id,
  });
  if (insErr) { alert(insErr.message); return; }
  ttLastChange = { day, period, previousValue };
  updateUndoButton();
  selectEl.dataset.prevValue = val;
}
async function undoTimetableChange() {
  if (!ttLastChange) return;
  const { day, period, previousValue } = ttLastChange;
  await sb.from("timetable_slots").delete().eq("timetable_id", state.ttCurrentId).eq("day_of_week", day).eq("period_index", period);
  if (previousValue) {
    const [staff_id, subject_id] = previousValue.split("|");
    await sb.from("timetable_slots").insert({ timetable_id: state.ttCurrentId, day_of_week: day, period_index: period, staff_id, subject_id });
  }
  ttLastChange = null;
  loadTimetableGrid();
}
