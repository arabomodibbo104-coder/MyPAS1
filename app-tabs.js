// ============================================================
// SIDEBAR + TAB ROUTING
// ============================================================
const NAV_BY_ROLE = {
  admin: [
    ["dashboard","fa-gauge","Dashboard"], ["classes","fa-chalkboard","Classes & Scores"],
    ["masterlist","fa-list","Master List"], ["assignments","fa-diagram-project","Curriculum & Assignments"],
    ["staffDirectory","fa-user-tie","Staff Directory"], ["students","fa-user-graduate","Students"],
    ["timetable","fa-calendar-days","Timetable"], ["certificates","fa-award","Certificates & Awards"],
    ["analytics","fa-chart-line","Analytics"], ["catracker","fa-list-check","CA Tracker"],
    ["fees","fa-money-bill","Fees"], ["websites","fa-globe","School Websites"],
    ["importTool","fa-file-import","Bulk Import"], ["classManagement","fa-school","Manage Classes"],
    ["transferStudents","fa-people-arrows","Transfer Students"], ["scoreControl","fa-lock","Score Control"],
    ["printReports","fa-print","Print Report Cards"],
    ["settings","fa-gear","Settings"],
  ],
  headmaster: [["dashboard","fa-gauge","Dashboard"], ["classes","fa-chalkboard","Classes & Scores"], ["masterlist","fa-list","Master List"], ["certificates","fa-award","Certificates & Awards"], ["printReports","fa-print","Print Report Cards"], ["settings","fa-gear","My Profile"]],
  principal: [["dashboard","fa-gauge","Dashboard"], ["classes","fa-chalkboard","Classes & Scores"], ["masterlist","fa-list","Master List"], ["certificates","fa-award","Certificates & Awards"], ["printReports","fa-print","Print Report Cards"], ["settings","fa-gear","My Profile"]],
  bursar: [["fees","fa-money-bill","Fees"], ["settings","fa-gear","My Profile"]],
  teacher: [["dashboard","fa-gauge","Dashboard"], ["classes","fa-chalkboard","My Classes"], ["masterlist","fa-list","Master List"], ["settings","fa-gear","My Profile"]],
  student: [["myReport","fa-file-lines","My Report Card"], ["settings","fa-gear","My Profile"]],
};
const TAB_TITLES = { dashboard:"Dashboard", classes:"Classes & Scores", masterlist:"Master List", assignments:"Curriculum & Assignments",
  staffDirectory:"Staff Directory", students:"Students", timetable:"Timetable", certificates:"Certificates & Awards",
  analytics:"Analytics", catracker:"CA Tracker", fees:"Fees", websites:"School Websites", importTool:"Bulk Import",
  classManagement:"Manage Classes", transferStudents:"Transfer Students", scoreControl:"Score Control",
  printReports:"Print Report Cards",
  settings:"Settings", myReport:"My Report Card" };

function buildSidebar() {
  const nav = NAV_BY_ROLE[state.role] || [];
  document.getElementById("sidebarNav").innerHTML = nav.map(([id,icon,label]) =>
    `<button class="sidebar-item" data-tab="${id}" onclick="switchTab('${id}')"><span class="si-icon"><i class="fa-solid ${icon}"></i></span>${label}</button>`
  ).join("");
  document.getElementById("topbarRole").textContent = state.role.charAt(0).toUpperCase() + state.role.slice(1);
}

function switchTab(id) {
  document.querySelectorAll(".sidebar-item").forEach(b => b.classList.toggle("active", b.dataset.tab === id));
  document.getElementById("topbarTitle").textContent = TAB_TITLES[id] || id;
  toggleSidebar(false);
  const root = document.getElementById("tabRoot");
  root.innerHTML = `<div class="tab-panel active" id="panel-${id}"></div>`;
  const renderers = { dashboard: renderDashboard, classes: renderClasses, masterlist: renderMasterList,
    staffDirectory: renderStaffDirectory, students: renderStudents, fees: renderFees, settings: renderSettings, myReport: renderMyReport,
    assignments: renderAssignments, timetable: renderTimetable, certificates: renderCertificates,
    analytics: renderAnalytics, catracker: renderCaTracker, websites: renderWebsites, importTool: renderImportTool,
    classManagement: renderClassManagement, transferStudents: renderTransferStudents, scoreControl: renderScoreControl,
    printReports: renderPrintReports };
  (renderers[id] || (() => { document.getElementById(`panel-${id}`).innerHTML = "Coming soon."; }))();
}

// ============================================================
// DASHBOARD
// ============================================================
async function renderDashboard() {
  const el = document.getElementById("panel-dashboard");
  el.innerHTML = `<div class="card-grid" id="dashStats"></div>`;
  const { count: studentCount } = await sb.from("students").select("*", { count: "exact", head: true }).eq("is_active", true);
  const { count: staffCount } = await sb.from("staff").select("*", { count: "exact", head: true }).eq("is_active", true);
  document.getElementById("dashStats").innerHTML = `
    ${statCard("fa-user-graduate", studentCount ?? "—", "Active Students")}
    ${statCard("fa-user-tie", staffCount ?? "—", "Active Staff")}
    ${statCard("fa-chalkboard", state.classes.length, "Classes")}
    ${statCard("fa-book", state.subjects.length, "Subjects")}
  `;
}
function statCard(icon, value, label) {
  return `<div class="class-card"><div class="cc-icon"><i class="fa-solid ${icon}"></i></div><div class="cc-name">${value}</div><div class="cc-sub">${label}</div></div>`;
}

