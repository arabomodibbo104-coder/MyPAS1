// ============================================================
// DASHBOARD THEME — school-wide colour presets for the app chrome
// (sidebar, topbar, buttons, cards, badges).
//
// Deliberately separate from the report card + certificate colours,
// which stay tied to the school's official identity regardless of
// which dashboard theme is active — those are formal documents, not
// app UI, so they must never shift with a cosmetic preference.
//
// Each preset overrides only --dash-* variables, and covers the FULL
// current token set (including --dash-card-2 and the semantic
// warning/info/danger colours added in the UI redesign) so no part
// of the interface is left showing a leftover colour from another
// theme. Every pairing keeps light, high-contrast text on a dark
// surface.
// ============================================================

const DASHBOARD_THEMES = {
  emerald: {
    label: "Emerald Academy", swatch: "#3FAE68",
    vars: {
      "--dash-bg":"#0b1710", "--dash-surface":"#141f19", "--dash-card":"#1a2921", "--dash-card-2":"#20332a", "--dash-border":"#28392f",
      "--dash-green":"#22c55e", "--dash-green-2":"#16a34a", "--dash-green-soft":"rgba(34,197,94,0.13)", "--dash-green-glow":"rgba(34,197,94,0.30)",
      "--dash-text":"#eef7f0", "--dash-muted":"#84a892", "--dash-accent":"#4ade80",
      "--dash-danger":"#f87171", "--dash-danger-soft":"rgba(248,113,113,0.14)",
      "--dash-warning":"#fbbf24", "--dash-warning-soft":"rgba(251,191,36,0.14)",
      "--dash-info":"#60a5fa", "--dash-info-soft":"rgba(96,165,250,0.14)", "--dash-blue":"#3b82f6",
    },
  },
  navy: {
    label: "Navy Scholar", swatch: "#D4A937",
    vars: {
      "--dash-bg":"#0B1B33", "--dash-surface":"#12274A", "--dash-card":"#16305A", "--dash-card-2":"#1B3A69", "--dash-border":"#24406E",
      "--dash-green":"#D4A937", "--dash-green-2":"#B8902C", "--dash-green-soft":"rgba(212,169,55,0.14)", "--dash-green-glow":"rgba(212,169,55,0.28)",
      "--dash-text":"#EAF0FB", "--dash-muted":"#8CA0C4", "--dash-accent":"#F0CB6A",
      "--dash-danger":"#E5484D", "--dash-danger-soft":"rgba(229,72,77,0.14)",
      "--dash-warning":"#E8A33D", "--dash-warning-soft":"rgba(232,163,61,0.14)",
      "--dash-info":"#5B8DEF", "--dash-info-soft":"rgba(91,141,239,0.14)", "--dash-blue":"#5B8DEF",
    },
  },
  chocolate: {
    label: "Chocolate & Gold", swatch: "#C9973F",
    vars: {
      "--dash-bg":"#241408", "--dash-surface":"#2E1B10", "--dash-card":"#38220F", "--dash-card-2":"#422917", "--dash-border":"#4A2E1E",
      "--dash-green":"#C9973F", "--dash-green-2":"#A87C2E", "--dash-green-soft":"rgba(201,151,63,0.13)", "--dash-green-glow":"rgba(201,151,63,0.28)",
      "--dash-text":"#F3E7D3", "--dash-muted":"#A98A6D", "--dash-accent":"#E8C77E",
      "--dash-danger":"#E06A4A", "--dash-danger-soft":"rgba(224,106,74,0.14)",
      "--dash-warning":"#E0AF5C", "--dash-warning-soft":"rgba(224,175,92,0.14)",
      "--dash-info":"#C9A96E", "--dash-info-soft":"rgba(201,169,110,0.14)", "--dash-blue":"#A9722E",
    },
  },
  burgundy: {
    label: "Burgundy Prestige", swatch: "#E0AF5C",
    vars: {
      "--dash-bg":"#210D10", "--dash-surface":"#2E1216", "--dash-card":"#3A171C", "--dash-card-2":"#471D23", "--dash-border":"#552126",
      "--dash-green":"#C9973F", "--dash-green-2":"#A87C2E", "--dash-green-soft":"rgba(201,151,63,0.14)", "--dash-green-glow":"rgba(201,151,63,0.28)",
      "--dash-text":"#F7E9E7", "--dash-muted":"#C09B9B", "--dash-accent":"#E0AF5C",
      "--dash-danger":"#FF6B6B", "--dash-danger-soft":"rgba(255,107,107,0.14)",
      "--dash-warning":"#E8B563", "--dash-warning-soft":"rgba(232,181,99,0.14)",
      "--dash-info":"#7CA6D8", "--dash-info-soft":"rgba(124,166,216,0.14)", "--dash-blue":"#7CA6D8",
    },
  },
  slate: {
    label: "Slate Professional", swatch: "#2DD4BF",
    vars: {
      "--dash-bg":"#111827", "--dash-surface":"#1A2436", "--dash-card":"#202B40", "--dash-card-2":"#27344C", "--dash-border":"#2E3B52",
      "--dash-green":"#2DD4BF", "--dash-green-2":"#14B8A6", "--dash-green-soft":"rgba(45,212,191,0.14)", "--dash-green-glow":"rgba(45,212,191,0.28)",
      "--dash-text":"#EDF1F7", "--dash-muted":"#8D9BB3", "--dash-accent":"#5EEAD4",
      "--dash-danger":"#F87171", "--dash-danger-soft":"rgba(248,113,113,0.14)",
      "--dash-warning":"#FBBF24", "--dash-warning-soft":"rgba(251,191,36,0.14)",
      "--dash-info":"#60A5FA", "--dash-info-soft":"rgba(96,165,250,0.14)", "--dash-blue":"#60A5FA",
    },
  },
  white: {
    label: "Pure White", swatch: "#FFFFFF",
    vars: {
      "--dash-bg":"#FFFFFF", "--dash-surface":"#F7F8FA", "--dash-card":"#FFFFFF", "--dash-card-2":"#F1F3F5", "--dash-border":"#E2E5E9",
      "--dash-green":"#16A34A", "--dash-green-2":"#15803D", "--dash-green-soft":"rgba(22,163,74,0.10)", "--dash-green-glow":"rgba(22,163,74,0.20)",
      "--dash-text":"#1A1F26", "--dash-muted":"#6B7280", "--dash-accent":"#16A34A",
      "--dash-danger":"#DC2626", "--dash-danger-soft":"rgba(220,38,38,0.10)",
      "--dash-warning":"#D97706", "--dash-warning-soft":"rgba(217,119,6,0.10)",
      "--dash-info":"#2563EB", "--dash-info-soft":"rgba(37,99,235,0.10)", "--dash-blue":"#2563EB",
    },
  },
};

