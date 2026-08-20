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
    ["settings","fa-gear","Settings"],
  ],
  headmaster: [["dashboard","fa-gauge","Dashboard"], ["classes","fa-chalkboard","Classes & Scores"], ["masterlist","fa-list","Master List"], ["certificates","fa-award","Certificates & Awards"], ["settings","fa-gear","My Profile"]],
  principal: [["dashboard","fa-gauge","Dashboard"], ["classes","fa-chalkboard","Classes & Scores"], ["masterlist","fa-list","Master List"], ["certificates","fa-award","Certificates & Awards"], ["settings","fa-gear","My Profile"]],
  bursar: [["fees","fa-money-bill","Fees"], ["settings","fa-gear","My Profile"]],
  teacher: [["dashboard","fa-gauge","Dashboard"], ["classes","fa-chalkboard","My Classes"], ["masterlist","fa-list","Master List"], ["settings","fa-gear","My Profile"]],
  student: [["myReport","fa-file-lines","My Report Card"], ["settings","fa-gear","My Profile"]],
};
const TAB_TITLES = { dashboard:"Dashboard", classes:"Classes & Scores", masterlist:"Master List", assignments:"Curriculum & Assignments",
  staffDirectory:"Staff Directory", students:"Students", timetable:"Timetable", certificates:"Certificates & Awards",
  analytics:"Analytics", catracker:"CA Tracker", fees:"Fees", websites:"School Websites", importTool:"Bulk Import",
  classManagement:"Manage Classes", transferStudents:"Transfer Students", scoreControl:"Score Control",
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
    classManagement: renderClassManagement, transferStudents: renderTransferStudents, scoreControl: renderScoreControl };
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

  // Resolve signatories live from staff table
  const wantPosition = isNurseryPrimary ? "Headmaster" : "Principal";
  const { data: sigStaff } = await sb.from("staff").select("full_name, signature_url, positions").contains("positions", [wantPosition]);
  const { data: adminOfficer } = await sb.from("staff").select("full_name, signature_url").contains("positions", ["Admin Officer"]);
  const signatoryName = (sigStaff && sigStaff[0]?.full_name) || settings[`${wantPosition.toLowerCase()}_fallback_name`] || wantPosition;
  const signatorySig = (sigStaff && sigStaff[0]?.signature_url) || settings[`${wantPosition.toLowerCase()}_fallback_sig_url`] || "";
  const adminName = (adminOfficer && adminOfficer[0]?.full_name) || settings.admin_officer_fallback_name || "Admin Officer";
  const adminSig = (adminOfficer && adminOfficer[0]?.signature_url) || settings.admin_officer_fallback_sig_url || "";

  let rows = "";
  for (const s of (scores || [])) {
    const total = (s.ca1||0)+(s.ca2||0)+(isNurseryPrimary?0:(s.ca3||0))+(s.exam_score||0);
    const allZero = total === 0;
    const grade = allZero ? "" : gradeFor(total).grade;
    let subjPos = "";
    if (!allZero) {
      const { data: ranks } = await sb.rpc("subject_ranks", { p_class_id: student.class_id, p_term_id: termId, p_subject_id: s.subject_id });
      const mine = (ranks || []).find(r => r.student_id === studentId);
      subjPos = mine ? mine.position_label : "";
    }
    rows += `<tr>
      <td class="subj-name">${s.subjects.name}</td>
      <td>${allZero ? "-" : s.ca1}</td><td>${allZero ? "-" : s.ca2}</td>
      ${isNurseryPrimary ? "" : `<td>${allZero ? "-" : s.ca3}</td>`}
      <td>${allZero ? "-" : s.exam_score}</td>
      <td>${allZero ? "-" : total}</td>
      <td>${grade}</td>
      <td>${allZero ? "ABSENT" : subjPos}</td>
    </tr>`;
  }

  const avg = summary?.average ?? 0;
  const gr = gradeFor(avg);
  const annualBox = term?.name === "Third Term" && summary?.annual_average != null ? `
    <div class="rc-grade-box"><table>
      <tr><th colspan="2">Annual Summary</th></tr>
      <tr><td>Annual Average</td><td>${summary.annual_average}</td></tr>
      <tr><td>Annual Position</td><td>${summary.annual_position_label || "—"}</td></tr>
    </table></div>` : "";

  return `<div class="card">
    <div class="school-title">
      <h2>${settings.school_name || "Pariya School"}</h2>
      <div class="contact-info">${settings.address || ""} ${settings.primary_website ? "· " + settings.primary_website : ""}</div>
    </div>
    <div class="student-header">
      <div class="name-block">${student.full_name} <small>(${student.admission_no})</small></div>
      <div class="report-term">${term?.name || ""} — ${term?.sessions?.label || settings.current_session || ""}</div>
      <div class="session-info">${student.classes.name}</div>
    </div>
    <table class="rc-table">
      <thead><tr><th>Subject</th><th>CA1</th><th>CA2</th>${isNurseryPrimary ? "" : "<th>CA3</th>"}<th>Exam</th><th>Total</th><th>Grade</th><th>Position</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="rc-grade-box">
      <table>
        <tr><th colspan="2">Term Summary</th></tr>
        <tr><td>Total Marks</td><td>${summary?.total_marks ?? "—"}</td></tr>
        <tr><td>Average</td><td>${avg}</td></tr>
        <tr><td>Grade</td><td>${gr.grade}</td></tr>
        <tr><td>Class Position</td><td>${summary?.class_position_label ?? "—"}</td></tr>
      </table>
      <table>
        <tr><th colspan="2">Grading Scale</th></tr>
        <tr><td>70-100</td><td>A - Excellent</td></tr>
        <tr><td>60-69</td><td>B - Very Good</td></tr>
        <tr><td>50-59</td><td>C - Good</td></tr>
        <tr><td>45-49</td><td>D - Fair</td></tr>
        <tr><td>40-44</td><td>E - Pass</td></tr>
        <tr><td>0-39</td><td>F - Fail</td></tr>
      </table>
      ${annualBox}
    </div>
    <div class="rc-remark">Remark: ${gr.remark}</div>
    <div class="rc-sig">
      <div>${adminSig ? `<img src="${adminSig}" style="height:36px;"/>` : ""}<div class="sig-line">${adminName}<br/>Admin Officer</div></div>
      <div>${signatorySig ? `<img src="${signatorySig}" style="height:36px;"/>` : ""}<div class="sig-line">${signatoryName}<br/>${wantPosition}</div></div>
    </div>
  </div>`;
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
}
