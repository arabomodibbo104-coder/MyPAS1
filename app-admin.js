// ============================================================
// MASTER LIST
// ============================================================
async function renderMasterList() {
  const el = document.getElementById("panel-masterlist");
  let myClasses = state.classes;
  if (state.role === "teacher") {
    const { data: assigns } = await sb.from("class_teacher_subjects").select("class_id").eq("staff_id", state.staff.id);
    const ids = new Set((assigns || []).map(a => a.class_id));
    myClasses = state.classes.filter(c => ids.has(c.id));
  }
  el.innerHTML = `<div class="field"><label>Select Class</label>
    <select id="mlClassSelect" onchange="loadMasterList(this.value)">
      <option value="">— choose —</option>
      ${myClasses.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}
    </select></div>
    <div id="mlBody"></div>`;
}
async function loadMasterList(classId) {
  const body = document.getElementById("mlBody");
  if (!classId) { body.innerHTML = ""; return; }
  body.innerHTML = "Loading…";
  const { data: students } = await sb.from("students").select("admission_no, full_name, gender, date_of_birth, guardian_name, guardian_phone")
    .eq("class_id", classId).eq("is_active", true).order("full_name");
  body.innerHTML = `<div style="overflow-x:auto;"><table class="data-table">
    <thead><tr><th>#</th><th>Adm No</th><th>Name</th><th>Gender</th><th>DOB</th><th>Guardian</th><th>Phone</th></tr></thead>
    <tbody>${(students||[]).map((s,i) => `<tr>
      <td>${i+1}</td><td>${s.admission_no}</td><td class="name-cell">${s.full_name}</td>
      <td>${s.gender||"-"}</td><td>${s.date_of_birth||"-"}</td><td>${s.guardian_name||"-"}</td><td>${s.guardian_phone||"-"}</td>
    </tr>`).join("")}</tbody></table></div>
    <button class="btn no-print" style="margin-top:12px;" onclick="window.print()"><i class="fa-solid fa-print"></i> Print</button>`;
}

// ============================================================
// STAFF DIRECTORY (full CRUD — replaces the Teacher Directory sheet)
// ============================================================
async function renderStaffDirectory() {
  if (state.role !== "admin") { document.getElementById("panel-staffDirectory").innerHTML = "Admins only."; return; }
  const el = document.getElementById("panel-staffDirectory");
  el.innerHTML = `<button class="btn btn-green" onclick="openStaffForm()"><i class="fa-solid fa-plus"></i> Add Staff</button>
    <div id="staffList" style="margin-top:14px;"></div>`;
  await loadStaffList();
}
async function loadStaffList() {
  const { data: staff } = await sb.from("staff").select("*").order("full_name");
  document.getElementById("staffList").innerHTML = `<div class="card-grid">${(staff||[]).map(s => `
    <div class="class-card" style="cursor:default;">
      <div class="cc-name">${s.full_name}</div>
      <div class="cc-sub">${s.staff_code} · ${(s.positions||[]).join(", ") || "Teacher"}</div>
      <div class="cc-sub">${s.is_active ? "Active" : "Inactive"}</div>
      <div style="display:flex;gap:6px;margin-top:8px;">
        <button class="btn" style="flex:1;" onclick='openStaffForm(${JSON.stringify(s).replace(/'/g,"&apos;")})'>Edit</button>
        <button class="btn btn-danger" onclick="deactivateStaff('${s.id}')">${s.is_active?"Deactivate":"Activate"}</button>
      </div>
    </div>`).join("")}</div>`;
}
function openStaffForm(staff) {
  const positions = ["Admin","Headmaster","Principal","Bursar","Admin Officer","Teacher"];
  openModal(`<h3>${staff ? "Edit" : "Add"} Staff</h3>
    <div class="field"><label>Full Name</label><input id="sfName" value="${staff?.full_name||""}"/></div>
    <div class="field"><label>Staff ID (login)</label><input id="sfCode" value="${staff?.staff_code||""}" ${staff?"disabled":""}/></div>
    <div class="field"><label>Phone</label><input id="sfPhone" value="${staff?.phone||""}"/></div>
    <div class="field"><label>Email</label><input id="sfEmail" value="${staff?.email||""}"/></div>
    <div class="field"><label>Positions</label>
      <div class="pill-list">${positions.map(p => `<label style="display:flex;align-items:center;gap:4px;font-size:11px;">
        <input type="checkbox" value="${p}" ${staff?.positions?.includes(p)?"checked":""} class="sfPosCheck"/> ${p}</label>`).join("")}</div>
    </div>
    <div class="field"><label>${staff ? "Reset Password (leave blank to keep current)" : "Set Password"}</label><input id="sfPassword" type="password" placeholder="${staff?'••••••••':''}"/></div>
    <button class="btn btn-green" style="width:100%;" onclick="saveStaff(${staff?`'${staff.id}'`:'null'})">Save</button>`);
}
async function saveStaff(staffId) {
  const full_name = document.getElementById("sfName").value.trim();
  const staff_code = document.getElementById("sfCode").value.trim();
  const phone = document.getElementById("sfPhone").value.trim();
  const email = document.getElementById("sfEmail").value.trim();
  const password = document.getElementById("sfPassword").value;
  const positions = [...document.querySelectorAll(".sfPosCheck:checked")].map(c => c.value);
  const is_admin = positions.includes("Admin");
  if (!full_name || !staff_code) { alert("Name and Staff ID are required."); return; }
  if (!staffId && !password) { alert("Please set an initial password for this staff member."); return; }

  let row;
  if (staffId) {
    const { data, error } = await sb.from("staff").update({ full_name, phone, email, positions, is_admin, updated_at: new Date().toISOString() }).eq("id", staffId).select().single();
    if (error) { alert(error.message); return; }
    row = data;
  } else {
    const password_hash_res = await sb.rpc("hash_secret", { p_plain: password });
    const { data, error } = await sb.from("staff").insert({ full_name, staff_code, phone, email, positions, is_admin, password_hash: password_hash_res.data }).select().single();
    if (error) { alert(error.message); return; }
    row = data;
  }
  if (password) {
    if (staffId) {
      const password_hash_res = await sb.rpc("hash_secret", { p_plain: password });
      await sb.from("staff").update({ password_hash: password_hash_res.data }).eq("id", staffId);
    }
    await provisionAuthAccount("staff", row.id, row.staff_code, password);
  }
  closeModal();
  loadStaffList();
}
async function deactivateStaff(id) {
  const { data: cur } = await sb.from("staff").select("is_active").eq("id", id).single();
  await sb.from("staff").update({ is_active: !cur.is_active }).eq("id", id);
  loadStaffList();
}

