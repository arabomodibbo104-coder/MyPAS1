// ============================================================
// CERTIFICATES & AWARDS
// ============================================================
async function renderCertificates() {
  const el = document.getElementById("panel-certificates");
  el.innerHTML = `
    <div class="settings-card">
      <div class="settings-card-title">Best Student of the Year</div>
      <div class="field"><label>Section</label><select id="awSection">
        <option>Nursery</option><option>Primary</option><option>Junior Secondary</option><option>Senior Secondary</option>
      </select></div>
      <div class="field"><label>Student</label><select id="awStudent"><option value="">Loading…</option></select></div>
      <div class="field"><label>Citation (optional)</label><input id="awCitation" placeholder="e.g. Outstanding academic excellence"/></div>
      <button class="btn btn-green" onclick="saveAward()">Save Award</button>
    </div>
    <div class="settings-card">
      <div class="settings-card-title">Generate a Certificate</div>
      <div class="field"><label>Type</label><select id="certType" onchange="toggleCertFields()">
        <option value="award">Best Student Award</option>
        <option value="testimonial">Testimonial (graduating student)</option>
        <option value="staff">Staff Certificate</option>
      </select></div>
      <div id="certFields"></div>
      <button class="btn btn-green" onclick="generateCertificate()">Generate & Preview</button>
    </div>
    <div id="certPreviewHost"></div>`;
  await populateAwardStudentOptions();
  toggleCertFields();
}
async function populateAwardStudentOptions() {
  const { data: students } = await sb.from("students").select("id, full_name, classes(name)").eq("is_active", true).order("full_name");
  document.getElementById("awStudent").innerHTML = (students||[]).map(s => `<option value="${s.id}">${s.full_name} (${s.classes?.name||""})</option>`).join("");
}
async function saveAward() {
  const section = document.getElementById("awSection").value;
  const student_id = document.getElementById("awStudent").value;
  const citation = document.getElementById("awCitation").value.trim();
  const { error } = await sb.from("awards").insert({
    student_id, section, citation, academic_session: state.schoolSettings.current_session,
  });
  if (error) alert(error.message); else alert("Award saved.");
}

function toggleCertFields() {
  const type = document.getElementById("certType").value;
  const host = document.getElementById("certFields");
  if (type === "staff") {
    sb.from("staff").select("id, full_name").eq("is_active", true).order("full_name").then(({data}) => {
      host.innerHTML = `<div class="field"><label>Staff Member</label><select id="certPersonId">
        ${(data||[]).map(s => `<option value="${s.id}">${s.full_name}</option>`).join("")}</select></div>`;
    });
  } else {
    const filterGrad = type === "testimonial";
    sb.from("students").select("id, full_name, classes(name, is_graduating_class)").eq("is_active", true).order("full_name").then(({data}) => {
      const list = filterGrad ? (data||[]).filter(s => s.classes?.is_graduating_class) : (data||[]);
      host.innerHTML = `<div class="field"><label>Student</label><select id="certPersonId">
        ${list.map(s => `<option value="${s.id}">${s.full_name} (${s.classes?.name||""})</option>`).join("") || "<option value=''>No graduating students found</option>"}</select></div>`;
    });
  }
}

async function generateCertificate() {
  const type = document.getElementById("certType").value;
  const personId = document.getElementById("certPersonId").value;
  if (!personId) { alert("Please select a person."); return; }
  const s = state.schoolSettings;
  let html = "";

  if (type === "staff") {
    const { data: staff } = await sb.from("staff").select("*").eq("id", personId).single();
    html = `<div class="card" style="text-align:center;padding:40px;">
      <h2 style="color:var(--primary);">${s.school_name}</h2>
      <p style="font-family:var(--font-display);font-size:22px;margin:20px 0;">Certificate of Service</p>
      <p>This certifies that</p>
      <h3>${staff.full_name}</h3>
      <p>has served diligently as ${( staff.positions||["Staff"]).join(", ")} at ${s.school_name}.</p>
      <p style="margin-top:40px;">${s.current_session}</p>
    </div>`;
  } else if (type === "testimonial") {
    const { data: student } = await sb.from("students").select("*, classes(name, category)").eq("id", personId).single();
    const level = student.classes.category === "primary" ? "Primary" : "Junior Secondary";
    html = `<div class="card" style="text-align:center;padding:40px;">
      <h2 style="color:var(--primary);">${s.school_name}</h2>
      <p style="font-family:var(--font-display);font-size:22px;margin:20px 0;">Testimonial</p>
      <p>This is to certify that</p>
      <h3>${student.full_name}</h3>
      <p>was a student of this school in ${student.classes.name} (${level} section) during the ${s.current_session} academic session,
      and is hereby released in good standing.</p>
      <p style="margin-top:40px;">Issued: ${new Date().toLocaleDateString()}</p>
    </div>`;
    await sb.from("testimonials").insert({ student_id: personId, level_type: student.classes.category, from_year: s.current_session, to_year: s.current_session });
  } else {
    const { data: award } = await sb.from("awards").select("*, students(full_name)").eq("student_id", personId).order("generated_at", { ascending: false }).limit(1).maybeSingle();
    const { data: student } = await sb.from("students").select("full_name").eq("id", personId).single();
    html = `<div class="card" style="text-align:center;padding:40px;">
      <h2 style="color:var(--primary);">${s.school_name}</h2>
      <p style="font-family:var(--font-display);font-size:22px;margin:20px 0;">Certificate of Excellence</p>
      <p>Awarded to</p>
      <h3>${student.full_name}</h3>
      <p>${award?.citation || "For outstanding academic performance"}</p>
      <p style="margin-top:40px;">${s.current_session}</p>
    </div>`;
  }
  document.getElementById("certPreviewHost").innerHTML = html + `
    <div class="no-print" style="text-align:center;margin-top:14px;"><button class="btn btn-green" onclick="window.print()"><i class="fa-solid fa-print"></i> Print</button></div>`;
}