// ============================================================
// CLASSES & SCORES
// ============================================================
async function renderClasses() {
  const el = document.getElementById("panel-classes");
  let myClasses = state.classes;
  if (state.role === "teacher") {
    const { data: assigns } = await sb.from("class_teacher_subjects").select("class_id").eq("staff_id", state.staff.id);
    const ids = new Set((assigns || []).map(a => a.class_id));
    myClasses = state.classes.filter(c => ids.has(c.id));
  } else if (state.role === "headmaster") {
    myClasses = state.classes.filter(c => c.category === "nursery" || c.category === "primary");
  } else if (state.role === "principal") {
    myClasses = state.classes.filter(c => c.category === "jss" || c.category === "ss");
  }
  el.innerHTML = `<div class="card-grid">${myClasses.map(c => `
    <div class="class-card" onclick="openClass('${c.id}')">
      <div class="cc-icon">${c.icon || "📚"}</div>
      <div class="cc-name">${c.name}</div>
      <div class="cc-sub">${c.category.toUpperCase()}${c.is_graduating_class ? " · Graduating" : ""}</div>
    </div>`).join("")}</div>`;
}

async function openClass(classId) {
  state.currentClass = state.classes.find(c => c.id === classId);
  const el = document.getElementById("tabRoot");
  el.innerHTML = `<div class="tab-panel active">
    <button class="btn" onclick="switchTab('classes')"><i class="fa-solid fa-arrow-left"></i> Back to Classes</button>
    <h2 style="font-family:var(--font-display);margin:14px 0 4px;">${state.currentClass.name}</h2>
    <div class="term-pills" id="termPills"></div>
    <div id="classBody"></div>
  </div>`;
  document.getElementById("termPills").innerHTML = state.terms.map(t =>
    `<div class="term-pill ${t.id === state.currentTermId ? "active" : ""}" onclick="setClassTerm('${t.id}')">${t.name}</div>`
  ).join("");
  await loadClassScoreGrid();
}
function setClassTerm(termId) {
  state.currentTermId = termId;
  document.querySelectorAll(".term-pill").forEach(p => p.classList.remove("active"));
  event.target.classList.add("active");
  loadClassScoreGrid();
}

