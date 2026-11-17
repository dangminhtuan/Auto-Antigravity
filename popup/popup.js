/**
 * popup.js — Logic for AGY Auto-Approve popup UI
 */

const elEnabled     = document.getElementById("toggle-enabled");
const elDelaySafe   = document.getElementById("delay-safe");
const elDelayDang   = document.getElementById("delay-danger");
const elTargetOpt   = document.getElementById("target-option");
const elMultiPatrol = document.getElementById("toggle-multi-patrol");
const elReturnHome  = document.getElementById("toggle-return-home");
const elBtnSave     = document.getElementById("btn-save");
const elBtnStatus   = document.getElementById("btn-status-view");
const elBtnCopyDom  = document.getElementById("btn-copy-dom");
const elSaveMsg     = document.getElementById("save-msg");
const elStatusBar   = document.getElementById("status-bar");
const elStatusText  = document.getElementById("status-text");
const elLogList     = document.getElementById("log-list");
const elBtnClear    = document.getElementById("btn-clear-log");

// ── Load settings ───────────────────────────────────────────────────────────

async function loadSettings() {
  const settings = await chrome.storage.sync.get({
    enabled: true,
    delaySafe: 1,
    delayDangerous: 1,
    targetOption: 0, // 0 = Auto (Max - 1)
    multiProjectPatrol: true,
    autoReturnHome: true,
  });

  elEnabled.checked    = settings.enabled;
  elDelaySafe.value    = settings.delaySafe;
  elDelayDang.value    = settings.delayDangerous;
  if (elTargetOpt) elTargetOpt.value = String(settings.targetOption);
  if (elMultiPatrol) elMultiPatrol.checked = !!settings.multiProjectPatrol;
  if (elReturnHome) elReturnHome.checked = !!settings.autoReturnHome;

  updateStatusBar(settings.enabled);
}


// ── Update status bar appearance ────────────────────────────────────────────

function updateStatusBar(enabled) {
  if (enabled) {
    elStatusBar.className = "status-bar on";
    elStatusText.textContent = "✓ Dang hoat dong — tu dong phe duyet";
  } else {
    elStatusBar.className = "status-bar off";
    elStatusText.textContent = "✗ Da tat — khong tu dong phe duyet";
  }
}

// ── Toggle enabled/disabled ─────────────────────────────────────────────────

elEnabled.addEventListener("change", async () => {
  const enabled = elEnabled.checked;
  await chrome.storage.sync.set({ enabled });
  updateStatusBar(enabled);
});

// ── Save delay settings ─────────────────────────────────────────────────────

elBtnSave.addEventListener("click", async () => {
  const delaySafe          = Math.max(1, parseInt(elDelaySafe.value) || 1);
  const delayDangerous     = Math.max(1, parseInt(elDelayDang.value) || 1);
  const targetOption       = parseInt(elTargetOpt?.value) || 0;
  const multiProjectPatrol = elMultiPatrol ? elMultiPatrol.checked : true;
  const autoReturnHome     = elReturnHome ? elReturnHome.checked : true;

  // Sanitize display
  elDelaySafe.value = delaySafe;
  elDelayDang.value = delayDangerous;

  await chrome.storage.sync.set({ delaySafe, delayDangerous, targetOption, multiProjectPatrol, autoReturnHome });

  // Show save confirmation
  elSaveMsg.hidden = false;
  setTimeout(() => { elSaveMsg.hidden = true; }, 1500);
});

// ── Toggle Native Group By: Status View ─────────────────────────────────────

if (elBtnStatus) {
  elBtnStatus.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "AGY_ENABLE_STATUS_GROUP_V24" }).catch(() => {});
        elBtnStatus.textContent = "✓ Da bat!";
        setTimeout(() => { elBtnStatus.textContent = "📊 In-Progress"; }, 1500);
      }
    });
  });
}

// ── Copy Sidebar DOM for AI inspection ──────────────────────────────────────

if (elBtnCopyDom) {
  elBtnCopyDom.addEventListener("click", async () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "AGY_DUMP_SIDEBAR_REQ" }).catch(() => {});
        elBtnCopyDom.textContent = "✓ Da gui!";
        setTimeout(() => { elBtnCopyDom.textContent = "📋 DOM"; }, 1500);
      }
    });
  });
}


// ── Load & render log ───────────────────────────────────────────────────────

async function loadLog() {
  const { agy_log = [] } = await chrome.storage.local.get("agy_log");

  if (agy_log.length === 0) {
    elLogList.innerHTML = '<div class="log-empty">Chua co lich su nao.</div>';
    return;
  }

  elLogList.innerHTML = agy_log
    .slice(0, 20) // show last 20
    .map((entry) => {
      const time    = new Date(entry.time).toLocaleTimeString("vi-VN");
      const preview = (entry.preview || "").trim().replace(/\s+/g, " ");
      const cls     = entry.classification || "dangerous";
      const label   = cls === "safe" ? "✅ AN TOAN" : "⚠️ NGUY HIEM";
      return `
        <div class="log-item ${cls}">
          <div class="log-time">${time} — ${label} (${entry.delay}s)</div>
          <div class="log-preview" title="${preview.replace(/"/g, '&quot;')}">${preview || "(no preview)"}</div>
        </div>
      `;
    })
    .join("");
}

// ── Clear log ───────────────────────────────────────────────────────────────

elBtnClear.addEventListener("click", async () => {
  await chrome.storage.local.set({ agy_log: [] });
  loadLog();
});

// ── Init ────────────────────────────────────────────────────────────────────

loadSettings();
loadLog();
