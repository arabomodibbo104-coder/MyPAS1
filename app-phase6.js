// ============================================================
// FINANCIAL ANALYTICS — school-wide income (fees) vs expenditure
// (staff salaries) vs net balance, for a given term.
// ============================================================
async function renderFinancialAnalytics() {
  const el = document.getElementById("panel-financialAnalytics");
  el.innerHTML = `
    <div class="field"><label>Term</label><select id="finTermSelect" onchange="loadFinancialAnalytics()">
      ${state.terms.map(t => `<option value="${t.id}" ${t.id===state.currentTermId?"selected":""}>${t.name}</option>`).join("")}</select></div>
    <div id="finBody">Loading…</div>
    <div style="background:#fff;border-radius:10px;padding:14px;margin-top:16px;max-width:700px;">
      <canvas id="finChart" height="260"></canvas>
    </div>
    <div style="background:#fff;border-radius:10px;padding:14px;margin-top:16px;max-width:500px;">
      <canvas id="finCategoryChart" height="260"></canvas>
    </div>
    <div class="no-print" id="finExportHost" style="margin-top:12px;"></div>`;
  await loadFinancialAnalytics();
}

async function loadFinancialAnalytics() {
  const termId = document.getElementById("finTermSelect").value;
  const term = state.terms.find(t => t.id === termId);
  const body = document.getElementById("finBody");
  body.innerHTML = "Loading…";

  // ---------- Income side: fees ----------
  const [{ data: structure }, { data: students }, { data: payments }] = await Promise.all([
    sb.from("fee_structure").select("category, expected_amount"),
    sb.from("students").select("id, class_id, classes(category)").eq("is_active", true),
    sb.from("fee_payments").select("student_id, amount_paid, is_paid_override").eq("term_id", termId),
  ]);
  const expectedByCategory = {}; (structure||[]).forEach(s => expectedByCategory[s.category] = s.expected_amount);
  const payMap = {}; (payments||[]).forEach(p => payMap[p.student_id] = p);

  const categoryTotals = { nursery: { expected: 0, collected: 0 }, primary: { expected: 0, collected: 0 }, jss: { expected: 0, collected: 0 }, ss: { expected: 0, collected: 0 } };
  let totalCollected = 0, totalExpected = 0, totalOutstanding = 0, unassignedCount = 0;
  (students||[]).forEach(stu => {
    const category = stu.classes?.category;
    if (!stu.class_id || !category) { unassignedCount++; return; }
    const expected = expectedByCategory[category] || 0;
    const pay = payMap[stu.id];
    const paidAmt = pay?.amount_paid || 0;
    const isPaid = pay?.is_paid_override === true ? true : pay?.is_paid_override === false ? false : paidAmt >= expected;
    totalCollected += paidAmt;
    totalExpected += expected;
    if (!isPaid) totalOutstanding += Math.max(expected - paidAmt, 0);
    categoryTotals[category].expected += expected;
    categoryTotals[category].collected += paidAmt;
  });

  // ---------- Expenditure side: staff salaries ----------
  const { data: staff } = await sb.from("staff").select("full_name, monthly_salary, salary_status").eq("is_active", true);
  let totalSalaryExpenditure = 0, totalSalaryBudget = 0;
  const staffBreakdown = [];
  (staff||[]).forEach(s => {
    const termStatus = (s.salary_status || {})[termId] || {};
    const monthsPaid = ["month1","month2","month3"].filter(m => termStatus[m] === "Paid").length;
    const paidAmount = (s.monthly_salary || 0) * monthsPaid;
    const budgetAmount = (s.monthly_salary || 0) * 3;
    totalSalaryExpenditure += paidAmount;
    totalSalaryBudget += budgetAmount;
    if (s.monthly_salary > 0) staffBreakdown.push({ name: s.full_name, monthsPaid, paidAmount, budgetAmount });
  });

  const netBalance = totalCollected - totalSalaryExpenditure;

  body.innerHTML = `<div class="card-grid">
    ${statCard("fa-money-bill-trend-up", "₦" + totalCollected.toLocaleString(), "Total Fees Collected")}
    ${statCard("fa-triangle-exclamation", "₦" + totalOutstanding.toLocaleString(), "Fees Outstanding")}
    ${statCard("fa-money-check-dollar", "₦" + totalSalaryExpenditure.toLocaleString(), "Salaries Paid Out")}
    ${statCard(netBalance >= 0 ? "fa-arrow-trend-up" : "fa-arrow-trend-down", "₦" + netBalance.toLocaleString(), "Net Balance (Fees − Salaries)")}
  </div>
  <div class="settings-card" style="margin-top:16px;">
    <div class="settings-card-title">Summary — ${escapeHtml(term?.name||"")}</div>
    <div id="finSummaryTable"><table class="data-table" id="finSummaryTableEl">
      <thead><tr><th></th><th>Amount</th></tr></thead>
      <tbody>
        <tr><td class="name-cell">Total Fees Expected</td><td>₦${totalExpected.toLocaleString()}</td></tr>
        <tr><td class="name-cell">Total Fees Collected</td><td>₦${totalCollected.toLocaleString()}</td></tr>
        <tr><td class="name-cell">Total Fees Outstanding</td><td>₦${totalOutstanding.toLocaleString()}</td></tr>
        <tr><td class="name-cell">Total Salary Budget (3 months, all staff)</td><td>₦${totalSalaryBudget.toLocaleString()}</td></tr>
        <tr><td class="name-cell">Total Salaries Actually Paid Out</td><td>₦${totalSalaryExpenditure.toLocaleString()}</td></tr>
        <tr><td class="name-cell">Salary Budget Still Owing to Staff</td><td>₦${(totalSalaryBudget-totalSalaryExpenditure).toLocaleString()}</td></tr>
        <tr style="font-weight:900;"><td class="name-cell">Net Balance (Collected − Salaries Paid)</td><td style="color:${netBalance>=0?"#16a34a":"#dc2626"};">₦${netBalance.toLocaleString()}</td></tr>
      </tbody>
    </table></div>
    ${unassignedCount > 0 ? `<p style="font-size:12px;color:var(--dash-muted);margin-top:10px;">${unassignedCount} active student(s) have no class assigned and are excluded from these totals — see Unassigned Students.</p>` : ""}
  </div>
  <div class="settings-card">
    <div class="settings-card-title">Revenue by Section</div>
    <table class="data-table" id="finCategoryTableEl">
      <thead><tr><th>Section</th><th>Expected</th><th>Collected</th><th>Outstanding</th></tr></thead>
      <tbody>
        ${["nursery","primary","jss","ss"].map(cat => {
          const c = categoryTotals[cat];
          return `<tr><td class="name-cell">${cat.toUpperCase()}</td><td>₦${c.expected.toLocaleString()}</td><td>₦${c.collected.toLocaleString()}</td><td>₦${Math.max(c.expected-c.collected,0).toLocaleString()}</td></tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>`;

  document.getElementById("finExportHost").innerHTML = `
    <button class="btn" onclick="downloadFinancialReport('${termId}')"><i class="fa-solid fa-file-pdf"></i> Download PDF</button>`;

  renderFinancialCharts(totalCollected, totalSalaryExpenditure, netBalance, categoryTotals);
}

let finChartInstance = null, finCategoryChartInstance = null;
function renderFinancialCharts(collected, salaries, net, categoryTotals) {
  const canvas1 = document.getElementById("finChart");
  const canvas2 = document.getElementById("finCategoryChart");
  if (typeof Chart === "undefined" || !canvas1 || !canvas2) return;
  if (finChartInstance) { finChartInstance.destroy(); finChartInstance = null; }
  if (finCategoryChartInstance) { finCategoryChartInstance.destroy(); finCategoryChartInstance = null; }

  finChartInstance = new Chart(canvas1.getContext("2d"), {
    type: "bar",
    data: {
      labels: ["Fees Collected", "Salaries Paid", "Net Balance"],
      datasets: [{ label: "₦", data: [collected, salaries, net], backgroundColor: ["#228B2A", "#ef4444", net >= 0 ? "#3b82f6" : "#f59e0b"] }],
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
  });

  const cats = ["nursery","primary","jss","ss"];
  finCategoryChartInstance = new Chart(canvas2.getContext("2d"), {
    type: "pie",
    data: {
      labels: cats.map(c => c.toUpperCase()),
      datasets: [{ data: cats.map(c => categoryTotals[c].collected), backgroundColor: ["#22c55e","#4ade80","#3b82f6","#818cf8"] }],
    },
    options: { responsive: true, plugins: { title: { display: true, text: "Fees Collected by Section" } } },
  });
}

async function downloadFinancialReport(termId) {
  const term = state.terms.find(t => t.id === termId);
  const summaryHtml = document.getElementById("finSummaryTableEl")?.outerHTML || "";
  const categoryHtml = document.getElementById("finCategoryTableEl")?.outerHTML || "";
  const bodyHtml = `<h3 style="font-size:13px;">Financial Summary</h3>${summaryHtml}
    <h3 style="font-size:13px;margin-top:16px;">Revenue by Section</h3>${categoryHtml}`;
  await downloadBrandedPdf(
    "Financial Analytics Report",
    `${term?.name || ""} — ${state.schoolSettings.current_session || ""}`,
    bodyHtml,
    `Financial_Report_${(term?.name||"").replace(/\s/g,"_")}.pdf`
  );
}