// ============================================================
// ANALYTICS
// ============================================================
async function renderAnalytics() {
  const el = document.getElementById("panel-analytics");
  el.innerHTML = `<div class="field"><label>Term</label><select id="anTermSelect" onchange="loadAnalytics()">
    ${state.terms.map(t => `<option value="${t.id}" ${t.id===state.currentTermId?"selected":""}>${t.name}</option>`).join("")}</select></div>
    <div id="anBody"></div>`;
  await loadAnalytics();
}
async function loadAnalytics() {
  const termId = document.getElementById("anTermSelect").value;
  const body = document.getElementById("anBody");
  body.innerHTML = "Loading…";
  const { data: rows } = await sb.from("student_term_summary").select("class_id, average, classes(name)").eq("term_id", termId);
  const byClass = {};
  (rows||[]).forEach(r => {
    const key = r.classes?.name || "Unknown";
    byClass[key] = byClass[key] || { total: 0, count: 0, pass: 0 };
    byClass[key].total += r.average || 0;
    byClass[key].count += 1;
    if ((r.average||0) >= 40) byClass[key].pass += 1;
  });
  const classNames = Object.keys(byClass).sort();
  body.innerHTML = `<div class="card-grid">${classNames.map(name => {
    const d = byClass[name];
    const avg = d.count ? (d.total/d.count).toFixed(1) : "—";
    const passRate = d.count ? Math.round((d.pass/d.count)*100) : 0;
    return statCard("fa-chart-simple", avg, `${name} — Class Average`) ;
  }).join("")}</div>
  <div style="margin-top:16px;overflow-x:auto;"><table class="data-table">
    <thead><tr><th>Class</th><th>Students Scored</th><th>Class Average</th><th>Pass Rate (≥40)</th></tr></thead>
    <tbody>${classNames.map(name => { const d = byClass[name]; const avg = d.count?(d.total/d.count).toFixed(1):"—"; const pr = d.count?Math.round((d.pass/d.count)*100):0;
      return `<tr><td class="name-cell">${name}</td><td>${d.count}</td><td>${avg}</td><td>${pr}%</td></tr>`; }).join("")}</tbody></table></div>`;
}

// ============================================================
// CA TRACKER — score-entry completion per class/subject/term
// ============================================================
async function renderCaTracker() {
  const el = document.getElementById("panel-catracker");
  el.innerHTML = `<div class="field"><label>Term</label><select id="caTermSelect" onchange="loadCaTracker()">
    ${state.terms.map(t => `<option value="${t.id}" ${t.id===state.currentTermId?"selected":""}>${t.name}</option>`).join("")}</select></div>
    <div id="caBody"></div>`;
  await loadCaTracker();
}
async function loadCaTracker() {
  const termId = document.getElementById("caTermSelect").value;
  const body = document.getElementById("caBody");
  body.innerHTML = "Loading…";
  const rowsHtml = [];
  for (const cls of state.classes) {
    const [{ count: studentCount }, { data: classSubjects }] = await Promise.all([
      sb.from("students").select("*", { count: "exact", head: true }).eq("class_id", cls.id).eq("is_active", true),
      sb.from("class_subjects").select("subject_id").eq("class_id", cls.id),
    ]);
    const subjectCount = (classSubjects||[]).length;
    const expected = (studentCount||0) * subjectCount;
    const { count: entered } = await sb.from("student_scores").select("*", { count: "exact", head: true }).eq("class_id", cls.id).eq("term_id", termId);
    const pct = expected ? Math.round(((entered||0)/expected)*100) : 0;
    rowsHtml.push(`<tr><td class="name-cell">${cls.name}</td><td>${studentCount||0}</td><td>${subjectCount}</td><td>${entered||0}/${expected}</td><td>${pct}%</td></tr>`);
  }
  body.innerHTML = `<div style="overflow-x:auto;"><table class="data-table">
    <thead><tr><th>Class</th><th>Students</th><th>Subjects</th><th>Scores Entered</th><th>Completion</th></tr></thead>
    <tbody>${rowsHtml.join("")}</tbody></table></div>`;
}