async function loadClassScoreGrid() {
  const body = document.getElementById("classBody");
  body.innerHTML = "Loading…";
  const classId = state.currentClass.id, termId = state.currentTermId;
  const isNurseryPrimary = state.currentClass.category === "nursery" || state.currentClass.category === "primary";

  const [{ data: students }, { data: classSubjects }, { data: scores }, { data: windows }] = await Promise.all([
    sb.from("students").select("id, full_name, admission_no").eq("class_id", classId).eq("is_active", true).order("full_name"),
    sb.from("class_subjects").select("subject_id, subjects(id,name)").eq("class_id", classId),
    sb.from("student_scores").select("*").eq("class_id", classId).eq("term_id", termId),
    sb.from("term_period_windows").select("*").eq("term_id", termId),
  ]);

  let subjectList = (classSubjects || []).map(cs => cs.subjects);
  if (state.role === "teacher") {
    const { data: mySubs } = await sb.from("class_teacher_subjects").select("subject_id").eq("staff_id", state.staff.id).eq("class_id", classId);
    const allowed = new Set((mySubs || []).map(s => s.subject_id));
    subjectList = subjectList.filter(s => allowed.has(s.id));
  }

  if (!subjectList.length) { body.innerHTML = `<p style="color:var(--dash-muted)">No subjects assigned to this class yet. ${state.role === "admin" ? "Add some in Curriculum & Assignments." : ""}</p>`; return; }
  if (!students || !students.length) { body.innerHTML = `<p style="color:var(--dash-muted)">No students in this class yet.</p>`; return; }

  const scoreMap = {};
  (scores || []).forEach(s => { scoreMap[s.student_id + "_" + s.subject_id] = s; });
  const windowMap = {}; (windows || []).forEach(w => { windowMap[w.period] = w.is_open; });

  // Locks + approved unlock exceptions, for this class+term (all subjects at once)
  const { data: locks } = await sb.from("subject_score_locks").select("*").eq("class_id", classId).eq("term_id", termId);
  const lockSet = new Set((locks || []).map(l => l.subject_id + "_" + l.period));
  const { data: approvedReqs } = await sb.from("score_unlock_requests").select("*").eq("class_id", classId).eq("term_id", termId).eq("status", "approved");
  state.currentApprovedExceptions = approvedReqs || [];

  const isPrivileged = ["admin", "headmaster", "principal"].includes(state.role);
  function cellEditable(subjectId, period, studentId) {
    if (isPrivileged) return true;
    if (!windowMap[period]) return false;
    const locked = lockSet.has(subjectId + "_" + period);
    if (!locked) return true;
    return (state.currentApprovedExceptions || []).some(r =>
      r.subject_id === subjectId && r.period === period && r.student_ids.includes(studentId));
  }

  const caCols = isNurseryPrimary ? ["ca1","ca2"] : ["ca1","ca2","ca3"];
  const periodOf = { ca1: "ca1", ca2: "ca2", ca3: "ca3", exam_score: "exam" };

  let html = `<div style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap;">`;
  ["ca1","ca2","ca3","exam"].forEach(p => {
    if (p === "ca3" && isNurseryPrimary) return;
    const open = !!windowMap[p];
    html += `<span class="tag" style="${open ? '' : 'opacity:.5;'}">${p.toUpperCase()} ${open ? "🟢 Open" : "🔒 Closed"}</span>`;
  });
  html += `</div>`;

  html += `<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Student</th>`;
  subjectList.forEach(s => { html += `<th colspan="${caCols.length + 2}">${s.name}</th>`; });
  html += `</tr><tr><th></th>`;
  subjectList.forEach(subj => {
    caCols.forEach(c => {
      const p = periodOf[c];
      const locked = lockSet.has(subj.id + "_" + p);
      html += `<th>${c.toUpperCase()}${locked ? ' <i class="fa-solid fa-lock" title="Locked"></i>' : ""}</th>`;
    });
    const examLocked = lockSet.has(subj.id + "_exam");
    html += `<th>Exam${examLocked ? ' <i class="fa-solid fa-lock" title="Locked"></i>' : ""}</th><th>Total</th>`;
  });
  html += `</tr></thead><tbody>`;

  students.forEach(stu => {
    html += `<tr><td class="name-cell">${stu.full_name}</td>`;
    subjectList.forEach(subj => {
      const key = stu.id + "_" + subj.id;
      const rec = scoreMap[key] || {};
      caCols.forEach(c => {
        const period = periodOf[c];
        const editable = cellEditable(subj.id, period, stu.id);
        const val = rec[c] === null || rec[c] === undefined ? "" : rec[c];
        html += `<td><input type="number" min="0" max="${isNurseryPrimary?20:10}" value="${val}" placeholder="—"
          data-stu="${stu.id}" data-subj="${subj.id}" data-field="${c}" onchange="markDirty(this)"
          ${editable ? "" : "disabled"} style="${editable ? "" : "opacity:.45;"}"/></td>`;
      });
      const examEditable = cellEditable(subj.id, "exam", stu.id);
      const examVal = rec.exam_score === null || rec.exam_score === undefined ? "" : rec.exam_score;
      html += `<td><input type="number" min="0" max="${isNurseryPrimary?60:70}" value="${examVal}" placeholder="—"
        data-stu="${stu.id}" data-subj="${subj.id}" data-field="exam_score" onchange="markDirty(this)"
        ${examEditable ? "" : "disabled"} style="${examEditable ? "" : "opacity:.45;"}"/></td>`;
      const total = (rec.ca1||0) + (rec.ca2||0) + (isNurseryPrimary?0:(rec.ca3||0)) + (rec.exam_score||0);
      html += `<td style="font-weight:800;">${total || ""}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table></div>
    <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
      <button class="btn btn-green" onclick="saveClassScores()"><i class="fa-solid fa-floppy-disk"></i> Save Scores</button>
      <button class="btn" onclick="viewClassReportCards()"><i class="fa-solid fa-file-lines"></i> View Report Cards</button>
    </div>`;

  // Per-subject submit / request-unlock controls (teachers submit their
  // own subject; anyone assigned can request an unlock for missed students)
  if (state.role === "teacher" || isPrivileged) {
    html += `<div class="settings-card" style="margin-top:16px;"><div class="settings-card-title">Submit / Unlock Scores</div>`;
    subjectList.forEach(subj => {
      html += `<div class="settings-row"><span>${subj.name}</span><div style="display:flex;gap:6px;flex-wrap:wrap;">`;
      ["ca1","ca2","ca3","exam"].forEach(p => {
        if (p === "ca3" && isNurseryPrimary) return;
        const locked = lockSet.has(subj.id + "_" + p);
        const open = !!windowMap[p];
        if (!open) return;
        if (!locked) {
          html += `<button class="btn btn-green" style="font-size:10px;padding:5px 9px;" onclick="submitPeriod('${subj.id}','${p}')">Submit ${p.toUpperCase()}</button>`;
        } else {
          html += `<button class="btn" style="font-size:10px;padding:5px 9px;" onclick="openRequestUnlockModal('${subj.id}','${subj.name.replace(/'/g,"&apos;")}','${p}')">Request Unlock (${p.toUpperCase()})</button>`;
          if (isPrivileged) html += `<button class="btn btn-danger" style="font-size:10px;padding:5px 9px;" onclick="forceUnlock('${subj.id}','${p}')">Force Unlock</button>`;
        }
      });
      html += `</div></div>`;
    });
    html += `</div>`;
  }

  body.innerHTML = html;
}

async function submitPeriod(subjectId, period) {
  if (!confirm(`Submit ${period.toUpperCase()} for this subject? Once submitted, it locks immediately and you won't be able to edit it without admin approval.`)) return;
  const { error } = await sb.rpc("submit_score_period", { p_class_id: state.currentClass.id, p_subject_id: subjectId, p_term_id: state.currentTermId, p_period: period });
  if (error) { alert(error.message); return; }
  alert("Submitted and locked.");
  loadClassScoreGrid();
}
async function forceUnlock(subjectId, period) {
  if (!confirm("Force-unlock this subject/period for everyone? Use sparingly.")) return;
  const { error } = await sb.rpc("force_unlock_subject_period", { p_class_id: state.currentClass.id, p_subject_id: subjectId, p_term_id: state.currentTermId, p_period: period });
  if (error) { alert(error.message); return; }
  loadClassScoreGrid();
}
async function openRequestUnlockModal(subjectId, subjectName, period) {
  const { data: students } = await sb.from("students").select("id, full_name").eq("class_id", state.currentClass.id).eq("is_active", true).order("full_name");
  openModal(`<h3>Request Unlock — ${subjectName} (${period.toUpperCase()})</h3>
    <p style="font-size:12px;color:var(--dash-muted);">Select the students who missed this test and need their score added.</p>
    <div class="field" style="max-height:200px;overflow-y:auto;">
      ${(students||[]).map(s => `<label style="display:flex;gap:8px;align-items:center;font-size:13px;margin-bottom:6px;">
        <input type="checkbox" value="${s.id}" class="unlockStuCheck"/> ${s.full_name}</label>`).join("")}
    </div>
    <div class="field"><label>Reason</label><input id="unlockReason" placeholder="e.g. Was absent for the test"/></div>
    <button class="btn btn-green" style="width:100%;" onclick="submitUnlockRequest('${subjectId}','${period}')">Send Request to Admin</button>`);
}
async function submitUnlockRequest(subjectId, period) {
  const studentIds = [...document.querySelectorAll(".unlockStuCheck:checked")].map(c => c.value);
  const reason = document.getElementById("unlockReason").value.trim();
  if (!studentIds.length) { alert("Select at least one student."); return; }
  const { error } = await sb.from("score_unlock_requests").insert({
    class_id: state.currentClass.id, subject_id: subjectId, term_id: state.currentTermId, period,
    staff_id: state.staff.id, student_ids: studentIds, reason,
  });
  if (error) { alert(error.message); return; }
  closeModal();
  alert("Request sent. The subject stays locked until admin approves.");
}

function markDirty(input) { input.dataset.dirty = "1"; input.style.borderColor = "var(--dash-green)"; }

async function saveClassScores() {
  const inputs = document.querySelectorAll('#classBody input[data-dirty="1"]');
  if (!inputs.length) { alert("No changes to save."); return; }
  const byKey = {};
  inputs.forEach(inp => {
    const key = inp.dataset.stu + "_" + inp.dataset.subj;
    byKey[key] = byKey[key] || { student_id: inp.dataset.stu, subject_id: inp.dataset.subj };
    byKey[key][inp.dataset.field] = inp.value === "" ? null : Number(inp.value);
  });
  // Fill any missing fields from the current cell values (not just dirty ones)
  Object.keys(byKey).forEach(key => {
    const [stu, subj] = key.split("_");
    document.querySelectorAll(`#classBody input[data-stu="${stu}"][data-subj="${subj}"]`).forEach(inp => {
      if (!(inp.dataset.field in byKey[key])) {
        byKey[key][inp.dataset.field] = inp.value === "" ? null : Number(inp.value);
      }
    });
  });
  const rows = Object.values(byKey).map(r => ({
    ...r, class_id: state.currentClass.id, term_id: state.currentTermId,
    created_by: state.staff ? state.staff.id : null,
  }));
  const { error } = await sb.from("student_scores").upsert(rows, { onConflict: "student_id,subject_id,term_id" });
  if (error) { alert("Save failed: " + error.message); return; }
  alert("Scores saved. Averages and positions have been recomputed automatically.");
  loadClassScoreGrid();
}

async function viewClassReportCards() {
  const { data: students } = await sb.from("students").select("id, full_name").eq("class_id", state.currentClass.id).eq("is_active", true).order("full_name");
  const opts = (students || []).map(s => `<option value="${s.id}">${s.full_name}</option>`).join("");
  openModal(`<h3>Select Student</h3>
    <div class="field"><select id="rcStudentPick">${opts}</select></div>
    <button class="btn btn-green" style="width:100%;" onclick="closeModal();renderReportCardFor(document.getElementById('rcStudentPick').value)">View Report Card</button>`);
}

// ============================================================
// REPORT CARD RENDERER — reproduces the exact grading logic
// ============================================================
async function renderReportCardFor(studentId) {
  const el = document.getElementById("tabRoot");
  el.innerHTML = `<div class="tab-panel active"><button class="btn no-print" onclick="switchTab('classes')">
    <i class="fa-solid fa-arrow-left"></i> Back</button>
    <div style="margin:14px 0;" id="rcHost">Loading…</div></div>`;
  const html = await buildReportCardHtml(studentId, state.currentTermId);
  document.getElementById("rcHost").innerHTML = html + `
    <div class="no-print" style="text-align:center;margin-top:16px;">
      <button class="btn btn-green" onclick="window.print()"><i class="fa-solid fa-print"></i> Print</button>
    </div>`;
  renderReportCardQr(studentId);
}

// Age + holiday-duration helpers, matching the original app's flexible
// date parsing and formatting exactly.
function calcAgeFromDob(dobRaw) {
  if (!dobRaw) return null;
  const dob = new Date(dobRaw);
  if (isNaN(dob)) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const beforeBirthday = (today.getMonth() < dob.getMonth()) || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
  if (beforeBirthday) age--;
  return age >= 0 ? age : null;
}
function formatDobWithAge(dobRaw) {
  if (!dobRaw) return "—";
  const age = calcAgeFromDob(dobRaw);
  return age !== null ? `${dobRaw} (${age}yrs)` : dobRaw;
}
function calcHolidaysDuration(resumptionRaw, closingRaw) {
  if (!resumptionRaw || !closingRaw) return "—";
  const start = new Date(resumptionRaw), end = new Date(closingRaw);
  if (isNaN(start) || isNaN(end)) return "—";
  const diffDays = Math.round((end - start) / 86400000);
  if (diffDays < 0) return "—";
  return `${diffDays} day${diffDays !== 1 ? "s" : ""}`;
}
function getAnnualRemark(grade) {
  const remarks = {
    A: "Outstanding annual performance! This student has shown exceptional dedication and excellence throughout the entire academic year. Keep soaring higher!",
    B: "Very good annual performance. This student demonstrated commendable effort and consistency throughout the academic year. With a little more push, excellence is within reach.",
    C: "Fair annual performance. The student showed moderate effort across all three terms. Greater focus and consistency will produce significantly better results next year.",
    D: "Weak annual performance. The student needs to significantly improve study habits and dedication. More effort and discipline are required for meaningful progress.",
    E: "Poor annual performance. The student struggled considerably throughout the academic year. Urgent attention, guidance, and parental support are strongly recommended.",
    F: "The student failed to meet the required academic standard for the year. Immediate and sustained intervention is necessary to prevent further regression.",
  };
  return remarks[grade] || "Academic record incomplete for annual assessment.";
}
function getCardCategoryClass(category) {
  const c = (category || "").toLowerCase();
  if (c.includes("nursery")) return "category-nursery";
  if (c.includes("jss")) return "category-jss";
  if (c.includes("ss")) return "category-ss";
  return "category-primary";
}
// value===null/undefined → not entered yet (dashed blank). A genuine
// explicit 0 is shown as "0", matching the nullable-scores model.
function displayScore(value) {
  return (value === null || value === undefined)
    ? '<span style="border-bottom:1px dashed #000;display:inline-block;width:20px"></span>'
    : value;
}

async function buildReportCardHtml(studentId, termId) {
  const [{ data: student }, { data: summary }, { data: scores }, { data: term }] = await Promise.all([
    sb.from("students").select("*, classes(name,category)").eq("id", studentId).single(),
    sb.from("student_term_summary").select("*").eq("student_id", studentId).eq("term_id", termId).maybeSingle(),
    sb.from("student_scores").select("*, subjects(name)").eq("student_id", studentId).eq("term_id", termId),
    sb.from("terms").select("*, sessions(label)").eq("id", termId).single(),
  ]);
  if (!student) return "<p>Student not found.</p>";
  const isNurseryPrimary = student.classes.category === "nursery" || student.classes.category === "primary";
  const settings = state.schoolSettings;
  const catClass = getCardCategoryClass(student.classes.category);

  const { count: totalInClass } = await sb.from("students").select("id", { count: "exact", head: true }).eq("class_id", student.class_id).eq("is_active", true);

  const wantPosition = isNurseryPrimary ? "Headmaster" : "Principal";
  const { data: sigStaff } = await sb.from("staff").select("full_name, signature_url, positions").contains("positions", [wantPosition]);
  const { data: adminOfficer } = await sb.from("staff").select("full_name, signature_url").contains("positions", ["Admin Officer"]);
  const authorityName = (sigStaff && sigStaff[0]?.full_name) || settings[`${wantPosition.toLowerCase()}_fallback_name`] || wantPosition;
  const authoritySig = (sigStaff && sigStaff[0]?.signature_url) || settings[`${wantPosition.toLowerCase()}_fallback_sig_url`] || "";
  const adminOfficerName = (adminOfficer && adminOfficer[0]?.full_name) || settings.admin_officer_fallback_name || "Admin Officer";
  const adminOfficerSig = (adminOfficer && adminOfficer[0]?.signature_url) || settings.admin_officer_fallback_sig_url || "";
  const website = isNurseryPrimary ? (settings.primary_website || "") : (settings.secondary_website || "");

  const schoolLogoHtml = settings.school_logo_url ? `<img src="${settings.school_logo_url}" class="school-logo-img" crossorigin="anonymous" onerror="this.style.opacity='0'">` : "";
  const secondaryLogoHtml = settings.secondary_logo_url ? `<img src="${settings.secondary_logo_url}" class="school-logo-img" crossorigin="anonymous" onerror="this.style.opacity='0'">` : "";
  const authoritySigHtml = authoritySig ? `<img class="sig-img" src="${authoritySig}" crossorigin="anonymous" alt="${wantPosition} Signature">` : "";
  const adminOfficerSigHtml = adminOfficerSig ? `<img class="sig-img" src="${adminOfficerSig}" crossorigin="anonymous" alt="Admin Officer Signature">` : "";

  let subjRows = "";
  let subjNo = 0;
  for (const s of (scores || [])) {
    subjNo++;
    const anyEntered = s.ca1 !== null || s.ca2 !== null || s.ca3 !== null || s.exam_score !== null;
    const total = (s.ca1||0)+(s.ca2||0)+(isNurseryPrimary?0:(s.ca3||0))+(s.exam_score||0);
    const grade = anyEntered ? gradeFor(total).grade : "";
    let posLabel = "—";
    if (anyEntered) {
      const { data: ranks } = await sb.rpc("subject_ranks", { p_class_id: student.class_id, p_term_id: termId, p_subject_id: s.subject_id });
      const mine = (ranks || []).find(r => r.student_id === studentId);
      posLabel = mine ? mine.position_label : "—";
    }
    subjRows += `<tr>
      <td>${subjNo}</td>
      <td style="text-align:left">${s.subjects.name}</td>
      <td>${displayScore(s.ca1)}</td>
      <td>${displayScore(s.ca2)}</td>
      ${isNurseryPrimary ? "" : `<td>${displayScore(s.ca3)}</td>`}
      <td>${displayScore(s.exam_score)}</td>
      <td>${anyEntered ? total : ""}</td>
      <td>${grade}</td>
      <td>${anyEntered ? posLabel : "—"}</td>
      <td>${anyEntered ? gradeFor(total).remark.split(",")[0] : "ABSENT"}</td>
    </tr>`;
  }

  const avg = summary?.average ?? 0;
  const gr = gradeFor(avg);
  const s3Head = isNurseryPrimary ? "" : `<th>3rd CA (10)</th>`;
  const termLower = (term?.name || "").toLowerCase();
  const isThirdTerm = termLower.includes("third");

  const gradingHtml = `
    <table>
      <thead><tr><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th><th>F</th></tr></thead>
      <tbody><tr><td>70-100</td><td>60-69</td><td>50-59</td><td>45-49</td><td>40-44</td><td>0-39</td></tr></tbody>
    </table>`;

  let lowerLeftHtml = `<div class="grading-box">${gradingHtml}</div>`;
  let remarkText = gr.remark;
  const summaryTitle = isThirdTerm ? "Third Term Summary" : "Term Summary";

  if (isThirdTerm && summary?.annual_average != null) {
    const { data: session } = await sb.from("sessions").select("id").eq("label", term?.sessions?.label || settings.current_session).maybeSingle();
    const { data: siblingTerms } = await sb.from("terms").select("id, name").eq("session_id", session?.id || term?.session_id);
    const firstTermId = siblingTerms?.find(t => t.name === "First Term")?.id;
    const secondTermId = siblingTerms?.find(t => t.name === "Second Term")?.id;
    const [{ data: firstSummary }, { data: secondSummary }] = await Promise.all([
      firstTermId ? sb.from("student_term_summary").select("average").eq("student_id", studentId).eq("term_id", firstTermId).maybeSingle() : { data: null },
      secondTermId ? sb.from("student_term_summary").select("average").eq("student_id", studentId).eq("term_id", secondTermId).maybeSingle() : { data: null },
    ]);
    const fmtAvg = v => (v === null || v === undefined ? "—" : v + "%");
    const annualGrade = gradeFor(summary.annual_average).grade;
    lowerLeftHtml = `
      <div class="annual-summary-box">
        <div class="ann-title">★ Annual Summary ★</div>
        <table>
          <thead><tr><th>1st Avg</th><th>2nd Avg</th><th>3rd Avg</th><th>Ann. Avg</th><th>Grade</th><th>Pos</th></tr></thead>
          <tbody><tr>
            <td>${fmtAvg(firstSummary?.average)}</td>
            <td>${fmtAvg(secondSummary?.average)}</td>
            <td>${avg}%</td>
            <td><strong>${summary.annual_average}%</strong></td>
            <td><strong>${annualGrade}</strong></td>
            <td>${summary.annual_position_label || "—"}</td>
          </tr></tbody>
        </table>
      </div>`;
    remarkText = getAnnualRemark(annualGrade);
  }

  return `<div class="card ${catClass}" id="rc-card-${studentId}">
    <div class="card-top">
      <div class="logo-container">${schoolLogoHtml}</div>
      <div class="school-title">
        <h2>${settings.school_name || "Pariya School"}</h2>
        <p><strong style="color:var(--accent)">Motto:</strong> ${settings.motto || ""}</p>
        <p class="muted"><strong style="color:var(--accent)">Address:</strong> ${settings.address || ""}</p>
        <div class="contact-info">
          <strong>Website:</strong> <a href="${website}" target="_blank" style="color:inherit;text-decoration:none;">${website}</a>
        </div>
      </div>
      <div class="logo-container">${secondaryLogoHtml}</div>
    </div>

    <hr class="info-separator">

    <div class="student-header">
      <span class="name-block"><strong>Student:</strong> ${student.full_name}</span>
      <span class="report-term">${(term?.name || "").toUpperCase()} REPORT CARD</span>
      <span class="session-info">Session: ${term?.sessions?.label || settings.current_session || ""}</span>
    </div>

    <table class="info-table">
      <tr>
        <td><strong>Admission:</strong> <span class="data">${student.admission_no || "-"}</span></td>
        <td><strong>Term:</strong> <span class="data">${term?.name || ""}</span></td>
        <td><strong>Resumption Date:</strong> <span class="data">${term?.resumption_date || "—"}</span></td>
      </tr>
      <tr>
        <td><strong>Gender:</strong> <span class="data">${student.gender || "-"}</span></td>
        <td><strong>Total in Class:</strong> <span class="data">${totalInClass ?? "—"}</span></td>
        <td><strong>Closing Date:</strong> <span class="data">${term?.closing_date || "—"}</span></td>
      </tr>
      <tr>
        <td><strong>Class:</strong> <span class="data">${student.classes.name}</span></td>
        <td><strong>Date Of Birth:</strong> <span class="data">${formatDobWithAge(student.date_of_birth)}</span></td>
        <td><strong>Holidays Duration:</strong> <span class="data">${calcHolidaysDuration(term?.resumption_date, term?.closing_date)}</span></td>
      </tr>
    </table>

    <div class="card-subjects">
      <table>
        <thead>
          <tr>
            <th>No</th><th style="text-align:left">Subject</th>
            <th>1st CA (${isNurseryPrimary?20:10})</th><th>2nd CA (${isNurseryPrimary?20:10})</th>
            ${s3Head}
            <th>Exam (${isNurseryPrimary?60:70})</th><th>Total</th><th>Grade</th><th>Position</th><th>Remark</th>
          </tr>
        </thead>
        <tbody>${subjRows}</tbody>
      </table>
    </div>

    <div class="lower-row">
      ${lowerLeftHtml}
      <div class="total-summary">
        <div class="summary-title">${summaryTitle}</div>
        <table>
          <thead><tr><th>Total Marks</th><th>Average</th><th>Grade</th><th>Position</th></tr></thead>
          <tbody><tr>
            <td>${summary?.total_marks ?? "—"}</td>
            <td>${avg}</td>
            <td>${gr.grade}</td>
            <td><span class="pos-plain">${summary?.class_position_label || "—"}</span></td>
          </tr></tbody>
        </table>
      </div>
    </div>

    <div class="remarks"><strong>${isThirdTerm ? "Annual Remark:" : "Teacher's Remark:"}</strong> ${remarkText}</div>

    <div class="bottom-row">
      <div class="signature-block">
        ${adminOfficerSigHtml}
        <div class="sig-line"></div>
        <div style="font-weight:900;text-align:center;">${adminOfficerName}</div>
        <div class="sig-caption">Admin Officer</div>
      </div>
      <div class="qr-wrap" style="display:flex;flex-direction:column;align-items:center;gap:2px;">
        <div id="qrcode-${studentId}" class="qr-code-container"></div>
        <div style="font-size:9px;font-weight:800;color:var(--dash-muted);margin-top:2px;">VERIFY REPORT</div>
      </div>
      <div class="signature-block">
        ${authoritySigHtml}
        <div class="sig-line"></div>
        <div style="font-weight:900;text-align:center;">${authorityName}</div>
        <div class="sig-caption">${wantPosition}</div>
      </div>
    </div>
  </div>`;
}

async function renderReportCardQr(studentId) {
  const container = document.getElementById(`qrcode-${studentId}`);
  if (!container || typeof QRCode === "undefined") return;
  const { data: student } = await sb.from("students").select("full_name, class_id, classes(name)").eq("id", studentId).single();
  const { data: summary } = await sb.from("student_term_summary").select("*").eq("student_id", studentId).eq("term_id", state.currentTermId).maybeSingle();
  const settings = state.schoolSettings;
  const qrText = `SCHOOL: ${settings.school_name || ""}\nSTUDENT: ${student?.full_name || ""}\nCLASS: ${student?.classes?.name || ""}\n` +
    `TOTAL: ${summary?.total_marks ?? ""}\nAVG: ${summary?.average ?? ""}%\nPOS: ${summary?.class_position_label || ""}\n` +
    `SESSION: ${settings.current_session || ""}\nDATE: ${new Date().toLocaleDateString()}`;
  container.innerHTML = "";
  new QRCode(container, { text: qrText, width: 100, height: 100, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
}

function gradeFor(avg) {
  if (avg >= 70) return { grade: "A", remark: "Excellent result, keep the flag flying!" };
  if (avg >= 60) return { grade: "B", remark: "Very good performance, aim even higher!" };
  if (avg >= 50) return { grade: "C", remark: "Good effort, you can still improve." };
  if (avg >= 45) return { grade: "D", remark: "Needs improvement, keep trying." };
  if (avg >= 40) return { grade: "E", remark: "Can do better with guidance and determination." };
  return { grade: "F", remark: "A disappointing result, but not the end. You can still turn things around." };
}

// ============================================================
// STUDENT PORTAL: MY REPORT
// ============================================================
async function renderPrintReports() {
  const el = document.getElementById("panel-printReports");
  let myClasses = state.classes;
  if (state.role === "headmaster") myClasses = state.classes.filter(c => c.category === "nursery" || c.category === "primary");
  else if (state.role === "principal") myClasses = state.classes.filter(c => c.category === "jss" || c.category === "ss");
  el.innerHTML = `
    <div class="settings-card">
      <div class="settings-card-title">Print All Report Cards — One Class, One Term</div>
      <p style="font-size:12px;color:var(--dash-muted);">Loads every active student's report card for the class + term below, one per printed page, then opens the print dialog. Nothing else on the page will print — just the report cards.</p>
      <div class="field"><label>Class</label><select id="prClassSelect">
        <option value="">— choose —</option>
        ${myClasses.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}</select></div>
      <div class="field"><label>Term</label><select id="prTermSelect">
        ${state.terms.map(t => `<option value="${t.id}" ${t.id===state.currentTermId?"selected":""}>${t.name}</option>`).join("")}</select></div>
      <button class="btn btn-green" onclick="loadBulkReportCards()"><i class="fa-solid fa-file-lines"></i> Load Report Cards</button>
    </div>
    <div id="prStatus" style="margin:10px 0;color:var(--dash-muted);font-size:13px;"></div>
    <div id="prPrintBtnHost" class="no-print"></div>
    <div id="prBulkHost"></div>`;
}

async function loadBulkReportCards() {
  const classId = document.getElementById("prClassSelect").value;
  const termId = document.getElementById("prTermSelect").value;
  const status = document.getElementById("prStatus");
  const host = document.getElementById("prBulkHost");
  const btnHost = document.getElementById("prPrintBtnHost");
  if (!classId) { alert("Choose a class."); return; }
  host.innerHTML = "";
  btnHost.innerHTML = "";
  status.textContent = "Loading students…";

  const { data: students } = await sb.from("students").select("id, full_name").eq("class_id", classId).eq("is_active", true).order("full_name");
  if (!students || !students.length) { status.textContent = "No active students in this class."; return; }

  let cardsHtml = "";
  for (let i = 0; i < students.length; i++) {
    status.textContent = `Building report card ${i + 1} of ${students.length}…`;
    cardsHtml += await buildReportCardHtml(students[i].id, termId);
  }
  host.innerHTML = cardsHtml;
  status.textContent = `${students.length} report card(s) ready.`;

  // QR codes render after the HTML is in the DOM (must not touch
  // host.innerHTML again after this, since re-serializing would
  // wipe the QR canvases — that's why the print button lives in
  // its own separate element instead of being appended here).
  for (const s of students) {
    await renderReportCardQr(s.id);
  }

  btnHost.innerHTML = `<div style="text-align:center;margin:16px 0;">
    <button class="btn btn-green" onclick="window.print()"><i class="fa-solid fa-print"></i> Print All ${students.length} Report Cards</button>
  </div>`;
}
async function renderMyReport() {
  const el = document.getElementById("panel-myReport");
  el.innerHTML = `<div class="term-pills" id="myTermPills"></div><div id="myReportHost"></div>`;
  document.getElementById("myTermPills").innerHTML = state.terms.map(t =>
    `<div class="term-pill ${t.id===state.currentTermId?'active':''}" onclick="loadMyReport('${t.id}')">${t.name}</div>`).join("");
  await loadMyReport(state.currentTermId);
}
async function loadMyReport(termId) {
  state.currentTermId = termId;
  document.querySelectorAll("#myTermPills .term-pill").forEach(p => p.classList.remove("active"));
  if (event) event.target.classList.add("active");
  const host = document.getElementById("myReportHost");
  host.innerHTML = "Loading…";
  const { data: summary } = await sb.from("student_term_summary").select("fees_status").eq("student_id", state.student.id).eq("term_id", termId).maybeSingle();
  if (!summary || summary.fees_status !== "paid") {
    const { data: fp } = await sb.from("fee_payments").select("amount_paid").eq("student_id", state.student.id).eq("term_id", termId).maybeSingle();
    const { data: fs } = await sb.from("fee_structure").select("expected_amount").eq("category", state.student.classes.category).maybeSingle();
    host.innerHTML = `<div class="settings-card">
      <h3 style="color:var(--dash-danger);">Fees Not Paid</h3>
      <p>Your report card for this term is locked until your school fees are settled.</p>
      <p>Expected: ₦${fs?.expected_amount ?? "—"} · Paid: ₦${fp?.amount_paid ?? 0}</p>
      <p style="color:var(--dash-muted);font-size:12px;">Please contact the school bursar to complete payment.</p>
    </div>`;
    return;
  }
  host.innerHTML = await buildReportCardHtml(state.student.id, termId) + `
    <div class="no-print" style="text-align:center;margin-top:16px;">
      <button class="btn btn-green" onclick="window.print()"><i class="fa-solid fa-print"></i> Print / Download</button>
    </div>`;
  renderReportCardQr(state.student.id);
}