// Calls the provision-user Edge Function so a real Supabase Auth
// account exists for this staff/student login.
async function provisionAuthAccount(kind, table_id, login_id, password) {
  const { data: { session } } = await sb.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/provision-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
    body: JSON.stringify({ kind, table_id, login_id, password }),
  });
  const json = await res.json();
  if (!res.ok) { alert("Account login setup failed: " + (json.error || res.statusText)); }
  return json;
}

// ============================================================
// STUDENTS (full CRUD — replaces manual roster entry in Sheets)
// ============================================================
async function renderStudents() {
  const el = document.getElementById("panel-students");
  el.innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end;">
      <div class="field" style="flex:1;min-width:180px;"><label>Filter by Class</label>
        <select id="stuFilterClass" onchange="loadStudentsList()"><option value="">All Classes</option>
        ${state.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}</select></div>
      <button class="btn btn-green" onclick="openStudentForm()"><i class="fa-solid fa-plus"></i> Add Student</button>
    </div>
    <div id="studentsList" style="margin-top:14px;"></div>`;
  await loadStudentsList();
}
async function loadStudentsList() {
  const classId = document.getElementById("stuFilterClass")?.value;
  let q = sb.from("students").select("*, classes(name)").order("full_name");
  if (classId) q = q.eq("class_id", classId);
  const { data: students } = await q;
  document.getElementById("studentsList").innerHTML = `<div class="card-grid">${(students||[]).map(s => `
    <div class="class-card" style="cursor:default;">
      <div class="cc-name">${s.full_name}</div>
      <div class="cc-sub">${s.admission_no} · ${s.classes?.name || "Unassigned"}</div>
      <div class="cc-sub">${s.is_active ? "Active" : "Inactive"}</div>
      <div style="display:flex;gap:6px;margin-top:8px;">
        <button class="btn" style="flex:1;" onclick='openStudentForm(${JSON.stringify(s).replace(/'/g,"&apos;")})'>Edit</button>
        <button class="btn btn-danger" onclick="deactivateStudent('${s.id}')">${s.is_active?"Deactivate":"Activate"}</button>
      </div>
    </div>`).join("")}</div>`;
}
function openStudentForm(stu) {
  openModal(`<h3>${stu ? "Edit" : "Add"} Student</h3>
    <div class="field"><label>Full Name</label><input id="stfName" value="${stu?.full_name||""}"/></div>
    <div class="field"><label>Admission No.</label><input id="stfAdm" value="${stu?.admission_no||""}" ${stu?"disabled":""}/></div>
    <div class="field"><label>Class</label><select id="stfClass">${state.classes.map(c => `<option value="${c.id}" ${stu?.class_id===c.id?"selected":""}>${c.name}</option>`).join("")}</select></div>
    <div class="field"><label>Gender</label><select id="stfGender">
      <option ${stu?.gender==="Male"?"selected":""}>Male</option><option ${stu?.gender==="Female"?"selected":""}>Female</option></select></div>
    <div class="field"><label>Date of Birth</label><input id="stfDob" type="date" value="${stu?.date_of_birth||""}"/></div>
    <div class="field"><label>Guardian Name</label><input id="stfGuardian" value="${stu?.guardian_name||""}"/></div>
    <div class="field"><label>Guardian Phone</label><input id="stfGuardianPhone" value="${stu?.guardian_phone||""}"/></div>
    <div class="field"><label>${stu?"Reset Password (blank = keep current / school default)":"Password (blank = use school default password)"}</label><input id="stfPassword" type="password"/></div>
    <button class="btn btn-green" style="width:100%;" onclick="saveStudent(${stu?`'${stu.id}'`:'null'})">Save</button>`);
}
async function saveStudent(studentId) {
  const full_name = document.getElementById("stfName").value.trim();
  const admission_no = document.getElementById("stfAdm").value.trim();
  const class_id = document.getElementById("stfClass").value;
  const gender = document.getElementById("stfGender").value;
  const date_of_birth = document.getElementById("stfDob").value || null;
  const guardian_name = document.getElementById("stfGuardian").value.trim();
  const guardian_phone = document.getElementById("stfGuardianPhone").value.trim();
  const password = document.getElementById("stfPassword").value;
  if (!full_name || !admission_no) { alert("Name and Admission Number are required."); return; }

  let row;
  const payload = { full_name, class_id, gender, date_of_birth, guardian_name, guardian_phone };
  if (studentId) {
    const { data, error } = await sb.from("students").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", studentId).select().single();
    if (error) { alert(error.message); return; }
    row = data;
  } else {
    const { data, error } = await sb.from("students").insert({ ...payload, admission_no }).select().single();
    if (error) { alert(error.message); return; }
    row = data;
  }
  if (password) {
    const password_hash_res = await sb.rpc("hash_secret", { p_plain: password });
    await sb.from("students").update({ password_hash: password_hash_res.data }).eq("id", row.id);
    await provisionAuthAccount("student", row.id, row.admission_no, password);
  }
  closeModal();
  loadStudentsList();
}
async function deactivateStudent(id) {
  const { data: cur } = await sb.from("students").select("is_active").eq("id", id).single();
  await sb.from("students").update({ is_active: !cur.is_active }).eq("id", id);
  loadStudentsList();
}

// ============================================================
// FEES
// ============================================================
async function renderFees() {
  const el = document.getElementById("panel-fees");
  el.innerHTML = `<div class="field"><label>Select Class</label>
    <select id="feeClassSelect" onchange="loadFeesGrid()"><option value="">— choose —</option>
    ${state.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}</select></div>
    <div class="field"><label>Term</label><select id="feeTermSelect" onchange="loadFeesGrid()">
    ${state.terms.map(t => `<option value="${t.id}" ${t.id===state.currentTermId?"selected":""}>${t.name}</option>`).join("")}</select></div>
    <div id="feeGrid"></div>`;
}
async function loadFeesGrid() {
  const classId = document.getElementById("feeClassSelect").value;
  const termId = document.getElementById("feeTermSelect").value;
  const grid = document.getElementById("feeGrid");
  if (!classId) { grid.innerHTML = ""; return; }
  grid.innerHTML = "Loading…";
  const cls = state.classes.find(c => c.id === classId);
  const { data: fs } = await sb.from("fee_structure").select("expected_amount").eq("category", cls.category).single();
  const [{ data: students }, { data: payments }] = await Promise.all([
    sb.from("students").select("id, full_name").eq("class_id", classId).eq("is_active", true).order("full_name"),
    sb.from("fee_payments").select("*").eq("class_id", classId).eq("term_id", termId),
  ]);
  const payMap = {}; (payments||[]).forEach(p => payMap[p.student_id] = p);
  grid.innerHTML = `<p style="color:var(--dash-muted);">Expected: ₦${fs?.expected_amount ?? "—"} per student</p>
    <div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Student</th><th>Amount Paid (₦)</th><th>Status Override</th><th></th></tr></thead>
    <tbody>${(students||[]).map(s => { const p = payMap[s.id] || {};
      return `<tr>
        <td class="name-cell">${s.full_name}</td>
        <td><input type="number" id="fp_amt_${s.id}" value="${p.amount_paid||0}" style="width:90px;"/></td>
        <td><select id="fp_ovr_${s.id}">
          <option value="" ${p.is_paid_override===null||p.is_paid_override===undefined?"selected":""}>Auto</option>
          <option value="true" ${p.is_paid_override===true?"selected":""}>Force Paid</option>
          <option value="false" ${p.is_paid_override===false?"selected":""}>Force Unpaid</option>
        </select></td>
        <td><button class="btn btn-green" onclick="saveFeeRow('${s.id}','${classId}','${termId}')">Save</button></td>
      </tr>`;}).join("")}</tbody></table></div>`;
}
async function saveFeeRow(studentId, classId, termId) {
  const amount_paid = Number(document.getElementById(`fp_amt_${studentId}`).value) || 0;
  const ovrRaw = document.getElementById(`fp_ovr_${studentId}`).value;
  const is_paid_override = ovrRaw === "" ? null : ovrRaw === "true";
  const { error } = await sb.from("fee_payments").upsert({
    student_id: studentId, class_id: classId, term_id: termId, amount_paid, is_paid_override,
    updated_by: state.staff ? state.staff.id : null,
  }, { onConflict: "student_id,term_id" });
  if (error) alert(error.message); else alert("Saved.");
}

// ============================================================
// SETTINGS
// ============================================================
async function renderSettings() {
  const el = document.getElementById("panel-settings");
  const s = state.schoolSettings;
  let html = "";
  if (state.role === "admin") {
    html += `<div class="settings-card">
      <div class="settings-card-title">School Profile</div>
      <div class="field"><label>School Name</label><input id="setSchoolName" value="${s.school_name||""}"/></div>
      <div class="field"><label>Motto</label><input id="setMotto" value="${s.motto||""}"/></div>
      <div class="field"><label>Address</label><input id="setAddress" value="${s.address||""}"/></div>
      <div class="field"><label>Current Session</label><input id="setSession" value="${s.current_session||""}"/></div>
      <div class="field"><label>Primary Website</label><input id="setPrimaryWebsite" value="${s.primary_website||""}" placeholder="https://..."/></div>
      <div class="field"><label>Secondary Website</label><input id="setSecondaryWebsite" value="${s.secondary_website||""}" placeholder="https://..."/></div>
      <div class="field"><label>School Logo — paste direct image link (e.g. from postimages.org)</label>
        <input id="setSchoolLogo" value="${s.school_logo_url||""}" placeholder="https://i.postimg.cc/..."/>
        ${s.school_logo_url ? `<img src="${s.school_logo_url}" style="height:50px;margin-top:6px;border-radius:6px;" onerror="this.style.display='none'"/>` : ""}
      </div>
      <div class="field"><label>Jibwis / Secondary Logo — paste direct image link</label>
        <input id="setSecondaryLogo" value="${s.secondary_logo_url||""}" placeholder="https://i.postimg.cc/..."/>
        ${s.secondary_logo_url ? `<img src="${s.secondary_logo_url}" style="height:50px;margin-top:6px;border-radius:6px;" onerror="this.style.display='none'"/>` : ""}
      </div>
      <p style="font-size:11px;color:var(--dash-muted);margin-top:-6px;">On postimages.org, use the "Direct link" URL (ends in .jpg/.png), not the page link.</p>
      <button class="btn btn-green" onclick="saveSchoolSettings()">Save</button>
    </div>
    <div class="settings-card">
      <div class="settings-card-title">Term Dates</div>
      <p style="font-size:12px;color:var(--dash-muted);">These dates print on every report card (Resumption Date, Closing Date, and the auto-calculated Holidays Duration).</p>
      <div class="field"><label>Term</label><select id="setDatesTerm" onchange="loadTermDatesForm()">
        ${state.terms.map(t => `<option value="${t.id}">${t.name}</option>`).join("")}</select></div>
      <div id="termDatesFormBody"></div>
    </div>
    <div class="settings-card">
      <div class="settings-card-title">Security PINs</div>
      <div class="field"><label>PIN Type</label><select id="pinType">
        <option value="fees">Fees</option><option value="teachers">Teachers</option>
        <option value="report_card_first_term">Report Card - First Term</option>
        <option value="report_card_second_term">Report Card - Second Term</option>
        <option value="report_card_third_term">Report Card - Third Term</option></select></div>
      <div class="field"><label>New PIN (4 digits)</label><input id="pinValue" maxlength="4"/></div>
      <button class="btn btn-green" onclick="savePin()">Set PIN</button>
    </div>
    <div class="settings-card">
      <div class="settings-card-title">Active Term</div>
      <div class="field"><select id="setActiveTerm">${state.terms.map(t => `<option value="${t.id}" ${t.is_active?"selected":""}>${t.name}</option>`).join("")}</select></div>
      <button class="btn btn-green" onclick="setActiveTermFn()">Set Active Term</button>
    </div>`;
  }
  html += `<div class="settings-card">
    <div class="settings-card-title">My Account</div>
    <div class="settings-row"><span>Name</span><span>${state.staff?.full_name || state.student?.full_name || "—"}</span></div>
    <div class="field"><label>New Password</label><input id="myNewPassword" type="password"/></div>
    <button class="btn btn-green" onclick="changeMyPassword()">Update Password</button>
  </div>`;
  el.innerHTML = html;
  if (state.role === "admin") loadTermDatesForm();
}
async function loadTermDatesForm() {
  const termId = document.getElementById("setDatesTerm").value;
  const term = state.terms.find(t => t.id === termId);
  document.getElementById("termDatesFormBody").innerHTML = `
    <div class="field"><label>Resumption Date</label><input id="setResumptionDate" type="date" value="${term?.resumption_date||""}"/></div>
    <div class="field"><label>Closing Date</label><input id="setClosingDate" type="date" value="${term?.closing_date||""}"/></div>
    <button class="btn btn-green" onclick="saveTermDates('${termId}')">Save Term Dates</button>`;
}
async function saveTermDates(termId) {
  const resumption_date = document.getElementById("setResumptionDate").value || null;
  const closing_date = document.getElementById("setClosingDate").value || null;
  const { error } = await sb.from("terms").update({ resumption_date, closing_date }).eq("id", termId);
  if (error) { alert(error.message); return; }
  alert("Term dates saved.");
  await loadReferenceData();
}
async function saveSchoolSettings() {
  const payload = {
    school_name: document.getElementById("setSchoolName").value,
    motto: document.getElementById("setMotto").value,
    address: document.getElementById("setAddress").value,
    current_session: document.getElementById("setSession").value,
    primary_website: document.getElementById("setPrimaryWebsite").value,
    secondary_website: document.getElementById("setSecondaryWebsite").value,
    school_logo_url: document.getElementById("setSchoolLogo").value,
    secondary_logo_url: document.getElementById("setSecondaryLogo").value,
    updated_at: new Date().toISOString(),
  };
  const { error } = await sb.from("school_settings").update(payload).eq("id", true);
  if (error) alert(error.message); else { alert("Saved."); Object.assign(state.schoolSettings, payload); }
}
async function savePin() {
  const pin_type = document.getElementById("pinType").value;
  const pin = document.getElementById("pinValue").value.trim();
  if (!/^\d{4}$/.test(pin)) { alert("PIN must be exactly 4 digits."); return; }
  const { data: hash } = await sb.rpc("hash_secret", { p_plain: pin });
  const { error } = await sb.from("security_pins").upsert({ pin_type, pin_hash: hash, updated_by: state.staff.id, updated_at: new Date().toISOString() }, { onConflict: "pin_type" });
  if (error) alert(error.message); else alert("PIN updated.");
}
async function setActiveTermFn() {
  const termId = document.getElementById("setActiveTerm").value;
  await sb.from("terms").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
  const { error } = await sb.from("terms").update({ is_active: true }).eq("id", termId);
  if (error) alert(error.message); else { alert("Active term updated."); await loadReferenceData(); }
}
async function changeMyPassword() {
  const password = document.getElementById("myNewPassword").value;
  if (!password || password.length < 4) { alert("Password must be at least 4 characters."); return; }
  const { data: hash } = await sb.rpc("hash_secret", { p_plain: password });
  if (state.staff) {
    await sb.from("staff").update({ password_hash: hash }).eq("id", state.staff.id);
    await provisionAuthAccount("staff", state.staff.id, state.staff.staff_code, password);
  } else if (state.student) {
    await sb.from("students").update({ password_hash: hash }).eq("id", state.student.id);
    await provisionAuthAccount("student", state.student.id, state.student.admission_no, password);
  }
  alert("Password updated. Use your new password next time you sign in.");
}