function applyDashboardTheme(name) {
  const theme = DASHBOARD_THEMES[name] || DASHBOARD_THEMES.emerald;
  const root = document.documentElement.style;
  Object.entries(theme.vars).forEach(([k, v]) => root.setProperty(k, v));
  localStorage.setItem("pariya-dashboard-theme", name);
}

// Apply the last-known theme immediately at load (before school
// settings finish fetching) so there's no flash of the wrong colours
// on repeat visits — mirrors the existing light/dark initTheme().
// Skipped in light mode, where the light palette governs instead.
(function initDashboardTheme() {
  const cached = localStorage.getItem("pariya-dashboard-theme");
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  if (cached && DASHBOARD_THEMES[cached] && !isLight) applyDashboardTheme(cached);
})();

function renderDashboardThemePicker() {
  const current = state.schoolSettings.dashboard_theme || "emerald";
  return `
    <div class="settings-card" id="set-theme">
      <div class="settings-card-title">Dashboard Theme</div>
      <p style="font-size:12px;color:var(--dash-muted);">Changes the app's colours for everyone at this school — sidebar, buttons, cards, badges. Report cards and certificates keep the school's official colours and are not affected. Themes apply to dark mode; light mode uses its own palette.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-top:12px;">
        ${Object.entries(DASHBOARD_THEMES).map(([key, t]) => `
        <div onclick="previewDashboardTheme('${key}')" style="cursor:pointer;border:2px solid ${key===current?"var(--dash-green)":"var(--dash-border)"};border-radius:10px;padding:10px;text-align:center;transition:var(--transition-fast);" id="themeSwatch-${key}">
          <div style="width:100%;height:36px;border-radius:6px;background:${t.swatch};margin-bottom:8px;"></div>
          <div style="font-size:12px;font-weight:700;">${t.label}</div>
          ${key===current ? `<div class="badge badge-success" style="margin-top:6px;">Active</div>` : ""}
        </div>`).join("")}
      </div>
      <button class="btn btn-green" style="margin-top:14px;" onclick="saveDashboardTheme()" id="saveThemeBtn" disabled>Save Theme</button>
      <button class="btn" style="margin-top:14px;" onclick="cancelDashboardThemePreview()" id="cancelThemeBtn" disabled>Cancel</button>
    </div>`;
}

let _pendingTheme = null;
function previewDashboardTheme(key) {
  _pendingTheme = key;
  applyDashboardTheme(key); // instant preview
  document.querySelectorAll("[id^='themeSwatch-']").forEach(el => el.style.borderColor = "var(--dash-border)");
  const sw = document.getElementById(`themeSwatch-${key}`);
  if (sw) sw.style.borderColor = "var(--dash-green)";
  const saveBtn = document.getElementById("saveThemeBtn");
  const cancelBtn = document.getElementById("cancelThemeBtn");
  if (saveBtn) saveBtn.disabled = false;
  if (cancelBtn) cancelBtn.disabled = false;
}

// Reverts an unsaved preview back to the school's saved theme, so
// someone browsing options isn't stuck looking at colours they
// didn't choose.
function cancelDashboardThemePreview() {
  const saved = state.schoolSettings.dashboard_theme || "emerald";
  _pendingTheme = null;
  applyDashboardTheme(saved);
  if (typeof renderSettings === "function") renderSettings();
}

async function saveDashboardTheme() {
  if (!_pendingTheme) return;
  const { error } = await sb.from("school_settings").update({ dashboard_theme: _pendingTheme }).eq("id", true);
  if (error) { alert(error.message); return; }
  state.schoolSettings.dashboard_theme = _pendingTheme;
  _pendingTheme = null;
  if (typeof showToast === "function") showToast("Theme saved — now applies for everyone at the school.");
  if (typeof renderSettings === "function") renderSettings();
}
