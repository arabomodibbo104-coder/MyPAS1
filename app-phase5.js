// ============================================================
// POSITION LIST — standalone ranking sheet per class per term
// ============================================================
async function renderPositionList() {
  const el = document.getElementById("panel-positionList");
  const roles = state.allRoles || [state.role];
  let myClasses = state.classes;
  if (!roles.includes("admin")) {
    const idSet = new Set();
    if (roles.includes("headmaster")) state.classes.filter(c => c.category === "nursery" || c.category === "primary").forEach(c => idSet.add(c.id));
    if (roles.includes("principal")) state.classes.filter(c => c.category === "jss" || c.category === "ss").forEach(c => idSet.add(c.id));
    if (idSet.size) myClasses = state.classes.filter(c => idSet.has(c.id));
  }
  el.innerHTML = `
    <div class="field"><label>Class</label><select id="plClassSelect" onchange="loadPositionList()">
      <option value="">— choose —</option>
      ${myClasses.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}</select></div>
    <div class="field"><label>Term</label><select id="plTermSelect" onchange="loadPositionList()">
      ${state.terms.map(t => `<option value="${t.id}" ${t.id===state.currentTermId?"selected":""}>${t.name}</option>`).join("")}</select></div>
    <div id="plBody"></div>
    <div class="no-print" id="plExportHost"></div>`;
}
async function loadPositionList() {
  const classId = document.getElementById("plClassSelect").value;
  const termId = document.getElementById("plTermSelect").value;
  const body = document.getElementById("plBody");
  const exportHost = document.getElementById("plExportHost");
  if (!classId) { body.innerHTML = ""; exportHost.innerHTML = ""; return; }
  body.innerHTML = "Loading…";
  const cls = state.classes.find(c => c.id === classId);
  const term = state.terms.find(t => t.id === termId);
  const isThirdTerm = (term?.name || "").toLowerCase().includes("third");

  const { data: rows } = await sb.from("student_term_summary")
    .select("total_marks, average, overall_grade, class_position_label, annual_average, annual_position_label, students(full_name, admission_no)")
    .eq("class_id", classId).eq("term_id", termId);

  // Rank client-side by total_marks (tie-safe: use the stored
  // class_position_label directly rather than re-deriving it, so
  // this always matches exactly what's printed on report cards).
  const sorted = (rows || []).filter(r => r.total_marks != null).sort((a, b) => (b.total_marks||0) - (a.total_marks||0));

  if (!sorted.length) { body.innerHTML = `<p style="color:var(--dash-muted);">No scores recorded yet for this class/term.</p>`; exportHost.innerHTML = ""; return; }

  const rowsHtml = sorted.map(r => `<tr>
    <td>${r.class_position_label || "—"}</td>
    <td class="name-cell">${r.students.full_name}</td>
    <td>${r.students.admission_no}</td>
    <td>${r.total_marks ?? "—"}</td>
    <td>${r.average ?? "—"}</td>
    <td>${r.overall_grade || "—"}</td>
    ${isThirdTerm ? `<td>${r.annual_average ?? "—"}</td><td>${r.annual_position_label || "—"}</td>` : ""}
  </tr>`).join("");

  body.innerHTML = `<div style="overflow-x:auto;"><table class="data-table" id="positionListTable">
    <thead><tr><th>Position</th><th>Name</th><th>Admission No</th><th>Total</th><th>Average</th><th>Grade</th>
      ${isThirdTerm ? "<th>Annual Avg</th><th>Annual Position</th>" : ""}</tr></thead>
    <tbody>${rowsHtml}</tbody></table></div>
    <button class="btn no-print" style="margin-top:10px;" onclick="window.print()"><i class="fa-solid fa-print"></i> Print</button>`;

  exportHost.innerHTML = `
    <button class="btn" style="margin-top:10px;" onclick="downloadBrandedPdf('Position List','${(cls.name).replace(/'/g,"")} — ${(term?.name||"").replace(/'/g,"")}',document.getElementById('positionListTable').outerHTML,'Position_List_${cls.name.replace(/\\s/g,"_")}_${(term?.name||"").replace(/\\s/g,"_")}.pdf')"><i class="fa-solid fa-file-pdf"></i> Download PDF</button>
    <button class="btn" style="margin-top:10px;" onclick="downloadBrandedWord('Position List','${(cls.name).replace(/'/g,"")} — ${(term?.name||"").replace(/'/g,"")}',document.getElementById('positionListTable').outerHTML,'Position_List_${cls.name.replace(/\\s/g,"_")}_${(term?.name||"").replace(/\\s/g,"_")}.doc')"><i class="fa-solid fa-file-word"></i> Download Word</button>`;
}
