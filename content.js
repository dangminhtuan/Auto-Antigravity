/**
 * content.js — AGY Auto-Approve v2.0.0 (Handoff, Smart Search & Extension Bridge)
 *
 * Updates in v2.0.0:
 * 1. Handoff 1-Click Remote <-> Local + Result Return.
 * 2. Smart Search overlay (Alt+K / Dock button) parallel to native Search.
 * 3. Fixed Idle Yellow Background false positives while AI is running.
 * 4. Improved Multi-Project Patrol Home ID fallback (Desktop & Mobile).
 */

(() => {
  const AGY_VERSION = "2.0.2";
  const HANDOFF_CORE = typeof window !== "undefined" ? window.AGY_HANDOFF_CORE : null;
  let hostTabMeta = { url: window.self === window.top ? window.location.href : "", title: window.self === window.top ? document.title : "" };
  // ─── Guard: Run on Antigravity / AI Studio top frames and ALL non-noise Antigravity/remote subframes ─
  const currentUrl = (window.location.href || "").toLowerCase();
  const isTop = window.self === window.top;

  const isNoiseGoogleUrl =
    currentUrl.includes("accounts.google.") ||
    currentUrl.includes("ogs.google.") ||
    currentUrl.includes("apis.google.") ||
    currentUrl.includes("recaptcha") ||
    currentUrl.includes("www.google.com/") ||
    currentUrl.includes("lh3.googleusercontent.");

  if (isNoiseGoogleUrl) {
    return;
  }

  let ancestorMatch = false;
  try {
    const origins = Array.from(window.location.ancestorOrigins || []).map((o) => String(o).toLowerCase());
    ancestorMatch = origins.some(
      (o) => o.includes("antigravity.google") || o.includes("aistudio.google") || o.includes("usercontent.goog")
    );
  } catch (e) {}

  const isAntigravityTop =
    currentUrl.includes("antigravity.google") ||
    currentUrl.includes("aistudio.google") ||
    currentUrl.includes("antigravity.static.usercontent.goog");

  const isAntigravitySubframe =
    !isTop &&
    (currentUrl.includes("antigravity.static.usercontent.goog") ||
      currentUrl.includes("usercontent.goog") ||
      currentUrl.includes("googleusercontent.com") ||
      currentUrl.includes("antigravity.google") ||
      currentUrl.includes("aistudio.google") ||
      currentUrl.includes("vscode-webview.net") ||
      ((currentUrl.startsWith("about:") || currentUrl.startsWith("blob:")) && ancestorMatch) ||
      ancestorMatch);

  if (isTop && !isAntigravityTop) {
    return;
  }
  if (!isTop && !isAntigravitySubframe) {
    return;
  }

  window.__AGY_LAST_CHILD_IFRAME_AT = window.__AGY_LAST_CHILD_IFRAME_AT || 0;

  function isChildChatIframeAlive() {
    return Date.now() - Number(window.__AGY_LAST_CHILD_IFRAME_AT || 0) < 4800;
  }

  function hasChatDomInCurrentDoc() {
    try {
      if (
        document.querySelector(
          '[id*="agentSidePanelInputBox" i], [data-lexical-editor="true"], [data-testid="conversation-row-sidebar"], [data-testid="conversation-list-sidebar"], button[aria-label*="Send message" i], button[aria-label*="Gửi tin nhắn" i], [data-agy-prompt-hidden="1"]'
        )
      ) {
        return true;
      }
      if (
        document.querySelector(".overflow-y-auto") &&
        document.querySelector('[role="combobox"][contenteditable], [contenteditable="true"], [contenteditable="plaintext-only"], textarea')
      ) {
        return true;
      }
      if (typeof findApprovalDialog === "function" && findApprovalDialog()) {
        return true;
      }
    } catch (e) {}
    return false;
  }

  function isChatOwnerActive() {
    if (!isCurrentInstance()) return false;
    if (!isTop) {
      return currentUrl.includes("antigravity.static.usercontent.goog") || hasChatDomInCurrentDoc();
    }
    return !isChildChatIframeAlive() && hasChatDomInCurrentDoc();
  }

  // ─── Cross-Isolated-World Zero-F5 Teardown ──────────────────────────────────
  const INSTANCE_ID = `agy_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  try {
    document.dispatchEvent(new CustomEvent("AGY_DESTROY_OLD_INSTANCES"));
    document.documentElement.setAttribute("data-agy-instance", INSTANCE_ID);
  } catch (e) {}

  if (window.__AGY_CLEANUP) {
    try { window.__AGY_CLEANUP(); } catch (e) {}
  }

  const _listeners = [];
  function addSafeListener(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    _listeners.push({ target, type, handler, options });
  }

  function isCurrentInstance() {
    const active = document.documentElement.getAttribute("data-agy-instance");
    return !active || active === INSTANCE_ID;
  }

  window.__AGY_CLEANUP = () => {
    if (window.__AGY_INTERVAL) clearInterval(window.__AGY_INTERVAL);
    if (window.__AGY_COUNTDOWN) clearInterval(window.__AGY_COUNTDOWN);
    if (window.__AGY_BRIDGE_INTERVAL) clearInterval(window.__AGY_BRIDGE_INTERVAL);
    if (window.__AGY_PATROL_INTERVAL) clearInterval(window.__AGY_PATROL_INTERVAL);
    if (window.__AGY_TOP_LED_INTERVAL) clearInterval(window.__AGY_TOP_LED_INTERVAL);
    if (window.__AGY_TOP_BRIDGE_INTERVAL) clearInterval(window.__AGY_TOP_BRIDGE_INTERVAL);
    if (window.__AGY_TOP_TICK_INTERVAL) clearInterval(window.__AGY_TOP_TICK_INTERVAL);
    if (window.__AGY_IDLE_BG_INTERVAL) clearInterval(window.__AGY_IDLE_BG_INTERVAL);
    if (window.__AGY_IMAGE_INTERVAL) clearInterval(window.__AGY_IMAGE_INTERVAL);
    if (window.__AGY_LIFT_INTERVAL) clearInterval(window.__AGY_LIFT_INTERVAL);
    if (window.__AGY_HANDOFF_INTERVAL) clearInterval(window.__AGY_HANDOFF_INTERVAL);
    if (window.__AGY_CATALOG_INTERVAL) clearInterval(window.__AGY_CATALOG_INTERVAL);
    if (window.__AGY_HANDOFF_DEBOUNCE) clearTimeout(window.__AGY_HANDOFF_DEBOUNCE);
    if (window.__AGY_OBSERVER) window.__AGY_OBSERVER.disconnect();
    try { delete window.__AGY_CHECK_IDLE_BG; } catch (e) {}
    try { delete window.__AGY_MARK_RUNNING; } catch (e) {}
    try { delete window.__AGY_BEFORE_SCAN_REVEAL; } catch (e) {}
    try { delete window.__AGY_AFTER_APPROVAL_RESTORE; } catch (e) {}
    try { delete window.__AGY_LOCAL_CHAT_ACTION; } catch (e) {}
    try { delete window.__AGY_EXEC_BRIDGE_CMD_LOCAL; } catch (e) {}
    try { delete window.__AGY_SCAN_HANDOFFS; } catch (e) {}
    try { delete window.__AGY_TOGGLE_SMART_SEARCH; } catch (e) {}
    try { delete window.__AGY_REFRESH_SMART_SEARCH; } catch (e) {}
    try { delete window.__AGY_SWEEP_UI_PROGRESS; } catch (e) {}
    try {
      document.body?.classList.remove("agy-idle-light", "agy-idle-dark");
      document.querySelectorAll("[data-agy-idle-pane], [data-agy-idle-scroller], [data-agy-idle-footer], [data-agy-idle-card], [data-agy-idle-body]").forEach((el) => {
        el.removeAttribute("data-agy-idle-pane");
        el.removeAttribute("data-agy-idle-scroller");
        el.removeAttribute("data-agy-idle-footer");
        el.removeAttribute("data-agy-idle-card");
        el.removeAttribute("data-agy-idle-body");
      });
      document.querySelectorAll('[data-agy-ui="1"]').forEach((el) => el.remove());
    } catch (e) {}
    const idsToRemove = [
      "agy-control-container",
      "agy-toggle-prompt-btn",
      "agy-debug-bar",
      "agy-dock-mini-btn",
      "agy-mobile-enhancements",
      "agy-idle-bg-style",
      "agy-big-close-image-btn",
      "agy-top-close-image-btn",
      "agy-proof-border",
      "agy-proof-banner",
      "agy-smart-search-overlay",
      "agy-smart-search-style",
      "agy-handoff-style",
    ];
    for (const id of idsToRemove) {
      const el = document.getElementById(id);
      if (el) el.remove();
    }
    for (const l of _listeners) {
      l.target.removeEventListener(l.type, l.handler, l.options);
    }
  };

  addSafeListener(document, "AGY_DESTROY_OLD_INSTANCES", () => {
    if (window.__AGY_CLEANUP) {
      try { window.__AGY_CLEANUP(); } catch (e) {}
    }
  });

  const DEFAULT_SETTINGS = {
    enabled: true,
    delaySafe: 1,
    delayDangerous: 1,
    targetOption: 0, // 0 = Auto (Max - 1)
    multiProjectPatrol: true,
    autoReturnHome: true,
    idleYellowBg: true,
  };

  let countdownTimer   = null;
  let countdownOverlay = null;
  let isProcessing     = false;
  let lastProcessedKey = "";

  // ─── Storage ──────────────────────────────────────────────────────────────────
  function getSettings() {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(DEFAULT_SETTINGS, (res) => resolve(res || DEFAULT_SETTINGS));
      } catch {
        resolve(DEFAULT_SETTINGS);
      }
    });
  }

  function logEvent(entry) {
    try {
      chrome.storage.local.get({ agy_log: [] }, ({ agy_log }) => {
        agy_log.unshift(entry);
        if (agy_log.length > 50) agy_log = agy_log.slice(0, 50);
        chrome.storage.local.set({ agy_log });
      });
    } catch {}
  }

  // ─── Notification Bar & Control Stack (Zero Overlap Flexbox) ─────────────────
  let hideBarTimer = null;

  function getControlContainer() {
    let container = document.getElementById("agy-control-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "agy-control-container";
      container.setAttribute("data-agy-ui", "1");
      container.style.cssText = `
        position: fixed !important;
        bottom: 8px !important;
        left: 50% !important;
        right: auto !important;
        top: auto !important;
        transform: translateX(-50%);
        z-index: 2147483647;
        display: flex; flex-direction: column; align-items: center;
        gap: 6px;
        pointer-events: none;
      `;
      (document.body || document.documentElement).appendChild(container);
    }
    return container;
  }

  function hideBar() {
    const bar = document.getElementById("agy-debug-bar");
    if (bar) {
      bar.style.opacity = "0";
      bar.style.transform = "translateY(6px)";
      setTimeout(() => {
        if (bar.style.opacity === "0") bar.style.display = "none";
      }, 250);
    }
  }

  function hideControlContainer() {
    const container = document.getElementById("agy-control-container");
    if (container) {
      container.style.opacity = "0";
      container.style.pointerEvents = "none";
      container.style.transform = "translate(-50%, 12px)";
      container.style.transition = "opacity 0.25s ease, transform 0.25s ease";
    }
  }

  function restoreControlContainer() {
    const container = document.getElementById("agy-control-container");
    if (container) {
      container.style.opacity = "1";
      container.style.pointerEvents = "none"; // container itself is pointer-events none
      container.style.transform = "translate(-50%, 0)";
      container.style.transition = "opacity 0.25s ease, transform 0.25s ease";
    }
  }

  function updateBar(htmlContent, colorHint = "info", autoHideMs = 0) {
    // Always enforce a safety auto-hide timeout (default 3500ms) so the bar NEVER gets stuck on screen
    const effectiveHideMs = autoHideMs > 0 ? autoHideMs : 3500;

    // If we are in an iframe, relay the status to the top frame
    if (!isTop) {
      try {
        window.top.postMessage(
          { type: "AGY_UPDATE_BAR_V20", htmlContent, colorHint, autoHideMs: effectiveHideMs },
          "*"
        );
      } catch (e) {}
      return;
    }

    const container = getControlContainer();
    let bar = document.getElementById("agy-debug-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "agy-debug-bar";
      bar.style.cssText = `
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 11.5px; font-weight: 500;
        padding: 5px 12px; border-radius: 18px;
        max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        display: none; align-items: center; gap: 6px;
        pointer-events: none;
        opacity: 0; transform: translateY(6px);
        transition: opacity 0.25s ease, transform 0.25s ease;
        background: rgba(15, 23, 42, 0.7);
        backdrop-filter: blur(16px) saturate(160%);
        -webkit-backdrop-filter: blur(16px) saturate(160%);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 0.95);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
      `;
      container.insertBefore(bar, container.firstChild);
    }

    clearTimeout(hideBarTimer);

    const tints = {
      success: "rgba(52, 211, 153, 0.7)",
      warning: "rgba(251, 191, 36, 0.7)",
      info:    "rgba(56, 189, 248, 0.7)",
    };
    bar.style.borderLeftColor = tints[colorHint] || tints.info;
    bar.style.borderLeftWidth = "3px";

    const newHTML = `⚡ ${htmlContent}`;
    if (bar.innerHTML !== newHTML) {
      bar.innerHTML = newHTML;
    }

    bar.style.display = "flex";
    requestAnimationFrame(() => {
      bar.style.opacity = "0.95";
      bar.style.transform = "translateY(0)";
    });

    hideBarTimer = setTimeout(() => {
      hideBar();
    }, effectiveHideMs);
  }

  // Top frame listens for messages from the chat iframe and displays Proof-of-Control UI
  if (isTop) {
    let lastIframeSeenAt = 0;
    let lastBridgeSeenAt = 0;
    let lastPromptAckAt = 0;
    let latestTelemetry = {};
    let proofBannerTimer = null;

    function buildTopDiagnosticsReport() {
      const iframesInfo = Array.from(document.querySelectorAll("iframe")).map((ifr, idx) => {
        const r = ifr.getBoundingClientRect();
        let sameOriginReadable = false;
        try {
          sameOriginReadable = !!(ifr.contentDocument && ifr.contentDocument.body);
        } catch (e) {}
        return {
          index: idx,
          src: ifr.getAttribute("src") || "(no src)",
          id: ifr.id || "",
          name: ifr.name || "",
          title: ifr.title || "",
          rect: { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) },
          sameOriginReadable,
        };
      });
      const inputsInfo = queryDeep('[role="combobox"], [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"], textarea, input')
        .filter((el) => !el.closest('[id^="agy-"]'))
        .slice(0, 20)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            tag: el.tagName,
            id: el.id || "",
            role: el.getAttribute("role") || "",
            ce: el.getAttribute("contenteditable") || "",
            placeholder: el.getAttribute("placeholder") || el.getAttribute("aria-label") || "",
            rect: { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) },
          };
        });
      const payload = {
        capturedAt: new Date().toISOString(),
        extensionVersion: AGY_VERSION,
        frame: "top-diagnostics",
        url: window.location.href,
        title: document.title,
        hasLocalChatDom: hasChatDomInCurrentDoc(),
        childIframeAlive: isChildChatIframeAlive(),
        iframes: iframesInfo,
        inputsFound: inputsInfo,
        bodyTextSample: (document.body?.innerText || "").slice(0, 800),
      };
      return "=== AGY TOP FRAME DIAGNOSTICS ===\n" + JSON.stringify(payload, null, 2);
    }

    async function runTopFallbackDiagnostics(bridgeCmdId = null) {
      const report = buildTopDiagnosticsReport();
      const copied = await copyTextInTopFrame(report);
      try {
        chrome.runtime.sendMessage({
          type: "AGY_BRIDGE_RESULT",
          payload: {
            id: bridgeCmdId || null,
            cmd: "DUMP_DOM",
            ok: true,
            frame: "top",
            extensionVersion: AGY_VERSION,
            url: window.location.href,
            domReport: report,
          },
        });
      } catch (e) {}
      updateBar(
        copied ? "✓ Đã copy thông tin Frame & DOM (Top) vào Clipboard & Bridge!" : "✓ Đã gửi thông tin Frame & DOM (Top) về Bridge!",
        "success",
        3000
      );
    }

    function updateBridgeLedUi() {
      const led = document.getElementById("agy-bridge-led");
      const mini = document.getElementById("agy-dock-mini-btn");
      const now = Date.now();
      const iframeOk = now - lastIframeSeenAt < 4800;
      const localOk = !iframeOk && hasChatDomInCurrentDoc();
      const chatOk = iframeOk || localOk;
      const bridgeOk = now - lastBridgeSeenAt < 5500;

      let dotColor = "#ef4444"; // Red: no chat frame detected
      let glow = "rgba(239, 68, 68, 0.7)";
      let title = "🔴 Chưa thấy Iframe chat hoặc ô chat trực tiếp (Bấm để kiểm tra)";

      if (bridgeOk && chatOk) {
        dotColor = "#22c55e"; // Green: Full 2-Way AI Bridge
        glow = "rgba(34, 197, 94, 0.85)";
        title = iframeOk
          ? "🟢 AI Bridge ĐÃ NẮM QUYỀN 100% (PC Bridge + Iframe OK) — Bấm để test!"
          : "🟢 AI Bridge ĐÃ NẮM QUYỀN 100% (PC Bridge + Trang Remote trực tiếp) — Bấm để test!";
      } else if (chatOk) {
        dotColor = "#38bdf8"; // Cyan/Blue: Active Standalone
        glow = "rgba(56, 189, 248, 0.75)";
        title = iframeOk
          ? "🔵 Extension ĐANG NẮM QUYỀN Iframe (Chế độ độc lập) — Bấm để test!"
          : "🔵 Extension ĐANG ĐIỀU KHIỂN TRỰC TIẾP trang Remote — Bấm để test!";
      } else if (bridgeOk) {
        dotColor = "#f59e0b"; // Amber: Bridge ok, waiting for chat DOM
        glow = "rgba(245, 158, 11, 0.75)";
        title = "🟡 Bridge PC Online, đang chờ khung chat — Bấm để test!";
      }

      if (led) {
        led.title = title;
        const dot = led.querySelector("span");
        if (dot) {
          dot.style.background = dotColor;
          dot.style.boxShadow = `0 0 8px ${glow}`;
        }
        led.style.borderColor = glow;
      }
      if (mini) {
        mini.style.borderColor = glow;
      }
    }

    function showProofOfControlBanner(info = {}) {
      const now = Date.now();
      const iframeOk = info.iframeOk !== undefined ? !!info.iframeOk : (now - lastIframeSeenAt < 4800);
      const localOk = !iframeOk && (info.localChatOk !== undefined ? !!info.localChatOk : hasChatDomInCurrentDoc());
      const chatOk = iframeOk || localOk;
      const bridgeOk = info.bridgeOnline !== undefined ? !!info.bridgeOnline : (now - lastBridgeSeenAt < 5500);

      // 1. Full-screen glowing emerald pulse border
      let borderEl = document.getElementById("agy-proof-border");
      if (!borderEl) {
        borderEl = document.createElement("div");
        borderEl.id = "agy-proof-border";
        (document.body || document.documentElement).appendChild(borderEl);
      }
      const accent = bridgeOk ? "#10b981" : (chatOk ? "#38bdf8" : "#f59e0b");
      borderEl.style.cssText = `
        position: fixed !important; inset: 0 !important;
        pointer-events: none !important; z-index: 2147483647 !important;
        border: 4px solid ${accent} !important;
        box-shadow: inset 0 0 36px ${bridgeOk ? "rgba(16, 185, 129, 0.5)" : "rgba(56, 189, 248, 0.45)"} !important;
        opacity: 1; transition: opacity 0.45s ease;
      `;
      setTimeout(() => {
        if (borderEl) borderEl.style.opacity = "0";
      }, 1800);
      setTimeout(() => {
        if (borderEl && borderEl.style.opacity === "0") borderEl.remove();
      }, 2400);

      // 2. Top-center confirmation banner with live verified proof details
      let banner = document.getElementById("agy-proof-banner");
      if (!banner) {
        banner = document.createElement("div");
        banner.id = "agy-proof-banner";
        (document.body || document.documentElement).appendChild(banner);
      }

      const headline = bridgeOk && chatOk
        ? "🤖 XÁC NHẬN: AI BRIDGE ĐANG NẮM QUYỀN 100% TRÌNH DUYỆT"
        : (chatOk
          ? (iframeOk ? "🔵 EXTENSION ĐANG NẮM QUYỀN IFRAME (CHẾ ĐỘ ĐỘC LẬP)" : "🔵 EXTENSION ĐANG NẮM QUYỀN TRANG REMOTE TRỰC TIẾP")
          : "⚠️ EXTENSION ĐÃ CHẠY NHƯNG CHƯA VÀO KHUNG CHAT");

      const chatName = info.activeChat || latestTelemetry.activeChat || "(Trang chủ / Chưa mở chat)";
      const sidebarCount = info.sidebarCount ?? latestTelemetry.sidebarCount ?? "?";
      const frameStatusText = iframeOk ? "Iframe OK ✓" : (localOk ? "Top Direct OK ✓" : `Chưa thấy (${document.querySelectorAll("iframe").length} iframe)`);
      const timeStr = new Date().toLocaleTimeString("vi-VN");
      const customMsg = info.message ? `<div style="margin-top:4px;color:#a7f3d0;font-weight:600;">💬 ${String(info.message).replace(/</g, "&lt;")}</div>` : "";

      banner.style.cssText = `
        position: fixed !important; top: 14px !important; left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 2147483647 !important; pointer-events: none !important;
        background: rgba(9, 20, 32, 0.94) !important;
        border: 2px solid ${accent} !important;
        border-radius: 14px !important; padding: 10px 16px !important;
        color: #f8fafc !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-size: 12.5px !important; line-height: 1.45 !important;
        box-shadow: 0 12px 34px rgba(0, 0, 0, 0.65) !important;
        max-width: min(460px, calc(100vw - 24px)) !important;
        backdrop-filter: blur(14px) !important;
        opacity: 1; transition: opacity 0.35s ease;
      `;
      banner.innerHTML = `
        <div style="font-weight:800;font-size:13px;color:${accent};letter-spacing:0.2px;">${headline}</div>
        <div style="margin-top:4px;color:#e2e8f0;font-size:12px;">
          • <b>Khung:</b> ${frameStatusText} &nbsp;|&nbsp;
          <b>PC Bridge:</b> ${bridgeOk ? "9333 OK ✓" : "Offline"} &nbsp;|&nbsp;
          <b>v${AGY_VERSION}</b>
        </div>
        <div style="color:#cbd5e1;font-size:11.5px;margin-top:2px;">
          • <b>Chat:</b> ${String(chatName).replace(/</g, "&lt;")} &nbsp;|&nbsp; <b>Sidebar:</b> ${sidebarCount} mục &nbsp;|&nbsp; ${timeStr}
        </div>
        ${customMsg}
      `;

      clearTimeout(proofBannerTimer);
      proofBannerTimer = setTimeout(() => {
        if (banner) {
          banner.style.opacity = "0";
          setTimeout(() => banner && banner.remove(), 400);
        }
      }, 4800);
    }

    async function copyTextInTopFrame(text) {
      if (!text) return false;
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;";
          document.body.appendChild(ta);
          ta.select();
          const ok = document.execCommand("copy");
          ta.remove();
          return !!ok;
        } catch (e2) {
          return false;
        }
      }
    }

    window.__AGY_TOP_LED_INTERVAL = setInterval(updateBridgeLedUi, 1500);

    addSafeListener(window, "message", async (e) => {
      if (e.data && e.data.type === "AGY_UPDATE_BAR_V20") {
        // Block zombie messages from older orphaned script instances in memory
        const content = String(e.data.htmlContent || "");
        if (content.includes("Dang cho dialog") || content.includes("Chua thay")) {
          return;
        }
        updateBar(e.data.htmlContent, e.data.colorHint || "info", e.data.autoHideMs || 0);
      }
      if (e.data && e.data.type === "AGY_IFRAME_HEARTBEAT_V22") {
        lastIframeSeenAt = Date.now();
        window.__AGY_LAST_CHILD_IFRAME_AT = lastIframeSeenAt;
        if (e.data.bridgeOnline) lastBridgeSeenAt = Date.now();
        latestTelemetry = e.data;
        updateBridgeLedUi();
      }
      if (e.data && e.data.type === "AGY_SHOW_PROOF_V22") {
        if (e.data.iframeOk) {
          lastIframeSeenAt = Date.now();
          window.__AGY_LAST_CHILD_IFRAME_AT = lastIframeSeenAt;
        }
        if (e.data.bridgeOnline) lastBridgeSeenAt = Date.now();
        updateBridgeLedUi();
        showProofOfControlBanner(e.data);
      }
      if (e.data && e.data.type === "AGY_COPY_CLIPBOARD_TOP_V22") {
        const copied = await copyTextInTopFrame(e.data.text);
        if (copied) {
          updateBar(`✓ Đã copy bản đồ DOM (${e.data.count || 0} mục) vào Clipboard!`, "success", 3200);
        } else {
          updateBar("⚠️ Không ghi được Clipboard, đã lưu vào Bridge PC!", "warning", 3200);
        }
      }
      if (e.data && e.data.type === "AGY_IMAGE_MODAL") {
        if (e.data.isOpen) {
          hideControlContainer();
        } else {
          restoreControlContainer();
        }
      }
      if (e.data && e.data.type === "AGY_PROMPT_STATE") {
        lastPromptAckAt = Date.now();
        const toggleBtn = document.getElementById("agy-toggle-prompt-btn");
        if (toggleBtn) {
          const hidden = !!e.data.hidden;
          toggleBtn.dataset.hidden = hidden ? "1" : "0";
          toggleBtn.innerHTML = hidden ? "✏️" : "📖";
          toggleBtn.title = hidden ? "Hiện lại ô soạn thảo" : "Ẩn ô nhập để đọc tràn viền";
          toggleBtn.style.color = hidden ? "rgba(56, 189, 248, 0.95)" : "rgba(255, 255, 255, 0.9)";
          toggleBtn.style.borderColor = hidden ? "rgba(56, 189, 248, 0.5)" : "rgba(255, 255, 255, 0.18)";
          toggleBtn.style.background = hidden ? "rgba(56, 189, 248, 0.18)" : "rgba(255, 255, 255, 0.08)";
        }
      }
      if (e.data && e.data.type === "AGY_SEARCH_STATE_V25") {
        const searchBtn = document.getElementById("agy-dock-search-btn");
        if (searchBtn) {
          const isOpen = !!e.data.open;
          searchBtn.title = isOpen ? "Đóng hộp tìm kiếm dự án (Esc)" : "Mở hộp tìm kiếm / chuyển dự án (Ctrl+K)";
          searchBtn.style.background = isOpen ? "rgba(56, 189, 248, 0.25)" : "rgba(255, 255, 255, 0.08)";
          searchBtn.style.color = isOpen ? "#38bdf8" : "#f8fafc";
          searchBtn.style.borderColor = isOpen ? "rgba(56, 189, 248, 0.55)" : "rgba(255, 255, 255, 0.16)";
        }
      }
      if (e.data && e.data.type === "AGY_OPEN_SMART_SEARCH_V2") {
        if (typeof window.__AGY_TOGGLE_SMART_SEARCH === "function") {
          window.__AGY_TOGGLE_SMART_SEARCH(true);
        }
      }
      if (e.data && e.data.type === "AGY_SWEEP_PROGRESS_V2") {
        if (typeof window.__AGY_SWEEP_UI_PROGRESS === "function") {
          window.__AGY_SWEEP_UI_PROGRESS(e.data);
        }
      }
      if (e.data && e.data.type === "AGY_SWEEP_DONE_V2") {
        if (typeof window.__AGY_REFRESH_SMART_SEARCH === "function") {
          window.__AGY_REFRESH_SMART_SEARCH(e.data);
        }
      }
    });

    // Continuous wakeup tick from top frame -> iframes (beats Chrome background iframe throttling & forwards real topUrl)
    window.__AGY_TOP_TICK_INTERVAL = setInterval(() => {
      if (!isCurrentInstance()) return;
      const tUrl = window.location.href;
      const tTitle = document.title;
      document.querySelectorAll("iframe").forEach((ifr) => {
        try {
          ifr.contentWindow?.postMessage(
            { type: "AGY_HEARTBEAT_TICK_V24", ts: Date.now(), topUrl: tUrl, topTitle: tTitle },
            "*"
          );
        } catch (err) {}
      });
    }, 900);

    // Top-frame bridge heartbeat + instant command relay (or direct local execution when no child chat iframe)
    window.__AGY_TOP_BRIDGE_INTERVAL = setInterval(() => {
      if (!isCurrentInstance()) return;
      try {
        const childIframeAlive = isChildChatIframeAlive();
        const localChatActive = !childIframeAlive && hasChatDomInCurrentDoc();
        const iframeAlive = childIframeAlive || document.querySelectorAll("iframe").length > 0;
        const iframeSrcs = Array.from(document.querySelectorAll("iframe")).map((i) => i.getAttribute("src") || "(no-src)").slice(0, 6);
        chrome.runtime.sendMessage(
          {
            type: "AGY_BRIDGE_HEARTBEAT",
            payload: {
              frame: "top",
              supportsRelay: true,
              extensionVersion: AGY_VERSION,
              url: window.location.href,
              title: document.title,
              iframeAlive,
              childIframeAlive,
              topChatActive: localChatActive,
              iframeSrcs,
              timestamp: Date.now(),
            },
          },
          (resp) => {
            if (chrome.runtime.lastError) return;
            if (resp && resp.bridgeOnline) {
              lastBridgeSeenAt = Date.now();
              updateBridgeLedUi();
              if (Array.isArray(resp.commands)) {
                for (const cmd of resp.commands) {
                  const wantIframe = (cmd.targetFrame || "iframe") === "iframe";
                  const iframes = Array.from(document.querySelectorAll("iframe"));
                  if (wantIframe && childIframeAlive && iframes.length > 0) {
                    iframes.forEach((ifr) => {
                      try {
                        ifr.contentWindow?.postMessage({ type: "AGY_BRIDGE_EXEC_V23", cmd }, "*");
                      } catch (err) {}
                    });
                  } else if (localChatActive && typeof window.__AGY_EXEC_BRIDGE_CMD_LOCAL === "function") {
                    window.__AGY_EXEC_BRIDGE_CMD_LOCAL(cmd);
                  } else if (cmd.cmd === "DUMP_DOM" || cmd.cmd === "INSPECT_UI") {
                    runTopFallbackDiagnostics(cmd.id);
                  } else if (cmd.cmd === "PING_PROOF") {
                    showProofOfControlBanner({
                      iframeOk: childIframeAlive,
                      localChatOk: localChatActive,
                      bridgeOnline: true,
                      message: cmd.args?.message || "Top Frame Pong!",
                    });
                    chrome.runtime.sendMessage({
                      type: "AGY_BRIDGE_RESULT",
                      payload: {
                        id: cmd.id,
                        cmd: cmd.cmd,
                        ok: true,
                        frame: "top",
                        url: window.location.href,
                        title: document.title,
                        iframeAlive: childIframeAlive,
                        topChatActive: localChatActive,
                      },
                    });
                  }
                }
              }
            }
          }
        );
      } catch (e) {}
    }, 1600);

    // Glassmorphism 2-Row Ergonomic Bottom Control Dock
    // Row 1 (Utilities): [LED] [🔍 Search] [📖/✏️ Prompt] [📋 DOM] [▾ Collapse]
    // Row 2 (Thumb Quick Actions): [u] [o] [d] [→ Send]
    function initBottomControlDock() {
      if (document.getElementById("agy-dock-row")) return;
      const container = getControlContainer();

      // Enlarged floating restore button when dock is collapsed
      let miniBtn = document.getElementById("agy-dock-mini-btn");
      if (!miniBtn) {
        miniBtn = document.createElement("button");
        miniBtn.id = "agy-dock-mini-btn";
        miniBtn.textContent = "⚡";
        miniBtn.title = "Mở lại thanh điều khiển AGY";
        miniBtn.style.cssText = `
          position: fixed !important;
          bottom: 12px !important;
          right: 14px !important;
          z-index: 2147483647 !important;
          width: 52px; height: 52px; border-radius: 50%;
          display: none; align-items: center; justify-content: center;
          background: rgba(15, 23, 42, 0.88);
          border: 2px solid rgba(56, 189, 248, 0.65);
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.48);
          color: #38bdf8; font-size: 24px; cursor: pointer;
          pointer-events: auto; touch-action: manipulation;
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          transition: transform 0.15s ease;
        `;
        miniBtn.addEventListener("pointerdown", () => { miniBtn.style.transform = "scale(0.88)"; });
        miniBtn.addEventListener("pointerup", () => { miniBtn.style.transform = "scale(1)"; });
        miniBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const row = document.getElementById("agy-dock-row");
          if (row) row.style.display = "flex";
          miniBtn.style.display = "none";
        });
        (document.body || document.documentElement).appendChild(miniBtn);
      }

      const row = document.createElement("div");
      row.id = "agy-dock-row";
      row.style.cssText = `
        display: flex; flex-direction: column; align-items: stretch; gap: 10px;
        width: min(calc(100vw - 14px), 440px);
        max-width: calc(100vw - 10px);
        box-sizing: border-box;
        pointer-events: auto;
        background: rgba(15, 23, 42, 0.78);
        backdrop-filter: blur(16px) saturate(160%);
        -webkit-backdrop-filter: blur(16px) saturate(160%);
        border: 1px solid rgba(255, 255, 255, 0.22);
        border-radius: 24px;
        padding: 9px 11px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
        user-select: none;
      `;

      const row1 = document.createElement("div");
      row1.style.cssText = "width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px;";

      const row2 = document.createElement("div");
      row2.style.cssText = "width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;";

      // Helper for full-width responsive large touch targets with wide separation
      function createDockBtn(id, html, title, color, bg, border, flexVal = 1, heightPx = 48, radiusPx = 16, fontSizePx = 21) {
        const btn = document.createElement("button");
        btn.id = id;
        btn.innerHTML = html;
        btn.title = title;
        btn.style.cssText = `
          flex: ${flexVal}; min-width: 0; height: ${heightPx}px; border-radius: ${radiusPx}px;
          display: flex; align-items: center; justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: ${fontSizePx}px; font-weight: 800;
          color: ${color};
          background: ${bg};
          border: 1px solid ${border};
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
          touch-action: manipulation;
          transition: transform 0.12s ease, filter 0.12s ease, background 0.15s ease, border-color 0.15s ease;
          padding: 0;
        `;
        btn.addEventListener("pointerdown", () => {
          btn.style.transform = "scale(0.92)";
          btn.style.filter = "brightness(1.18)";
        });
        btn.addEventListener("pointerup", () => {
          btn.style.transform = "scale(1)";
          btn.style.filter = "none";
        });
        btn.addEventListener("pointerleave", () => {
          btn.style.transform = "scale(1)";
          btn.style.filter = "none";
        });
        return btn;
      }

      // ── ROW 1: Large Spaced Utilities (48px tall, flex across dock, 10px gap) ─

      // 0. Live Proof-of-Control LED Status Button
      const ledBtn = createDockBtn(
        "agy-bridge-led",
        `<span style="width:14px;height:14px;border-radius:50%;display:block;background:#ef4444;box-shadow:0 0 8px rgba(239,68,68,0.8);transition:all 0.25s ease;"></span>`,
        "Kiểm tra trạng thái AI Bridge & Iframe",
        "#ffffff",
        "rgba(255, 255, 255, 0.08)",
        "rgba(255, 255, 255, 0.2)",
        1,
        48,
        16,
        16
      );
      addSafeListener(ledBtn, "click", (e) => {
        e.stopPropagation();
        if (!isChildChatIframeAlive() && hasChatDomInCurrentDoc() && typeof window.__AGY_LOCAL_CHAT_ACTION === "function") {
          window.__AGY_LOCAL_CHAT_ACTION("PING_PROOF");
          return;
        }
        let relayed = false;
        document.querySelectorAll("iframe").forEach((ifr) => {
          try {
            ifr.contentWindow?.postMessage({ type: "AGY_PING_PROOF_REQ" }, "*");
            relayed = true;
          } catch (err) {}
        });
        if (!relayed || !isChildChatIframeAlive()) {
          showProofOfControlBanner({ message: "Kiểm tra kết nối thủ công" });
        }
      });
      row1.appendChild(ledBtn);

      // 1. Search Project Toggle Button (🔍) - opens AND closes fastpick modal
      const searchBtn = createDockBtn(
        "agy-dock-search-btn",
        "🔍",
        "Mở hoặc Đóng hộp tìm kiếm dự án (Ctrl+K)",
        "#f8fafc",
        "rgba(255, 255, 255, 0.08)",
        "rgba(255, 255, 255, 0.18)",
        1,
        48,
        16,
        21
      );
      addSafeListener(searchBtn, "click", (e) => {
        e.stopPropagation();
        if (!isChildChatIframeAlive() && hasChatDomInCurrentDoc() && typeof window.__AGY_LOCAL_CHAT_ACTION === "function") {
          window.__AGY_LOCAL_CHAT_ACTION("TOGGLE_SEARCH");
          return;
        }
        document.querySelectorAll("iframe").forEach((ifr) => {
          try {
            ifr.contentWindow?.postMessage({ type: "AGY_TOGGLE_SEARCH_V25" }, "*");
          } catch (err) {}
        });
        if (!isChildChatIframeAlive()) {
          updateBar("⚠️ Chưa kết nối được khung chat để tìm kiếm (thử bấm 📋 soi DOM)", "warning", 2200);
        }
      });
      row1.appendChild(searchBtn);

      // 1b. Smart Search AGY 2.0 Toggle Button (🔎) - parallel to native search, searches Projects + Conversations + Regex
      const smartSearchBtn = createDockBtn(
        "agy-dock-smart-search-btn",
        `<span style="position:relative;display:inline-flex;align-items:center;justify-content:center;font-size:19px;">🔎<span style="position:absolute;right:-6px;top:-4px;font-size:10px;line-height:1;">⚡</span></span>`,
        "Smart Search AGY 2.0 (Alt+K): Tìm không dấu theo Dự án & Hội thoại + Regex",
        "#67e8f9",
        "rgba(6, 182, 212, 0.20)",
        "rgba(34, 211, 238, 0.48)",
        1,
        48,
        16,
        19
      );

      let smartSearchState = {
        open: false,
        query: "",
        scope: "all",
        projectFilter: "",
        useRegex: false,
        selectedIdx: 0,
        catalog: [],
        results: [],
        isSweeping: false,
      };

      function dispatchChatCommandToOwner(type, payload) {
        if (!isChildChatIframeAlive() && hasChatDomInCurrentDoc() && typeof window.__AGY_LOCAL_CHAT_ACTION === "function") {
          window.__AGY_LOCAL_CHAT_ACTION(type, payload);
          return true;
        }
        let sent = false;
        document.querySelectorAll("iframe").forEach((ifr) => {
          try {
            ifr.contentWindow?.postMessage({ type: type, ...(payload || {}) }, "*");
            sent = true;
          } catch (err) {}
        });
        return sent;
      }

      async function loadSmartSearchCatalog() {
        try {
          const data = await chrome.storage.local.get(["agy_search_index", "agy_local_catalog"]);
          const listA = Array.isArray(data.agy_search_index) ? data.agy_search_index : [];
          const listB = Array.isArray(data.agy_local_catalog) ? data.agy_local_catalog : [];
          const map = new Map();
          for (const it of [...listA, ...listB]) {
            if (!it) continue;
            const k = it.cascadeId || ("proj:" + String(it.projectLabel || it.title || "").toLowerCase());
            if (!map.has(k)) map.set(k, it);
          }
          smartSearchState.catalog = Array.from(map.values());
        } catch (_) {
          smartSearchState.catalog = [];
        }
      }

      function renderSmartSearchResults() {
        const listEl = document.getElementById("agy-ss-results");
        const statEl = document.getElementById("agy-ss-stat");
        const crumbEl = document.getElementById("agy-ss-crumb");
        const errEl = document.getElementById("agy-ss-error");
        if (!listEl) return;

        if (crumbEl) {
          if (smartSearchState.projectFilter) {
            crumbEl.style.display = "flex";
            crumbEl.innerHTML = `<span>📁 Đang lọc dự án: <b>${smartSearchState.projectFilter.replace(/</g, "&lt;")}</b></span><button id="agy-ss-clear-proj" style="background:rgba(255,255,255,0.14);border:none;color:#fff;border-radius:4px;padding:2px 7px;font-size:11px;cursor:pointer;font-weight:700;">✕ Bỏ lọc</button>`;
            const clrBtn = document.getElementById("agy-ss-clear-proj");
            if (clrBtn) {
              clrBtn.onclick = () => {
                smartSearchState.projectFilter = "";
                smartSearchState.scope = "all";
                updateSmartSearchScopeButtons();
                renderSmartSearchResults();
              };
            }
          } else {
            crumbEl.style.display = "none";
          }
        }

        const out = HANDOFF_CORE
          ? HANDOFF_CORE.searchCatalogItems(smartSearchState.catalog, smartSearchState.query, {
              scope: smartSearchState.scope,
              projectFilter: smartSearchState.projectFilter,
              useRegex: smartSearchState.useRegex,
              limit: 90,
            })
          : { items: smartSearchState.catalog.slice(0, 90), regexError: null };

        if (errEl) {
          if (out.regexError) {
            errEl.style.display = "block";
            errEl.textContent = "Regex chưa hợp lệ: " + out.regexError;
          } else {
            errEl.style.display = "none";
          }
        }

        smartSearchState.results = out.items || [];
        if (smartSearchState.selectedIdx >= smartSearchState.results.length) {
          smartSearchState.selectedIdx = Math.max(0, smartSearchState.results.length - 1);
        }

        const projCount = new Set(smartSearchState.catalog.map((x) => x.projectLabel || (x.isProjectHeader ? x.title : "")).filter(Boolean)).size;
        const chatCount = smartSearchState.catalog.filter((x) => !x.isProjectHeader && x.cascadeId).length;
        if (statEl) {
          statEl.textContent = `${smartSearchState.results.length} kết quả · ${projCount} dự án · ${chatCount} chat`;
        }

        if (smartSearchState.results.length === 0) {
          listEl.innerHTML = `<div style="padding:26px 14px;text-align:center;color:#94a3b8;font-size:12.5px;line-height:1.5;">
            ${out.regexError ? "Hãy sửa biểu thức Regex để tiếp tục." : "Không tìm thấy mục phù hợp trong Catalog."}
            <div style="margin-top:8px;font-size:11.5px;color:#64748b;">Mẹo: Bấm <b>🔄 Quét đủ</b> ở góc trên để mở rộng các mục <i>See all</i> trên Sidebar, hoặc thử nút <b>🔍 Search gốc</b>.</div>
          </div>`;
          return;
        }

        const projectChatCounts = new Map();
        for (const it of smartSearchState.catalog) {
          if (!it || it.isProjectHeader || !it.cascadeId) continue;
          const pName = String(it.projectLabel || it.subtext || "").trim().toLowerCase();
          if (pName) projectChatCounts.set(pName, (projectChatCounts.get(pName) || 0) + 1);
        }

        listEl.innerHTML = "";
        smartSearchState.results.forEach((item, idx) => {
          const isProj = !!(item.isProjectHeader || item.kind === "project");
          const rowEl = document.createElement("div");
          rowEl.style.cssText = `
            display:flex;align-items:center;justify-content:space-between;gap:8px;
            padding:9px 11px;border-radius:9px;cursor:pointer;min-height:44px;
            border:1px solid ${idx === smartSearchState.selectedIdx ? "rgba(34,211,238,0.6)" : "rgba(255,255,255,0.06)"};
            background:${idx === smartSearchState.selectedIdx ? "rgba(34,211,238,0.14)" : "rgba(255,255,255,0.03)"};
            transition:background 0.12s,border-color 0.12s;
          `;
          const badges = [];
          if (item.isSelected) badges.push(`<span style="background:rgba(59,130,246,0.28);color:#93c5fd;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;">ĐANG MỞ</span>`);
          if (item.isAttention) badges.push(`<span style="background:rgba(251,191,36,0.25);color:#fde68a;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;">CHỜ DUYỆT</span>`);
          if (item.isRunning) badges.push(`<span style="background:rgba(16,185,129,0.24);color:#6ee7b7;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;">ĐANG CHẠY</span>`);

          const safeTitle = String(item.title || item.projectLabel || "(Không tên)").replace(/</g, "&lt;");
          const safeProj = String(item.projectLabel || item.subtext || "").replace(/</g, "&lt;");
          const projKey = String(item.projectLabel || item.title || "").trim().toLowerCase();
          const projChats = projectChatCounts.get(projKey) || 0;
          const subtitle = isProj
            ? `${projChats > 0 ? projChats + " đoạn thoại" : "Dự án"} — bấm để xem toàn bộ hội thoại`
            : (safeProj ? `📁 ${safeProj}` : (item.cascadeId ? `ID: ${item.cascadeId.slice(0, 8)}…` : "Hội thoại"));

          rowEl.innerHTML = `
            <div style="display:flex;align-items:center;gap:9px;min-width:0;flex:1;">
              <span style="font-size:16px;flex-shrink:0;">${isProj ? "📁" : "💬"}</span>
              <div style="min-width:0;flex:1;">
                <div style="font-size:13px;font-weight:700;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safeTitle}</div>
                <div style="font-size:11px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;">${subtitle}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:5px;flex-shrink:0;">${badges.join("")}${isProj ? '<span style="color:#38bdf8;font-size:11px;font-weight:700;background:rgba(56,189,248,0.14);padding:2px 6px;border-radius:5px;">Dự án →</span>' : ""}</div>
          `;
          rowEl.addEventListener("mouseenter", () => {
            smartSearchState.selectedIdx = idx;
          });
          rowEl.addEventListener("click", (ev) => {
            ev.stopPropagation();
            activateSmartSearchItem(item);
          });
          listEl.appendChild(rowEl);
        });
      }

      function activateSmartSearchItem(item) {
        if (!item) return;
        const isProj = !!(item.isProjectHeader || item.kind === "project");
        if (isProj) {
          smartSearchState.projectFilter = item.projectLabel || item.title || "";
          smartSearchState.scope = "conversations";
          smartSearchState.query = "";
          const inp = document.getElementById("agy-ss-input");
          if (inp) {
            inp.value = "";
            inp.focus();
          }
          updateSmartSearchScopeButtons();
          renderSmartSearchResults();
          return;
        }
        closeSmartSearchModal();
        const jumpPayload = {
          cascadeId: item.cascadeId || "",
          title: item.title || "",
          projectLabel: item.projectLabel || "",
          href: item.href || "",
        };
        if (!isChildChatIframeAlive() && hasChatDomInCurrentDoc() && typeof window.__AGY_LOCAL_CHAT_ACTION === "function") {
          window.__AGY_LOCAL_CHAT_ACTION("JUMP_CASCADE", jumpPayload);
        } else {
          dispatchChatCommandToOwner("AGY_JUMP_CASCADE_V2", { item: jumpPayload });
        }
        updateBar(`⚡ Đang chuyển tới: "${(item.title || item.cascadeId).slice(0, 32)}"`, "info", 2200);
      }

      function updateSmartSearchScopeButtons() {
        document.querySelectorAll("#agy-smart-search-overlay [data-ss-scope]").forEach((btn) => {
          const active = btn.getAttribute("data-ss-scope") === smartSearchState.scope;
          btn.style.background = active ? "rgba(34,211,238,0.24)" : "rgba(255,255,255,0.06)";
          btn.style.color = active ? "#67e8f9" : "#cbd5e1";
          btn.style.borderColor = active ? "rgba(34,211,238,0.55)" : "rgba(255,255,255,0.12)";
        });
        const rxBtn = document.getElementById("agy-ss-regex-btn");
        if (rxBtn) {
          rxBtn.style.background = smartSearchState.useRegex ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.08)";
          rxBtn.style.color = smartSearchState.useRegex ? "#fcd34d" : "#cbd5e1";
          rxBtn.style.borderColor = smartSearchState.useRegex ? "rgba(245,158,11,0.6)" : "rgba(255,255,255,0.16)";
        }
      }

      function closeSmartSearchModal() {
        smartSearchState.open = false;
        smartSearchState.isSweeping = false;
        clearTimeout(smartSearchState._sweepFailTimer);
        const ov = document.getElementById("agy-smart-search-overlay");
        if (ov) ov.remove();
        smartSearchBtn.style.background = "rgba(6, 182, 212, 0.20)";
      }

      function triggerCatalogSweepFromTop() {
        const sweepBtn = document.getElementById("agy-ss-sweep-btn");
        smartSearchState.isSweeping = true;
        if (sweepBtn) {
          sweepBtn.textContent = "⏳ Đang quét...";
          sweepBtn.disabled = true;
        }
        clearTimeout(smartSearchState._sweepFailTimer);
        smartSearchState._sweepFailTimer = setTimeout(async () => {
          smartSearchState.isSweeping = false;
          const b = document.getElementById("agy-ss-sweep-btn");
          if (b) {
            b.textContent = "🔄 Quét đủ";
            b.disabled = false;
          }
          await loadSmartSearchCatalog();
          if (smartSearchState.open) renderSmartSearchResults();
        }, 25000);

        if (!isChildChatIframeAlive() && hasChatDomInCurrentDoc() && typeof window.__AGY_LOCAL_CHAT_ACTION === "function") {
          window.__AGY_LOCAL_CHAT_ACTION("SWEEP_CATALOG");
        } else {
          dispatchChatCommandToOwner("AGY_SWEEP_CATALOG_V2", {});
        }
      }

      async function openSmartSearchModal() {
        await loadSmartSearchCatalog();
        // Default combined search across BOTH Projects & Conversations every time modal opens
        smartSearchState.open = true;
        smartSearchState.scope = "all";
        smartSearchState.projectFilter = "";
        smartSearchState.selectedIdx = 0;
        smartSearchBtn.style.background = "rgba(34, 211, 238, 0.36)";

        let ov = document.getElementById("agy-smart-search-overlay");
        if (ov) ov.remove();

        ov = document.createElement("div");
        ov.id = "agy-smart-search-overlay";
        ov.setAttribute("data-agy-ui", "1");
        ov.style.cssText = `
          position:fixed!important;inset:0!important;z-index:2147483647!important;
          background:rgba(2,6,23,0.72)!important;backdrop-filter:blur(6px)!important;
          display:flex!important;align-items:flex-start!important;justify-content:center!important;
          padding:max(14px, env(safe-area-inset-top)) 10px 14px!important;
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;
        `;

        const card = document.createElement("div");
        card.style.cssText = `
          width:min(560px, 100%)!important;max-height:82vh!important;
          background:#0f172a!important;border:1px solid rgba(56,189,248,0.4)!important;
          border-radius:16px!important;box-shadow:0 20px 50px rgba(0,0,0,0.68)!important;
          display:flex!important;flex-direction:column!important;overflow:hidden!important;color:#f8fafc!important;
        `;

        card.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;background:rgba(15,23,42,0.95);border-bottom:1px solid rgba(255,255,255,0.08);flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:7px;">
              <span style="font-size:14px;font-weight:800;color:#67e8f9;">🔎⚡ Smart Search AGY ${AGY_VERSION}</span>
              <span style="font-size:10.5px;color:#94a3b8;">(Alt+K)</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <button id="agy-ss-sweep-btn" type="button" style="background:rgba(16,185,129,0.2);border:1px solid rgba(16,185,129,0.45);color:#6ee7b7;border-radius:7px;padding:5px 9px;font-size:11.5px;font-weight:700;cursor:pointer;" title="Cuộn quét toàn bộ Sidebar từ đầu tới cuối">🔄 Quét đủ</button>
              <button id="agy-ss-native-btn" type="button" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);color:#e2e8f0;border-radius:7px;padding:5px 9px;font-size:11.5px;font-weight:700;cursor:pointer;" title="Mở Search mặc định của Antigravity (Ctrl+K)">🔍 Search gốc</button>
              <button id="agy-ss-close-btn" type="button" style="background:transparent;border:none;color:#94a3b8;font-size:18px;font-weight:800;cursor:pointer;padding:2px 6px;">✕</button>
            </div>
          </div>
          <div style="padding:10px 12px 8px;display:flex;flex-direction:column;gap:8px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <div style="display:flex;align-items:center;gap:6px;">
              <input id="agy-ss-input" type="text" placeholder="Tìm tổng hợp: gõ tên Dự án (vd: learn) hoặc tên Hội thoại, hoặc /regex/..." style="flex:1;min-width:0;background:#020617;border:1px solid rgba(148,163,184,0.3);border-radius:9px;padding:9px 11px;color:#fff;font-size:13.5px;outline:none;">
              <button id="agy-ss-regex-btn" type="button" title="Bật/Tắt chế độ Regex (.*)" style="height:37px;padding:0 10px;border-radius:9px;border:1px solid rgba(255,255,255,0.16);font-family:monospace;font-size:13px;font-weight:800;cursor:pointer;">.*</button>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <button data-ss-scope="all" type="button" style="border:1px solid transparent;border-radius:7px;padding:4px 9px;font-size:11.5px;font-weight:700;cursor:pointer;">✨ Tổng hợp (Tất cả)</button>
              <button data-ss-scope="projects" type="button" style="border:1px solid transparent;border-radius:7px;padding:4px 9px;font-size:11.5px;font-weight:700;cursor:pointer;">📁 Chỉ Dự án</button>
              <button data-ss-scope="conversations" type="button" style="border:1px solid transparent;border-radius:7px;padding:4px 9px;font-size:11.5px;font-weight:700;cursor:pointer;">💬 Chỉ Hội thoại</button>
              <button data-ss-scope="active" type="button" style="border:1px solid transparent;border-radius:7px;padding:4px 9px;font-size:11.5px;font-weight:700;cursor:pointer;">🟢 Chạy / Chờ</button>
            </div>
            <div id="agy-ss-crumb" style="display:none;align-items:center;justify-content:space-between;gap:8px;padding:6px 9px;border-radius:7px;background:rgba(37,99,235,0.22);border:1px solid rgba(59,130,246,0.45);font-size:12px;color:#bfdbfe;"></div>
            <div id="agy-ss-error" style="display:none;padding:6px 9px;border-radius:7px;background:rgba(239,68,68,0.18);border:1px solid rgba(239,68,68,0.4);font-size:11.5px;color:#fca5a5;"></div>
          </div>
          <div id="agy-ss-results" style="flex:1;overflow-y:auto;padding:8px 10px;display:flex;flex-direction:column;gap:5px;"></div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 12px;background:rgba(2,6,23,0.7);border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:#94a3b8;">
            <span id="agy-ss-stat">Đang tải...</span>
            <button id="agy-ss-options-btn" type="button" style="background:transparent;border:none;color:#93c5fd;font-size:11px;font-weight:700;cursor:pointer;">⚙️ Cấu hình Handoff</button>
          </div>
        `;

        ov.appendChild(card);
        (document.body || document.documentElement).appendChild(ov);

        ov.addEventListener("click", (e) => {
          if (e.target === ov) closeSmartSearchModal();
        });
        document.getElementById("agy-ss-close-btn").onclick = closeSmartSearchModal;
        document.getElementById("agy-ss-native-btn").onclick = () => {
          closeSmartSearchModal();
          searchBtn.click();
        };
        document.getElementById("agy-ss-options-btn").onclick = () => {
          chrome.runtime.sendMessage({ type: "AGY_OPEN_OPTIONS" });
        };

        const sweepBtn = document.getElementById("agy-ss-sweep-btn");
        sweepBtn.onclick = () => triggerCatalogSweepFromTop();

        const inp = document.getElementById("agy-ss-input");
        inp.value = smartSearchState.query;
        inp.addEventListener("input", () => {
          smartSearchState.query = inp.value;
          smartSearchState.selectedIdx = 0;
          renderSmartSearchResults();
        });
        inp.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            if (smartSearchState.projectFilter) {
              smartSearchState.projectFilter = "";
              smartSearchState.scope = "all";
              updateSmartSearchScopeButtons();
              renderSmartSearchResults();
            } else {
              closeSmartSearchModal();
            }
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (smartSearchState.results.length > 0) {
              smartSearchState.selectedIdx = (smartSearchState.selectedIdx + 1) % smartSearchState.results.length;
              renderSmartSearchResults();
            }
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (smartSearchState.results.length > 0) {
              smartSearchState.selectedIdx = (smartSearchState.selectedIdx - 1 + smartSearchState.results.length) % smartSearchState.results.length;
              renderSmartSearchResults();
            }
          } else if (e.key === "Enter") {
            e.preventDefault();
            const chosen = smartSearchState.results[smartSearchState.selectedIdx];
            if (chosen) activateSmartSearchItem(chosen);
          }
        });

        document.getElementById("agy-ss-regex-btn").onclick = () => {
          smartSearchState.useRegex = !smartSearchState.useRegex;
          updateSmartSearchScopeButtons();
          renderSmartSearchResults();
          inp.focus();
        };

        ov.querySelectorAll("[data-ss-scope]").forEach((btn) => {
          btn.onclick = () => {
            const clicked = btn.getAttribute("data-ss-scope") || "all";
            // Click an active filter again to toggle back to combined default "all"
            smartSearchState.scope = (clicked !== "all" && smartSearchState.scope === clicked) ? "all" : clicked;
            smartSearchState.selectedIdx = 0;
            updateSmartSearchScopeButtons();
            renderSmartSearchResults();
            inp.focus();
          };
        });

        updateSmartSearchScopeButtons();
        renderSmartSearchResults();
        setTimeout(() => inp.focus(), 40);

        if (smartSearchState.catalog.length === 0) {
          triggerCatalogSweepFromTop();
        }
      }

      window.__AGY_TOGGLE_SMART_SEARCH = (forceOpen) => {
        if (forceOpen === true || !smartSearchState.open) {
          openSmartSearchModal();
        } else {
          closeSmartSearchModal();
        }
      };

      window.__AGY_SWEEP_UI_PROGRESS = (info) => {
        if (!smartSearchState.open) return;
        const b = document.getElementById("agy-ss-sweep-btn");
        if (b && info) {
          b.textContent = `⏳ ${info.projects || 0} DA · ${info.chats || 0} chat...`;
        }
      };

      window.__AGY_REFRESH_SMART_SEARCH = async (info) => {
        smartSearchState.isSweeping = false;
        clearTimeout(smartSearchState._sweepFailTimer);
        const b = document.getElementById("agy-ss-sweep-btn");
        if (b) {
          b.textContent = "🔄 Quét đủ";
          b.disabled = false;
        }
        if (!smartSearchState.open) return;
        await loadSmartSearchCatalog();
        renderSmartSearchResults();
        if (info && typeof info === "object" && info.projects !== undefined) {
          const statEl = document.getElementById("agy-ss-stat");
          if (statEl) {
            statEl.textContent = `Đã quét ${info.projects} dự án · ${info.chats || 0} hội thoại (hiển thị ${smartSearchState.results.length})`;
          }
        }
      };

      if (chrome?.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area !== "local" || !isCurrentInstance() || !smartSearchState.open) return;
          if (changes.agy_search_index) {
            loadSmartSearchCatalog().then(() => {
              if (smartSearchState.open) renderSmartSearchResults();
            });
          }
        });
      }

      addSafeListener(smartSearchBtn, "click", (e) => {
        e.stopPropagation();
        window.__AGY_TOGGLE_SMART_SEARCH();
      });

      addSafeListener(window, "keydown", (e) => {
        if (!isCurrentInstance()) return;
        const isAltK = e.altKey && !e.ctrlKey && !e.metaKey && (e.key || "").toLowerCase() === "k";
        const isCtrlShiftK = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key || "").toLowerCase() === "k";
        if (isAltK || isCtrlShiftK) {
          e.preventDefault();
          e.stopPropagation();
          window.__AGY_TOGGLE_SMART_SEARCH();
        }
      }, true);

      row1.appendChild(smartSearchBtn);

      // 2. Reading Mode Prompt Toggle Button (📖 / ✏️)
      const toggleBtn = createDockBtn(
        "agy-toggle-prompt-btn",
        "📖",
        "Ẩn hoặc hiện ô nhập để tối đa không gian đọc",
        "rgba(255, 255, 255, 0.9)",
        "rgba(255, 255, 255, 0.08)",
        "rgba(255, 255, 255, 0.18)",
        1,
        48,
        16,
        21
      );
      toggleBtn.dataset.hidden = "0";
      function syncPromptBtnUi(hidden) {
        toggleBtn.dataset.hidden = hidden ? "1" : "0";
        toggleBtn.innerHTML = hidden ? "✏️" : "📖";
        toggleBtn.title = hidden ? "Hiện lại ô soạn thảo" : "Ẩn ô nhập để đọc tràn viền";
        toggleBtn.style.color = hidden ? "rgba(56, 189, 248, 0.95)" : "rgba(255, 255, 255, 0.9)";
        toggleBtn.style.borderColor = hidden ? "rgba(56, 189, 248, 0.5)" : "rgba(255, 255, 255, 0.18)";
        toggleBtn.style.background = hidden ? "rgba(56, 189, 248, 0.18)" : "rgba(255, 255, 255, 0.08)";
      }
      addSafeListener(toggleBtn, "click", (e) => {
        e.stopPropagation();
        const nextHidden = toggleBtn.dataset.hidden !== "1";
        if (!isChildChatIframeAlive() && hasChatDomInCurrentDoc() && typeof window.__AGY_LOCAL_CHAT_ACTION === "function") {
          window.__AGY_LOCAL_CHAT_ACTION("TOGGLE_PROMPT", { hidden: nextHidden });
          return;
        }
        const sentAt = Date.now();
        syncPromptBtnUi(nextHidden);
        document.querySelectorAll("iframe").forEach((ifr) => {
          try {
            ifr.contentWindow?.postMessage({ type: "AGY_TOGGLE_PROMPT", hidden: nextHidden }, "*");
          } catch (err) {}
        });
        setTimeout(() => {
          if (lastPromptAckAt < sentAt && !isChildChatIframeAlive() && !hasChatDomInCurrentDoc()) {
            syncPromptBtnUi(false);
            updateBar("⚠️ Khung chat chưa kết nối hoặc chưa có ô nhập (bấm 📋 soi DOM)!", "warning", 2600);
          }
        }, 420);
      });
      row1.appendChild(toggleBtn);

      // 3. Soi & Copy DOM Sidebar Button (📋)
      const dumpBtn = createDockBtn(
        "agy-dock-dump-btn",
        "📋",
        "Soi và Copy toàn bộ mã DOM của Sidebar / Danh sách dự án vào Clipboard & Bridge",
        "#f59e0b",
        "rgba(245, 158, 11, 0.16)",
        "rgba(245, 158, 11, 0.42)",
        1,
        48,
        16,
        20
      );
      addSafeListener(dumpBtn, "click", (e) => {
        e.stopPropagation();
        if (!isChildChatIframeAlive()) {
          if (hasChatDomInCurrentDoc() && typeof window.__AGY_LOCAL_CHAT_ACTION === "function") {
            window.__AGY_LOCAL_CHAT_ACTION("DUMP_DOM");
          } else {
            runTopFallbackDiagnostics();
          }
          return;
        }
        updateBar("Đang trích xuất DOM Sidebar...", "info", 1500);
        document.querySelectorAll("iframe").forEach((ifr) => {
          try {
            ifr.contentWindow?.postMessage({ type: "AGY_DUMP_SIDEBAR_REQ" }, "*");
          } catch (err) {}
        });
      });
      row1.appendChild(dumpBtn);

      // 4. Collapse Dock Button (▾)
      const collapseBtn = createDockBtn(
        "agy-dock-collapse-btn",
        "▾",
        "Thu gọn thanh điều khiển để đọc thông báo dưới đáy",
        "#cbd5e1",
        "rgba(255, 255, 255, 0.08)",
        "rgba(255, 255, 255, 0.18)",
        1,
        48,
        16,
        22
      );
      addSafeListener(collapseBtn, "click", (e) => {
        e.stopPropagation();
        row.style.display = "none";
        miniBtn.style.display = "flex";
        updateBar("Đã thu nhỏ thanh điều khiển thành nút ⚡ ở góc phải", "info", 2000);
      });
      row1.appendChild(collapseBtn);

      // ── ROW 2: Wide Thumb Quick-Send & Submit (56px tall, 12px gap) ─────────

      const shortcuts = [
        { char: "u", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.22)", border: "rgba(56, 189, 248, 0.5)", label: "Gửi nhanh 'u' (cài APK / update)" },
        { char: "o", color: "#34d399", bg: "rgba(52, 211, 153, 0.22)", border: "rgba(52, 211, 153, 0.5)", label: "Gửi nhanh 'o' (đồng ý / proceed)" },
        { char: "d", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.22)", border: "rgba(251, 191, 36, 0.5)", label: "Gửi nhanh 'd' (đã gửi hình, chờ text)" },
      ];

      shortcuts.forEach(({ char, color, bg, border, label }) => {
        const btn = createDockBtn(`agy-quick-${char}`, char, label, color, bg, border, 1, 56, 16, 24);
        btn.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace";
        addSafeListener(btn, "click", (e) => {
          e.stopPropagation();
          if (!isChildChatIframeAlive() && hasChatDomInCurrentDoc() && typeof window.__AGY_LOCAL_CHAT_ACTION === "function") {
            if (toggleBtn.dataset.hidden === "1") syncPromptBtnUi(false);
            window.__AGY_LOCAL_CHAT_ACTION("QUICK_SEND", { char });
            return;
          }
          updateBar(`Đã gửi '${char}'`, "info", 1500);
          if (toggleBtn.dataset.hidden === "1") syncPromptBtnUi(false);

          document.querySelectorAll("iframe").forEach((ifr) => {
            try {
              ifr.contentWindow?.postMessage({ type: "AGY_QUICK_SEND_V20", char: char }, "*");
            } catch (err) {}
          });
        });
        row2.appendChild(btn);
      });

      // Native-style Blue Arrow Send Button (extra wide thumb pill)
      const sendNowBtn = createDockBtn(
        "agy-quick-submit-btn",
        `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" style="display:block;">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
        `,
        "Gửi ngay nội dung đang có trong ô nhập (tương đương nút mũi tên xanh gốc)",
        "#ffffff",
        "#1a73e8",
        "rgba(255, 255, 255, 0.35)",
        1.25,
        56,
        16,
        18
      );
      sendNowBtn.style.boxShadow = "0 3px 10px rgba(26, 115, 232, 0.55)";

      addSafeListener(sendNowBtn, "click", (e) => {
        e.stopPropagation();
        if (!isChildChatIframeAlive() && hasChatDomInCurrentDoc() && typeof window.__AGY_LOCAL_CHAT_ACTION === "function") {
          if (toggleBtn.dataset.hidden === "1") syncPromptBtnUi(false);
          window.__AGY_LOCAL_CHAT_ACTION("DIRECT_SUBMIT");
          return;
        }
        updateBar("Đang gửi lệnh...", "info", 1500);
        if (toggleBtn.dataset.hidden === "1") syncPromptBtnUi(false);

        document.querySelectorAll("iframe").forEach((ifr) => {
          try {
            ifr.contentWindow?.postMessage({ type: "AGY_DIRECT_SUBMIT_V20" }, "*");
          } catch (err) {}
        });
      });
      row2.appendChild(sendNowBtn);

      row.appendChild(row1);
      row.appendChild(row2);

      container.appendChild(row);
      updateBridgeLedUi();
    }

    if (document.body) {
      initBottomControlDock();
    } else {
      addSafeListener(window, "DOMContentLoaded", initBottomControlDock);
    }
  }

  // ─── Deep Element Locator (Traverses DOM, Shadow DOM, Iframes) ───────────────
  function queryDeep(selector, root = document) {
    let results = [];
    try {
      results = Array.from(root.querySelectorAll(selector));
    } catch (e) {
      return [];
    }

    // Accessible iframes
    try {
      const iframes = root.querySelectorAll("iframe");
      for (const ifr of iframes) {
        try {
          const doc = ifr.contentDocument || ifr.contentWindow?.document;
          if (doc) results = results.concat(queryDeep(selector, doc));
        } catch (e) {}
      }
    } catch (e) {}

    // Shadow roots
    try {
      const allEls = root.querySelectorAll("*");
      for (const el of allEls) {
        if (el.shadowRoot) {
          results = results.concat(queryDeep(selector, el.shadowRoot));
        }
      }
    } catch (e) {}

    return results;
  }

  function isElementVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return (
      (r.width > 0 || r.height > 0) &&
      window.getComputedStyle(el).display !== "none" &&
      window.getComputedStyle(el).visibility !== "hidden"
    );
  }

  // ─── Track already-processed DOM nodes to prevent infinite re-triggering ─────
  const processedNodes = new WeakSet();

  // ─── Strict Approval Card & Hybrid Option Finder (Semantic + Max - 1 + No-Shield) ─
  function collectOptionRows(validCard, submitBtn) {
    // 1. Native radios / ARIA radios / ARIA options first
    const radios = Array.from(validCard.querySelectorAll('input[type="radio"], [role="radio"], [role="option"]'))
      .filter((el) => el !== submitBtn && !el.contains(submitBtn) && isElementVisible(el));
    if (radios.length >= 2) {
      return radios
        .map((r) => {
          if (r.tagName === "INPUT") {
            const label = r.closest("label, li, div");
            if (label && label.querySelectorAll('input[type="radio"]').length === 1) return label;
          }
          return r;
        })
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    }

    // 2. Semantic row scan: find single-option clickable rows without container wrappers
    const allNodes = Array.from(validCard.querySelectorAll("button, [role='button'], li, label, div"));
    const rawMatches = [];

    for (const el of allNodes) {
      if (el === validCard || el === submitBtn || el.contains(submitBtn)) continue;
      if (!isElementVisible(el)) continue;

      const r = el.getBoundingClientRect();
      if (r.height < 18 || r.height > 260 || r.width < 60) continue;

      const txt = (el.innerText || el.textContent || "").trim();
      if (!txt || txt.length > 1000) continue;

      const lower = txt.toLowerCase();
      const lines = txt.split(/\n+/).map((s) => s.trim()).filter(Boolean);

      // Skip containers wrapping multiple options
      const numberedLines = lines.filter((l) => /^\d+$/.test(l) || /^\d+\s+(yes|no|allow|always|cho|từ)/i.test(l));
      const hasMultipleNumberedOptions =
        numberedLines.length >= 2 &&
        lower.includes("allow this time") &&
        (lower.includes("always allow") || lower.includes("tell the agent"));
      const mixesYesAndNo =
        (lower.includes("yes, allow") || lower.includes("yes, and always")) &&
        (lower.includes("tell the agent what to do") || /\n\s*\d+\s+no\b/i.test(lower));

      if (hasMultipleNumberedOptions || mixesYesAndNo) continue;

      const looksLikeOption =
        /^[1-9]\s+[A-Za-zÀ-ỹ]/i.test(txt) ||
        /^[1-9]\n/.test(txt) ||
        lower.includes("yes, allow this time") ||
        lower.includes("yes, and always allow") ||
        lower.includes("always allow") ||
        lower.startsWith("no (") ||
        lower.startsWith("no ") ||
        lower.includes("tell the agent what to do instead") ||
        lower.includes("luôn cho phép") ||
        lower.includes("cho phép");

      if (looksLikeOption) {
        rawMatches.push(el);
      }
    }

    // Keep outermost single-option row while filtering out multi-row list wrappers
    const filtered = [];
    for (const el of rawMatches) {
      const wrappedChildren = rawMatches.filter((other) => other !== el && el.contains(other));
      const distinctTops = new Set(wrappedChildren.map((c) => Math.round(c.getBoundingClientRect().top / 16)));
      if (distinctTops.size >= 2) continue;

      const hasSingleRowAncestor = rawMatches.some((anc) => {
        if (anc === el || !anc.contains(el)) return false;
        const ancWrapped = rawMatches.filter((o) => o !== anc && anc.contains(o));
        const ancDistinct = new Set(ancWrapped.map((c) => Math.round(c.getBoundingClientRect().top / 16)));
        return ancDistinct.size < 2 && anc.getBoundingClientRect().height <= 240;
      });
      if (!hasSingleRowAncestor) {
        filtered.push(el);
      }
    }

    filtered.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    const uniqueRows = [];
    for (const el of filtered) {
      if (!uniqueRows.some((u) => u.contains(el) || el.contains(u))) {
        uniqueRows.push(el);
      }
    }
    return uniqueRows;
  }

  function normalizeOptionText(rawText) {
    return (rawText || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u0111\u0110]/g, "d")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isNegativeOptionText(rawText) {
    const t = normalizeOptionText(rawText);
    if (/^\d*\s*(no|deny|reject|cancel|skip|abort|refuse|tu choi|huy|bo qua|khong)(?:\s|$|\(|,|\.)/.test(t)) return true;
    if (t.includes("tell the agent what to do instead")) return true;
    return false;
  }

  function scoreApprovalOptionText(rawText) {
    const t = normalizeOptionText(rawText);
    const isAlways =
      t.includes("always allow") ||
      t.includes("always approve") ||
      t.includes("luon cho phep") ||
      t.includes("luon dong y");
    const isConversationScoped =
      t.includes("in this conversation") ||
      t.includes("this conversation") ||
      t.includes("for this chat");
    const isProjectScoped =
      t.includes("this workspace") ||
      t.includes("this project");
    const isOnceScoped =
      t.includes("allow this time") ||
      t.includes("allow once") ||
      t.includes("lan nay");

    if (isAlways && !isConversationScoped && !isProjectScoped && !isOnceScoped) return 100;
    if (isAlways && isProjectScoped) return 80;
    if (isAlways && isConversationScoped) return 60;
    if (isOnceScoped || t.includes("yes, allow")) return 40;
    return 10;
  }

  function selectHybridOption(validCard, btn, settings = null) {
    const rows = collectOptionRows(validCard, btn);
    if (rows.length < 2) return null;

    const indexed = rows.map((el, idx) => ({
      el,
      optionNum: idx + 1,
      text: (el.innerText || el.textContent || "").trim(),
    }));

    // Tier 1: No-Shield Blacklist — strictly exclude No / Deny / Reject / Skip rows
    const safeRows = indexed.filter((item) => !isNegativeOptionText(item.text));
    if (safeRows.length === 0) return null;

    // Tier 2A: User manual override (e.g. targetOption = 1..5), still protected by Tier 1 No-Shield
    const manualNum = settings && Number(settings.targetOption) > 0 ? Number(settings.targetOption) : 0;
    if (manualNum > 0) {
      const exact = safeRows.find((r) => r.optionNum === manualNum);
      if (exact) {
        return { ...exact, strategy: `Thu cong #${manualNum}`, totalOptions: indexed.length };
      }
      // If requested number was out of bounds or pointed to 'No', pick safest Max - 1
      const fallback = safeRows[safeRows.length - 1];
      return { ...fallback, strategy: `Max-1 An toan (thay #${manualNum})`, totalOptions: indexed.length };
    }

    // Tier 2B: Hybrid Auto Mode = Semantic Text Score + Max - 1 Convergence
    const scored = safeRows.map((item) => ({
      ...item,
      score: scoreApprovalOptionText(item.text),
    }));
    const maxScore = Math.max(...scored.map((s) => s.score));

    let chosen;
    let strategy;
    if (maxScore >= 80) {
      // Strong semantic match for 'Yes, and always allow' (tie-break toward Max - 1)
      const topMatches = scored.filter((s) => s.score === maxScore);
      chosen = topMatches[topMatches.length - 1];
      strategy = "Ket hop (Text + Max-1)";
    } else {
      // Future / localized UI where keywords changed: rely cleanly on Max - 1 (last safe option before No)
      chosen = safeRows[safeRows.length - 1];
      strategy = "Max-1 Du phong";
    }

    return { ...chosen, strategy, totalOptions: indexed.length };
  }

  function findApprovalDialog(settings = null) {
    // 1. Only consider REAL interactive buttons (never spans/divs/code in chat prose)
    const buttons = queryDeep("button, [role='button'], input[type='submit']");

    for (const btn of buttons) {
      if (processedNodes.has(btn)) continue;
      if (btn.disabled || btn.getAttribute("aria-disabled") === "true") continue;
      if (btn.closest("#agy-control-container, #agy-autoapprove-overlay, pre, code")) continue;
      if (!isElementVisible(btn)) continue;

      const t = (btn.innerText || btn.textContent || "").trim().toLowerCase();
      const isSubmit =
        (t === "submit" || t === "submit ↵" || /^submit(\s+↵)?$/i.test(t)) &&
        t.length <= 15;

      if (!isSubmit) continue;

      // 2. Walk up from the Submit button (max 7 levels) to find its compact Approval Card
      let card = btn.parentElement;
      let depth = 0;
      let validCard = null;

      while (card && card !== document.body && depth < 7) {
        const rect = card.getBoundingClientRect();
        const cardText = (card.innerText || "").trim();
        const lowerCard = cardText.toLowerCase();

        const hasAllowKeywords =
          lowerCard.includes("yes, and always allow") ||
          lowerCard.includes("yes, allow this time") ||
          lowerCard.includes("always allow") ||
          (lowerCard.includes("tell the agent what to do instead") && card.querySelectorAll('input[type="radio"], [role="radio"], div').length >= 3);

        if (rect.height > 55 && rect.height < 960 && hasAllowKeywords) {
          validCard = card;
          break;
        }
        card = card.parentElement;
        depth++;
      }

      if (!validCard || processedNodes.has(validCard)) continue;

      // 3. Apply Hybrid Option Selection (Semantic Text + Max - 1 + No-Shield)
      const picked = selectHybridOption(validCard, btn, settings);
      if (picked && picked.el && isElementVisible(picked.el)) {
        return {
          card: validCard,
          optChosen: picked.el,
          optNumber: picked.optionNum,
          optionText: picked.text,
          strategy: picked.strategy,
          totalOptions: picked.totalOptions,
          submitBtn: btn,
        };
      }
    }

    return null;
  }

  // ─── Force Click Helpers (with Touch and Real Coordinates) ───────────────────
  function forceClick(el) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = rect.left + Math.max(5, rect.width / 2);
    const y = rect.top + Math.max(5, rect.height / 2);

    const eventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
      button: 0,
      buttons: 1,
    };

    // 1. Touch Events (crucial for mobile Chromium & React Touch components)
    try {
      const touch = new Touch({
        identifier: Date.now(),
        target: el,
        clientX: x,
        clientY: y,
        screenX: x,
        screenY: y,
        pageX: x,
        pageY: y,
      });
      el.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, cancelable: true, view: window, touches: [touch], targetTouches: [touch], changedTouches: [touch] }));
      el.dispatchEvent(new TouchEvent("touchend", { bubbles: true, cancelable: true, view: window, touches: [], targetTouches: [], changedTouches: [touch] }));
    } catch (e) {}

    // 2. Pointer & Mouse Events
    try {
      el.dispatchEvent(new PointerEvent("pointerdown", { ...eventInit, pointerType: "touch", isPrimary: true }));
      el.dispatchEvent(new MouseEvent("mousedown", eventInit));
      el.dispatchEvent(new PointerEvent("pointerup", { ...eventInit, pointerType: "touch", isPrimary: true }));
      el.dispatchEvent(new MouseEvent("mouseup", eventInit));
      el.dispatchEvent(new MouseEvent("click", eventInit));
    } catch (e) {}

    try { el.click(); } catch (e) {}
  }

  function setReactInputValue(el, value) {
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "checked")?.set;
    if (setter) {
      setter.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  // ─── Countdown Overlay ────────────────────────────────────────────────────────
  function showCountdown(delay, remaining, classification, previewText, onCancel, onNow, optNumber = 3, strategy = "Ket hop", totalOptions = 4) {
    removeCountdown();
    const isSafe = classification === "safe";

    const overlay = document.createElement("div");
    overlay.id = "agy-autoapprove-overlay";
    overlay.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;
      background: ${isSafe ? "#0f2317" : "#280f12"};
      border: 2px solid ${isSafe ? "#10b981" : "#f43f5e"};
      border-radius: 14px; padding: 14px 18px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px; color: #f8fafc;
      box-shadow: 0 10px 30px rgba(0,0,0,0.7);
      display: flex; flex-direction: column; gap: 10px;
      min-width: 280px; max-width: 360px;
    `;

    const badge = isSafe
      ? `<span style="background:#10b981;color:#fff;border-radius:4px;padding:2px 7px;font-size:10px;font-weight:700">AN TOAN</span>`
      : `<span style="background:#f43f5e;color:#fff;border-radius:4px;padding:2px 7px;font-size:10px;font-weight:700">NGUY HIEM</span>`;

    const clean = (previewText || "").replace(/\s+/g, " ").trim().substring(0, 85);

    overlay.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:7px;">
          <span style="font-size:16px;">${isSafe ? "⚡" : "⚠️"}</span>
          <strong style="font-size:13px;">AGY Auto-Approve</strong>
        </div>
        ${badge}
      </div>
      <div style="font-size:11px;color:#cbd5e1;line-height:1.4;border-left:2px solid #64748b;padding-left:8px;max-height:45px;overflow:hidden;">
        ${clean}${clean.length >= 85 ? "…" : ""}
      </div>
      <div style="font-size:12px;color:#e2e8f0;">
        Tu dong chon <strong style="color:#38bdf8;">Option ${optNumber}${totalOptions ? "/" + totalOptions : ""}</strong> <span style="font-size:10.5px;color:#94a3b8;">(${strategy})</span> va Submit sau
        <strong id="agy-secs" style="color:#fff;font-size:18px;font-family:monospace;">${remaining}</strong>s
      </div>
      <div style="height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;">
        <div id="agy-progress-fill" style="height:100%;width:100%;background:${isSafe ? "#10b981" : "#f43f5e"};transition:width 1s linear;"></div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:2px;">
        <button id="agy-cancel-btn" style="background:#334155;color:#f8fafc;border:none;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;">✕ Huy</button>
        <button id="agy-now-btn" style="background:#0284c7;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;">⚡ Phe duyet ngay</button>
      </div>
    `;

    document.body.appendChild(overlay);
    countdownOverlay = overlay;

    overlay.querySelector("#agy-cancel-btn").addEventListener("click", () => {
      cancelAutoApprove();
      onCancel();
    });

    overlay.querySelector("#agy-now-btn").addEventListener("click", () => {
      clearInterval(countdownTimer);
      countdownTimer = null;
      removeCountdown();
      onNow();
    });
  }

  function updateCountdown(secs, total) {
    const el = document.getElementById("agy-secs");
    if (el) el.textContent = secs;
    const fill = document.getElementById("agy-progress-fill");
    if (fill && total > 0) {
      fill.style.width = `${Math.max(0, (secs / total) * 100)}%`;
    }
  }

  function removeCountdown() {
    if (countdownOverlay) {
      countdownOverlay.remove();
      countdownOverlay = null;
    }
  }

  const tickWaiters = new Set();
  let activeCountdownTick = null;

  function flushTickWaiters() {
    if (typeof activeCountdownTick === "function") {
      try { activeCountdownTick(); } catch (e) {}
    }
    for (const fn of Array.from(tickWaiters)) {
      try { fn(); } catch (e) {}
    }
  }

  function smartDelay(ms) {
    return new Promise((resolve) => {
      const deadline = Date.now() + ms;
      let done = false;
      const finish = () => {
        if (!done) {
          done = true;
          tickWaiters.delete(check);
          resolve();
        }
      };
      const check = () => {
        if (Date.now() >= deadline) finish();
      };
      tickWaiters.add(check);
      setTimeout(finish, ms);
    });
  }

  function cancelAutoApprove() {
    clearInterval(countdownTimer);
    countdownTimer = null;
    activeCountdownTick = null;
    removeCountdown();
    isProcessing = false;
    updateBar("Nguoi dung da bam Huy — bo qua lan nay", "warning", 3000);
  }

  // ─── Approval Execution ───────────────────────────────────────────────────────
  async function executeApproval(card, optEl, submitBtn, fullText, settings, dialogKey, optNumber = 3, meta = {}) {
    const totalOptions = meta.totalOptions || 4;
    const optLabel = `Option ${optNumber}${totalOptions ? "/" + totalOptions : ""}`;
    // Mark card and buttons as processed immediately so they can never re-trigger
    if (card) processedNodes.add(card);
    if (optEl) processedNodes.add(optEl);
    if (submitBtn) processedNodes.add(submitBtn);

    updateBar(`Dang click ${optLabel}...`, "warning", 3000);

    // 1. Force click Option row and its internal targets
    forceClick(optEl);

    const subTarget = optEl.querySelector('span, p, div, [role="button"]') || optEl;
    if (subTarget !== optEl) {
      forceClick(subTarget);
    }

    const internalRadio = optEl.querySelector('input[type="radio"]') ||
      (optEl.htmlFor ? document.getElementById(optEl.htmlFor) : null);

    if (internalRadio) {
      forceClick(internalRadio);
      setReactInputValue(internalRadio, true);
    }

    // Wait 400ms for React state update (resilient to background tab throttling)
    await smartDelay(400);

    // 2. Force click Submit
    if (typeof window.__AGY_MARK_RUNNING === "function") {
      window.__AGY_MARK_RUNNING(1600);
    }
    updateBar("Dang click Submit...", "warning", 3000);
    forceClick(submitBtn);

    const form = submitBtn.closest("form");
    if (form) {
      try { form.requestSubmit(submitBtn); } catch (e) { form.submit(); }
    }

    // Wait 500ms and verify if submit actually closed the dialog
    await smartDelay(500);
    if (submitBtn && isElementVisible(submitBtn) && !submitBtn.disabled) {
      forceClick(submitBtn);
      await smartDelay(300);
    }

    updateBar(`✓ Da phe duyet (${optLabel})!`, "success", 2500);

    const chatTitle = typeof getCurrentConversationTitle === "function" ? getCurrentConversationTitle() : "";
    try {
      await chrome.storage.local.set({
        agy_last_auto_choice: {
          option: optNumber,
          total: totalOptions,
          strategy: meta.strategy || "Ket hop",
          text: meta.optionText || "",
          chatTitle,
          time: new Date().toISOString(),
        },
      });
    } catch (e) {}

    await logEvent({
      time: new Date().toISOString(),
      classification: window.AGY_RULES?.classify ? window.AGY_RULES.classify(fullText) : "safe",
      delay: settings._usedDelay || 0,
      preview: fullText.substring(0, 100),
      option: optNumber,
      totalOptions,
      strategy: meta.strategy || "Ket hop",
      chatTitle,
    });

    lastProcessedKey = dialogKey;
    isProcessing = false;
    window.__AGY_LAST_APPROVAL_DONE_AT = Date.now();
    if (typeof window.__AGY_ON_APPROVAL_DONE === "function") {
      try { window.__AGY_ON_APPROVAL_DONE(); } catch (e) {}
    }
  }

  // ─── Main Scanning Loop ───────────────────────────────────────────────────────
  let isScanning = false;
  async function scanAndProcess() {
    if (!isChatOwnerActive() || isProcessing || isScanning) return;
    isScanning = true;
    try {
      if (typeof window.__AGY_BEFORE_SCAN_REVEAL === "function") {
        window.__AGY_BEFORE_SCAN_REVEAL();
      }
      const settings = await getSettings();
      if (!isCurrentInstance() || isProcessing) return;

      const dialog = findApprovalDialog(settings);
      if (!dialog) {
        if (typeof window.__AGY_AFTER_APPROVAL_RESTORE === "function") {
          window.__AGY_AFTER_APPROVAL_RESTORE();
        }
        return;
      }

      const { card, optChosen, optNumber, optionText, strategy, totalOptions, submitBtn } = dialog;
      const fullText = card.innerText || card.textContent || "";

      // Stable dialogKey based on question and command, ignoring dynamic spinners
      const questionEl = card.querySelector('h1, h2, h3, h4, strong, [class*="title"]') || optChosen.parentElement?.parentElement;
      const codeEl = card.querySelector('code, pre, [class*="command"]');
      const dialogKey = ((questionEl?.innerText || "") + "::" + (codeEl?.innerText || "")).trim() || fullText.substring(0, 80);

      if (dialogKey === lastProcessedKey) {
        processedNodes.add(card);
        processedNodes.add(submitBtn);
        return;
      }

      if (!settings.enabled) {
        updateBar("Extension dang bi TAT trong popup", "warning", 3000);
        return;
      }

      isProcessing = true;

      const classification = window.AGY_RULES?.classify
        ? window.AGY_RULES.classify(fullText)
        : "safe";

      const delay = classification === "safe" ? settings.delaySafe : settings.delayDangerous;
      settings._usedDelay = delay;

      updateBar(
        `[${classification.toUpperCase()}] Option ${optNumber}/${totalOptions || 4} sau ${delay}s...`,
        classification === "safe" ? "success" : "warning",
        (delay + 2) * 1000
      );

      const endTime = Date.now() + delay * 1000;
      let triggered = false;

      const finishCountdown = () => {
        if (triggered) return;
        triggered = true;
        clearInterval(countdownTimer);
        countdownTimer = null;
        activeCountdownTick = null;
        removeCountdown();
        executeApproval(card, optChosen, submitBtn, fullText, settings, dialogKey, optNumber, {
          totalOptions,
          strategy,
          optionText,
        });
      };

      showCountdown(
        delay,
        delay,
        classification,
        fullText,
        () => {
          triggered = true;
          activeCountdownTick = null;
          processedNodes.add(card);
          processedNodes.add(submitBtn);
          lastProcessedKey = dialogKey;
        },
        finishCountdown,
        optNumber,
        strategy,
        totalOptions
      );

      activeCountdownTick = () => {
        if (triggered) return;
        const left = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        updateCountdown(left, delay);
        if (left <= 0) {
          finishCountdown();
        }
      };

      window.__AGY_COUNTDOWN = countdownTimer = setInterval(activeCountdownTick, 350);
    } finally {
      isScanning = false;
    }
  }

  // ─── Image Lightbox / Modal Auto-Detection & Ergonomic Close Buttons ──────────
  function initImageModalHandler() {
    let activeModal = null;

    function findActiveImageModal() {
      // 1. MUST NOT run in top frame (top frame never has image lightbox)
      if (isTop) return null;

      // 2. Candidate modals must be dialogs/overlays
      const candidates = document.querySelectorAll(
        'div[role="dialog"], [aria-modal="true"], dialog[open], div.fixed.inset-0, div[class*="lightbox"], div[class*="image-preview"]'
      );

      for (const modal of candidates) {
        // Exclude our own extension UI
        if (modal.id && modal.id.startsWith("agy-")) continue;
        if (modal.closest("#agy-control-container, #agy-autoapprove-overlay")) continue;

        // MUST NOT be inside the chat message scroll container
        if (modal.closest('.overflow-y-auto, .overflow-y-scroll, [class*="conversation"]')) {
          continue;
        }

        // Must be visible and cover at least 50% width and 40% height
        const rect = modal.getBoundingClientRect();
        if (rect.width < window.innerWidth * 0.5 || rect.height < window.innerHeight * 0.4) {
          continue;
        }
        const style = window.getComputedStyle(modal);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
          continue;
        }

        // Must contain an enlarged image (not avatar <= 48px or googleusercontent avatar)
        const imgs = Array.from(modal.querySelectorAll("img")).filter((img) => {
          const ir = img.getBoundingClientRect();
          const isAvatar = (img.src || "").includes("googleusercontent.com/a/");
          return ir.width > 120 && ir.height > 120 && !isAvatar;
        });

        if (imgs.length === 0) continue;

        // Must have Zoom toolbar or Close button or zoom percentage text
        const hasZoomOrClose = modal.querySelector(
          'button[aria-label*="close" i], button[title*="close" i], button[aria-label*="zoom" i], button:has(svg)'
        ) || /\b\d{2,3}%\b/.test(modal.textContent || "");

        if (hasZoomOrClose) {
          return modal;
        }
      }

      return null;
    }

    function executeCloseImage(modal) {
      // 1. Try finding and clicking native close button
      const closeSelectors = [
        'button[aria-label*="close" i]',
        'button[title*="close" i]',
        'button[class*="close" i]',
        '[role="button"][aria-label*="close" i]',
        '[role="button"][title*="close" i]',
        'button:has(svg)',
        '[role="button"]:has(svg)',
      ];

      let clicked = false;
      if (modal) {
        for (const sel of closeSelectors) {
          try {
            const btn = modal.querySelector(sel);
            if (btn && isElementVisible(btn)) {
              forceClick(btn);
              clicked = true;
              break;
            }
          } catch (e) {}
        }
      }

      if (!clicked) {
        for (const sel of closeSelectors) {
          try {
            const btn = document.querySelector(sel);
            if (btn && isElementVisible(btn)) {
              forceClick(btn);
              clicked = true;
              break;
            }
          } catch (e) {}
        }
      }

      // 2. Dispatch Escape key event
      const keyOpts = { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true, cancelable: true, composed: true };
      const escDown = new KeyboardEvent("keydown", keyOpts);
      const escUp = new KeyboardEvent("keyup", keyOpts);

      if (modal) {
        modal.dispatchEvent(escDown);
        modal.dispatchEvent(escUp);
      }
      document.dispatchEvent(escDown);
      document.dispatchEvent(escUp);
      window.dispatchEvent(escDown);
      window.dispatchEvent(escUp);

      setTimeout(checkState, 150);
      setTimeout(checkState, 350);
    }

    function createBigCloseButtons(modal) {
      if (!document.getElementById("agy-big-close-image-btn")) {
        const pill = document.createElement("button");
        pill.id = "agy-big-close-image-btn";
        pill.innerHTML = `
          <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#ef4444;color:#fff;font-size:12.5px;font-weight:bold;margin-right:8px;flex-shrink:0;">✕</span>
          <span style="letter-spacing:0.3px;">Đóng ảnh</span>
        `;
        pill.style.cssText = `
          position: fixed; bottom: 24px; right: 20px;
          z-index: 2147483647;
          display: flex; align-items: center; justify-content: center;
          padding: 10px 20px; border-radius: 28px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px; font-weight: 600;
          color: #ffffff;
          background: rgba(15, 23, 42, 0.88);
          backdrop-filter: blur(16px) saturate(160%);
          -webkit-backdrop-filter: blur(16px) saturate(160%);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
          cursor: pointer; user-select: none;
          touch-action: manipulation;
          transition: transform 0.15s ease, background 0.15s ease;
        `;
        pill.addEventListener("pointerdown", () => {
          pill.style.transform = "scale(0.94)";
        });
        pill.addEventListener("pointerup", () => {
          pill.style.transform = "scale(1)";
        });
        addSafeListener(pill, "click", (e) => {
          e.stopPropagation();
          executeCloseImage(modal);
        });
        (document.body || document.documentElement).appendChild(pill);
      }
    }

    function removeBigCloseButtons() {
      const pill = document.getElementById("agy-big-close-image-btn");
      if (pill) pill.remove();
      const topBtn = document.getElementById("agy-top-close-image-btn");
      if (topBtn) topBtn.remove();
    }

    function attachBackdropDismiss(modal) {
      if (!modal || modal.__agy_backdrop_attached) return;
      modal.__agy_backdrop_attached = true;
      addSafeListener(modal, "pointerdown", (e) => {
        const target = e.target;
        if (target.id && target.id.startsWith("agy-")) return;
        if (target.tagName === "IMG" || target.closest("img")) return;
        if (target.closest("button, [role='button'], [class*='toolbar'], [class*='control']")) return;
        executeCloseImage(modal);
      });
    }

    function checkState() {
      if (!isChatOwnerActive()) return;
      const modal = findActiveImageModal();
      if (modal) {
        activeModal = modal;
        if (!isTop) {
          try {
            window.top.postMessage({ type: "AGY_IMAGE_MODAL", isOpen: true }, "*");
          } catch (e) {}
        } else {
          hideControlContainer();
        }
        createBigCloseButtons(modal);
        attachBackdropDismiss(modal);
      } else {
        if (activeModal) {
          activeModal = null;
          if (!isTop) {
            try {
              window.top.postMessage({ type: "AGY_IMAGE_MODAL", isOpen: false }, "*");
            } catch (e) {}
          } else {
            restoreControlContainer();
          }
          removeBigCloseButtons();
        }
      }
    }

    window.__AGY_IMAGE_INTERVAL = setInterval(checkState, 400);

    addSafeListener(document, "click", (e) => {
      if (e.target.tagName === "IMG" || e.target.closest("img, [class*='image']")) {
        setTimeout(checkState, 100);
        setTimeout(checkState, 300);
        setTimeout(checkState, 600);
      }
    });

    checkState();
  }

  // ─── Polling, Mutation, Keyboard — runs in chat iframe OR directly in top on remote URLs ─
  {
    window.__AGY_INTERVAL = setInterval(scanAndProcess, 600);

    window.__AGY_OBSERVER = new MutationObserver((mutations) => {
      const isOnlyOurUI = mutations.every((m) => {
        const node = m.target;
        return (
          (node.id && node.id.startsWith("agy-")) ||
          (node.getAttribute && node.getAttribute("data-agy-ui") === "1") ||
          (node.closest && node.closest('[id^="agy-"], [data-agy-ui="1"], .agy-handoff-bar, .agy-result-bar, #agy-smart-search-overlay'))
        );
      });
      if (isOnlyOurUI || !isChatOwnerActive()) return;
      scanAndProcess();
      if (typeof window.__AGY_CHECK_IDLE_BG === "function") {
        window.__AGY_CHECK_IDLE_BG();
      }
      if (typeof window.__AGY_SCAN_HANDOFFS === "function") {
        window.__AGY_SCAN_HANDOFFS();
      }
    });

    window.__AGY_OBSERVER.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // ─── Mobile Virtual Keyboard Lifter (Proven v11 Core + Clean Dismissal) ──
    function initMobileKeyboardHandler() {
      const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      if (!isTouch) return;

      let activeInput = null;
      let activeScrollContainer = null;
      let scrollTimer = null;

      function findScrollContainer(el) {
        return el?.closest(".overflow-y-auto, .overflow-y-scroll") ||
               document.querySelector("div.w-full.flex.h-full.min-h-0.flex-col.items-center.relative.overflow-y-auto") ||
               document.querySelector(".overflow-y-auto");
      }

      function isInsidePromptArea(target) {
        if (!target) return false;
        return !!(
          target.closest('[id*="InputBox"]') ||
          target.closest('[id*="input"]') ||
          target.closest('[class*="InputBox"]') ||
          target.closest('[class*="prompt"]') ||
          target.closest('form') ||
          (activeInput && (activeInput === target || activeInput.contains(target)))
        );
      }

      function lower() {
        if (activeScrollContainer) {
          activeScrollContainer.style.paddingBottom = "";
          activeScrollContainer = null;
        }
        activeInput = null;
      }

      // 1. FOCUS: Lift the prompt box (proven v11 logic)
      addSafeListener(document, "focusin", (e) => {
        if (!isChatOwnerActive()) return;
        const el = e.target;
        if (!el || el.closest?.('[id^="agy-"]')) return;
        if (
          el.tagName === "TEXTAREA" ||
          el.tagName === "INPUT" ||
          el.getAttribute("contenteditable") === "true" ||
          el.getAttribute("contenteditable") === "plaintext-only" ||
          el.getAttribute("role") === "textbox" ||
          el.getAttribute("role") === "combobox"
        ) {
          activeInput = el;
          activeScrollContainer = findScrollContainer(el);

          if (activeScrollContainer) {
            activeScrollContainer.style.paddingBottom = "55vh";
          }

          clearTimeout(scrollTimer);
          scrollTimer = setTimeout(() => {
            const target = el.closest("form") ||
                           el.closest("[class*='rounded-'], [class*='border-']") ||
                           el.closest("[class*='chat'], [class*='input'], [class*='prompt'], [id*='InputBox']") || el;
            target.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 320);
        }
      });

      // 2. FOCUSOUT: Lower only when truly leaving the prompt area
      addSafeListener(document, "focusout", () => {
        setTimeout(() => {
          const ae = document.activeElement;
          if (!isInsidePromptArea(ae)) {
            lower();
          }
        }, 200);
      });

      // 3. TAP OUTSIDE: Dismiss keyboard and lower
      addSafeListener(document, "pointerdown", (e) => {
        if (!activeInput) return;
        const target = e.target;
        if (isInsidePromptArea(target)) return;
        if (target.closest("button, a, [role='button']")) return;
        activeInput.blur();
        lower();
      });

      // 4. CLICK SEND: Dismiss keyboard and lower
      addSafeListener(document, "click", (e) => {
        if (!activeInput) return;
        const btn = e.target.closest("button, [role='button']");
        if (btn) {
          const text = (btn.getAttribute("aria-label") || btn.title || btn.innerText || "").toLowerCase();
          if (text.includes("send") || text.includes("submit") || text.includes("gửi") || btn.querySelector('svg')) {
            setTimeout(() => {
              if (activeInput) activeInput.blur();
              lower();
            }, 100);
          }
        }
      });
    }

    // ─── Mobile UI Polish, Reading Mode & Quick Command Handler ─────────────
    function initMobileEnhancements() {
      const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

      const styleId = "agy-mobile-enhancements";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          /* 1. Large readable text for mobile (18px) - touch only */
          ${isTouch ? `
          [class*="prose"]:not([id^="agy-"] *), [class*="markdown"]:not([id^="agy-"] *), [class*="message"]:not([id^="agy-"] *), p:not([id^="agy-"] *), li:not([id^="agy-"] *) {
            font-size: 18px !important;
            line-height: 1.7 !important;
          }
          [role="combobox"]:not([id^="agy-"] *), textarea:not([id^="agy-"] *), input:not([id^="agy-"] *) {
            font-size: 18px !important;
          }
          pre:not([id^="agy-"] *), code:not([id^="agy-"] *) {
            font-size: 14.5px !important;
          }

          /* 2. Responsive Tables -> Touch-friendly Vertical Cards */
          table {
            display: block !important;
            width: 100% !important;
            border: none !important;
            margin: 12px 0 !important;
          }
          thead {
            display: none !important;
          }
          tbody {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
            width: 100% !important;
          }
          tr {
            display: flex !important;
            flex-direction: column !important;
            padding: 12px 14px !important;
            background: rgba(120, 120, 120, 0.08) !important;
            border: 1px solid rgba(120, 120, 120, 0.22) !important;
            border-radius: 12px !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12) !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          td {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 7px 0 !important;
            border: none !important;
            border-bottom: 1px dashed rgba(120, 120, 120, 0.18) !important;
            font-size: 15px !important;
            text-align: right !important;
            width: 100% !important;
          }
          td:last-child {
            border-bottom: none !important;
          }
          ` : ""}

          /* 3. Bottom breathing room so 2-row floating dock never hides chat footer */
          body:not(.agy-reading-mode) .overflow-y-auto:not([contenteditable="true"]):not([role="combobox"]):not([data-testid="conversation-list-sidebar"] *) {
            padding-bottom: 170px !important;
          }

          /* 4. Reading Mode: hide ONLY verified prompt composer containers (never Search modal or chat feed) */
          body.agy-reading-mode .overflow-y-auto:not([contenteditable="true"]):not([role="combobox"]):not([data-testid="conversation-list-sidebar"] *) {
            padding-bottom: 160px !important;
          }
          body.agy-reading-mode .agy-hidden-prompt-container,
          body.agy-reading-mode [data-agy-prompt-hidden="1"] {
            display: none !important;
            height: 0 !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
          /* Fail-safe: NEVER hide a container holding radio options / approval prompt */
          body.agy-reading-mode .agy-hidden-prompt-container:has(input[type="radio"], [role="radio"], [role="option"]),
          body.agy-reading-mode [data-agy-prompt-hidden="1"]:has(input[type="radio"], [role="radio"], [role="option"]) {
            display: block !important;
            height: auto !important;
            min-height: initial !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
          }
        `;
        document.head.appendChild(style);
      }

      let isPromptHidden = false;
      let pausedReadingForApproval = false;

      function isApprovalContainerNode(el) {
        if (!el) return false;
        const txt = normalizeOptionText(el.textContent || "");
        if (
          txt.includes("yes, allow this time") ||
          txt.includes("yes, and always allow") ||
          txt.includes("tell the agent what to do instead")
        ) {
          return true;
        }
        if (el.querySelectorAll('input[type="radio"], [role="radio"], [role="option"]').length >= 2) {
          return true;
        }
        const hasSubmitBtn = Array.from(el.querySelectorAll('button, [role="button"], input[type="submit"]')).some((b) =>
          /^submit(\s+↵)?$/i.test((b.textContent || "").trim())
        );
        return hasSubmitBtn && (txt.includes("allow") || txt.includes("waiting for user input"));
      }

      function findRealChatInputBox() {
        const candidates = queryDeep(
          '[id*="agentSidePanelInputBox" i], [data-lexical-editor="true"], [role="combobox"][contenteditable], [role="textbox"][contenteditable], [contenteditable="true"], [contenteditable="plaintext-only"], textarea, input[type="text"][placeholder*="Ask" i], input[placeholder*="prompt" i], input[placeholder*="mention" i]'
        );
        const filtered = candidates.filter((el) => {
          if (el.closest('[data-testid="fastpick"], [data-testid="fast-pick-viewport"], [role="dialog"]')) return false;
          if (el.closest('[role="navigation"], [data-testid="conversation-list-sidebar"], nav, aside, header, [id^="agy-"]')) return false;
          if (el.tagName === "INPUT" && (el.type === "search" || el.type === "checkbox" || el.type === "radio" || el.type === "hidden")) return false;
          if (el.parentElement?.closest('[contenteditable="true"], [contenteditable="plaintext-only"]')) return false;
          return true;
        });
        if (filtered.length === 0) return null;
        // Prefer lowest element in viewport (or existing hidden composer box)
        filtered.sort((a, b) => {
          const ab = a.getBoundingClientRect().bottom;
          const bb = b.getBoundingClientRect().bottom;
          if (bb !== ab) return bb - ab;
          return (b.closest('[data-agy-prompt-hidden="1"]') ? 1 : 0) - (a.closest('[data-agy-prompt-hidden="1"]') ? 1 : 0);
        });
        return filtered[0];
      }

      function findPromptContainerToHide(box) {
        if (!box) return null;
        let best = box.closest('[id*="agentSidePanelInputBox" i]') || box.closest("form") || box;
        let cur = best;
        const maxH = Math.min(340, Math.max(220, window.innerHeight * 0.45));
        while (cur && cur.parentElement && cur.parentElement !== document.body && cur.parentElement !== document.documentElement) {
          const parent = cur.parentElement;
          if (parent.matches("main, nav, aside, header, [role='dialog']")) break;
          if (parent.classList.contains("overflow-y-auto")) break;
          if (isApprovalContainerNode(parent)) break;
          // Do not swallow sibling Approval cards or action banners sitting above the input card
          const hasSiblingInteractiveCard = Array.from(parent.children).some(
            (ch) =>
              ch !== cur &&
              !cur.contains(ch) &&
              (ch.textContent || "").trim().length > 0 &&
              (isApprovalContainerNode(ch) || !!ch.querySelector('input[type="radio"], [role="radio"], button, [class*="rounded-"]'))
          );
          if (hasSiblingInteractiveCard) break;
          // Stop before climbing into the parent flex column that holds the sibling message feed
          const hasSiblingFeed = Array.from(parent.querySelectorAll(".overflow-y-auto")).some(
            (sc) => !cur.contains(sc) && sc !== cur && sc.getBoundingClientRect().height > 100
          );
          if (hasSiblingFeed) break;
          const rect = parent.getBoundingClientRect();
          if (rect.height > 0 && rect.height >= maxH) break;
          best = parent;
          cur = parent;
        }
        return best;
      }

      function findChatScroller() {
        const scrollers = Array.from(document.querySelectorAll(".overflow-y-auto")).filter((sc) => {
          if (sc.closest('[data-testid="conversation-list-sidebar"], [data-testid="fastpick"], [role="dialog"], nav, aside')) return false;
          if (sc.getAttribute("contenteditable") === "true" || sc.getAttribute("role") === "combobox") return false;
          const r = sc.getBoundingClientRect();
          return r.width > 180 && r.height > 140;
        });
        if (scrollers.length === 0) return null;
        scrollers.sort((a, b) => {
          const ar = a.getBoundingClientRect();
          const br = b.getBoundingClientRect();
          return br.width * br.height - ar.width * ar.height;
        });
        return scrollers[0];
      }

      function applyPromptVisibility() {
        if (isPromptHidden) {
          const box = findRealChatInputBox();
          const containerToHide = findPromptContainerToHide(box);
          if (!box || !containerToHide) {
            isPromptHidden = false;
            pausedReadingForApproval = false;
            document.body.classList.remove("agy-reading-mode");
            try {
              window.top.postMessage({ type: "AGY_PROMPT_STATE", hidden: false }, "*");
            } catch (err) {}
            updateBar("⚠️ Trang này chưa có ô soạn thảo để ẩn/hiện!", "warning", 2200);
            return;
          }
          if (isApprovalContainerNode(containerToHide)) {
            pausedReadingForApproval = true;
            document.body.classList.remove("agy-reading-mode");
            try {
              window.top.postMessage({ type: "AGY_PROMPT_STATE", hidden: false }, "*");
            } catch (err) {}
            updateBar("⚠️ Đang có hộp thoại duyệt — tạm giữ hiển thị để xử lý!", "warning", 2000);
            return;
          }
          document.body.classList.add("agy-reading-mode");
          containerToHide.classList.add("agy-hidden-prompt-container");
          containerToHide.setAttribute("data-agy-prompt-hidden", "1");
          try {
            window.top.postMessage({ type: "AGY_PROMPT_STATE", hidden: true }, "*");
          } catch (err) {}
          updateBar("📖 Đã ẩn ô soạn thảo — Chế độ đọc rộng", "info", 1500);
        } else {
          pausedReadingForApproval = false;
          document.body.classList.remove("agy-reading-mode");
          document.querySelectorAll('.agy-hidden-prompt-container, [data-agy-prompt-hidden="1"]').forEach((el) => {
            el.classList.remove("agy-hidden-prompt-container");
            el.removeAttribute("data-agy-prompt-hidden");
            el.style.display = "";
          });
          const box = findRealChatInputBox();
          const containerToShow = findPromptContainerToHide(box);
          if (containerToShow) {
            containerToShow.classList.remove("agy-hidden-prompt-container");
            containerToShow.removeAttribute("data-agy-prompt-hidden");
            containerToShow.style.display = "";
            if (isTouch) containerToShow.style.marginBottom = "62px";
          }
          try {
            window.top.postMessage({ type: "AGY_PROMPT_STATE", hidden: false }, "*");
          } catch (err) {}
          updateBar(box ? "✏️ Đã hiện lại ô soạn thảo" : "✏️ Đã tắt chế độ ẩn (chưa thấy ô nhập ở khung này)", "info", 1600);
        }

        const sc = findChatScroller();
        if (sc) {
          sc.style.paddingBottom = isPromptHidden && !pausedReadingForApproval ? "160px" : "170px";
        }
      }

      window.__AGY_BEFORE_SCAN_REVEAL = () => {
        const hiddenNodes = Array.from(
          document.querySelectorAll('.agy-hidden-prompt-container, [data-agy-prompt-hidden="1"]')
        );
        if (hiddenNodes.length === 0) return;
        let revealed = false;
        for (const el of hiddenNodes) {
          if (isApprovalContainerNode(el)) {
            el.classList.remove("agy-hidden-prompt-container");
            el.removeAttribute("data-agy-prompt-hidden");
            el.style.display = "";
            revealed = true;
          }
        }
        if (revealed) {
          pausedReadingForApproval = true;
          document.body.classList.remove("agy-reading-mode");
          const sc = findChatScroller();
          if (sc) sc.style.paddingBottom = "170px";
          updateBar("⚠️ Hộp duyệt nằm trong vùng ẩn — tự mở ra để duyệt!", "warning", 2200);
        }
      };

      window.__AGY_AFTER_APPROVAL_RESTORE = () => {
        if (!pausedReadingForApproval || !isPromptHidden || isProcessing) return;
        const doneAt = Number(window.__AGY_LAST_APPROVAL_DONE_AT || 0);
        if (Date.now() - doneAt < 1000) return;
        const box = findRealChatInputBox();
        const target = findPromptContainerToHide(box);
        if (target && isApprovalContainerNode(target)) return;
        pausedReadingForApproval = false;
        applyPromptVisibility();
      };

      // Quick Send Handler: injects exactly ONE char, triggers React/Lexical state, clicks Send arrow button
      function handleQuickSend(char) {
        if (!isCurrentInstance()) return;

        // Cross-instance DOM debounce lock (800ms) to block duplicate firing from older extension instances
        const now = Date.now();
        const lastRun = Number(document.documentElement.getAttribute("data-agy-last-send") || "0");
        if (now - lastRun < 800) {
          return;
        }
        document.documentElement.setAttribute("data-agy-last-send", String(now));

        if (isPromptHidden) {
          isPromptHidden = false;
          applyPromptVisibility();
          try {
            window.top.postMessage({ type: "AGY_PROMPT_STATE", hidden: false }, "*");
          } catch (err) {}
        }

        const box = findRealChatInputBox();
        if (!box) return;

        box.focus();

        const isContentEditable = box.getAttribute("contenteditable") === "true" ||
                                  box.getAttribute("role") === "combobox" ||
                                  box.isContentEditable;

        if (isContentEditable) {
          // 1. Select all existing text inside the Lexical paragraph and delete it
          try {
            document.execCommand("selectAll", false, null);
            document.execCommand("delete", false, null);
          } catch (e) {}

          // 2. If any leftover text (like old 'oo') remains, select its text node directly and replace
          if ((box.textContent || "").trim().length > 0) {
            try {
              const sel = window.getSelection();
              const range = document.createRange();
              const targetNode = box.querySelector("p, span") || box;
              range.selectNodeContents(targetNode);
              sel.removeAllRanges();
              sel.addRange(range);
              document.execCommand("delete", false, null);
            } catch (e) {}
          }

          // 3. Insert exactly ONE character
          if ((box.textContent || "").trim() !== char) {
            try {
              document.execCommand("insertText", false, char);
            } catch (e) {}
          }

          // 4. Safety guard: If text somehow became 'oo' or 'ooo', trim it back to single char
          const currentTxt = (box.textContent || "").trim();
          if (currentTxt.length > 1) {
            try {
              document.execCommand("selectAll", false, null);
              document.execCommand("insertText", false, char);
            } catch (e) {}
          }

          // 5. Fallback ONLY if editor is still completely empty
          if ((box.textContent || "").trim() === "") {
            try {
              const dt = new DataTransfer();
              dt.setData("text/plain", char);
              const pasteEvent = new ClipboardEvent("paste", {
                bubbles: true,
                cancelable: true,
                composed: true,
                clipboardData: dt,
              });
              box.dispatchEvent(pasteEvent);
            } catch (e) {}
          }

          // 6. Notify React state listeners (InputEvent 'input' enables the Send button without duplicating text)
          try {
            box.dispatchEvent(new InputEvent("input", {
              bubbles: true,
              cancelable: true,
              composed: true,
              inputType: "insertText",
              data: char,
            }));
            box.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
            box.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
          } catch (e) {}
        } else {
          // Standard Textarea or Input
          try {
            const proto = box instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
            if (setter) {
              setter.call(box, char);
            } else {
              box.value = char;
            }
          } catch (e) {
            box.value = char;
          }
          box.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
          box.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
        }

        if (typeof window.__AGY_MARK_RUNNING === "function") {
          window.__AGY_MARK_RUNNING(1400);
        }
        triggerPromptSubmit(box);
      }

      // Shared helper to locate the exact native Blue Arrow "Send message" button (never "Send feedback")
      function findPromptSendButton(box) {
        // 1. Direct exact aria-label match for Antigravity's Send message button
        const direct = document.querySelector(
          'button[aria-label="Send message" i], button[aria-label*="Send message" i], button[aria-label*="Gửi tin nhắn" i]'
        );
        if (direct) return direct;

        // 2. Walk up from box until we find the prompt card container that holds the toolbar buttons
        let card = box ? box.parentElement : null;
        let depth = 0;
        while (card && card !== document.body && depth < 8) {
          const btns = card.querySelectorAll("button");
          if (btns.length >= 2) {
            break;
          }
          card = card.parentElement;
          depth++;
        }

        if (card && card !== document.body) {
          const byLabel = card.querySelector(
            'button[aria-label*="send" i]:not([aria-label*="feedback" i]), button[aria-label*="gửi" i], button[type="submit"]'
          );
          if (byLabel) return byLabel;

          // Filter toolbar buttons: exclude Add context (+), model selector, permissions, and mic
          const allBtns = Array.from(card.querySelectorAll("button"));
          const candidates = allBtns.filter((b) => {
            const aria = (b.getAttribute("aria-label") || b.title || "").toLowerCase();
            if (
              aria.includes("feedback") ||
              aria.includes("model") ||
              aria.includes("context") ||
              aria.includes("permission") ||
              aria.includes("preset") ||
              aria.includes("mic") ||
              aria.includes("audio") ||
              aria.includes("voice")
            ) {
              return false;
            }
            return !!b.querySelector("svg");
          });
          if (candidates.length > 0) {
            return candidates[candidates.length - 1];
          }
        }

        return document.querySelector(
          'button[aria-label*="send" i]:not([aria-label*="feedback" i]), button[aria-label*="gửi" i]'
        );
      }

      // Shared helper to dispatch Enter + click native Send button until prompt is submitted
      function triggerPromptSubmit(box) {
        function dispatchEnter() {
          if (!box) return;
          const keyOpts = {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            charCode: 13,
            bubbles: true,
            cancelable: true,
            composed: true,
          };
          box.dispatchEvent(new KeyboardEvent("keydown", keyOpts));
          box.dispatchEvent(new KeyboardEvent("keypress", keyOpts));
          box.dispatchEvent(new KeyboardEvent("keyup", keyOpts));
        }

        let attempts = 0;
        function trySubmit() {
          attempts++;
          const sendBtn = findPromptSendButton(box);

          // Always fire BOTH Enter key and forceClick on the real Send button
          dispatchEnter();

          if (sendBtn && !sendBtn.disabled && sendBtn.getAttribute("aria-disabled") !== "true") {
            forceClick(sendBtn);
          }

          const textCleared = !box || !box.textContent || box.textContent.trim() === "";
          const stopBtnExists = !!document.querySelector(
            'button[aria-label*="stop" i], button[aria-label*="dừng" i], button:has(svg rect), button:has(rect)'
          );

          if (!textCleared && !stopBtnExists && attempts < 4) {
            setTimeout(trySubmit, 110);
          } else {
            setTimeout(() => {
              try { if (box) box.blur(); } catch (e) {}
            }, 220);
          }
        }

        setTimeout(trySubmit, 100);
      }

      // Direct Submit Handler for the dock's Blue Arrow (→) button: submits current input as-is
      function handleDirectSubmit() {
        if (!isCurrentInstance()) return;

        if (isPromptHidden) {
          isPromptHidden = false;
          applyPromptVisibility();
          try {
            window.top.postMessage({ type: "AGY_PROMPT_STATE", hidden: false }, "*");
          } catch (err) {}
        }

        const box = findRealChatInputBox();
        const sendBtn = findPromptSendButton(box);

        if (typeof window.__AGY_MARK_RUNNING === "function") {
          window.__AGY_MARK_RUNNING(1400);
        }
        if (sendBtn && !sendBtn.disabled && sendBtn.getAttribute("aria-disabled") !== "true") {
          forceClick(sendBtn);
        }
        if (box) {
          triggerPromptSubmit(box);
        }
      }

      function extractCascadeIdFromUrl() {
        const urls = [window.location.href || "", hostTabMeta.url || ""];
        for (const u of urls) {
          if (!u) continue;
          const m1 = u.match(/\/(?:c|remote|chat)\/([0-9a-f-]{8,})/i);
          if (m1) return m1[1];
          const m2 = u.match(/[?&]p=c(?:%2F|\/)([0-9a-f-]{8,})/i);
          if (m2) return m2[1];
        }
        return "";
      }

      async function injectPromptText(rawText, options = {}) {
        const text = String(rawText || "");
        const autoSubmit = Boolean(options.autoSubmit);
        const retries = Number(options.retries || 5);
        if (!isCurrentInstance()) return { ok: false, error: "Instance outdated" };

        if (isPromptHidden) {
          isPromptHidden = false;
          pausedReadingForApproval = false;
          applyPromptVisibility();
          try {
            window.top.postMessage({ type: "AGY_PROMPT_STATE", hidden: false }, "*");
          } catch (err) {}
        }

        let box = findRealChatInputBox();
        for (let attempt = 0; !box && attempt < retries; attempt++) {
          await smartDelay(220);
          box = findRealChatInputBox();
        }
        if (!box) {
          return { ok: false, error: "Khong tim thay o nhap chat AGY." };
        }

        try { box.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
        box.focus();

        const isContentEditable =
          box.getAttribute("contenteditable") === "true" ||
          box.getAttribute("role") === "combobox" ||
          box.isContentEditable;

        if (isContentEditable) {
          try {
            document.execCommand("selectAll", false, null);
            document.execCommand("delete", false, null);
          } catch (e) {}

          if ((box.textContent || "").trim().length > 0) {
            try {
              const sel = window.getSelection();
              const range = document.createRange();
              range.selectNodeContents(box);
              sel.removeAllRanges();
              sel.addRange(range);
              document.execCommand("delete", false, null);
            } catch (e) {}
          }

          if (text.includes("\n")) {
            try {
              const dt = new DataTransfer();
              dt.setData("text/plain", text);
              box.dispatchEvent(new ClipboardEvent("paste", {
                bubbles: true,
                cancelable: true,
                composed: true,
                clipboardData: dt,
              }));
            } catch (e) {}
            if ((box.textContent || "").trim().length === 0) {
              try {
                document.execCommand("insertText", false, text);
              } catch (e) {}
            }
          } else {
            try {
              document.execCommand("insertText", false, text);
            } catch (e) {}
            if ((box.textContent || "").trim().length === 0) {
              try {
                const dt = new DataTransfer();
                dt.setData("text/plain", text);
                box.dispatchEvent(new ClipboardEvent("paste", {
                  bubbles: true,
                  cancelable: true,
                  composed: true,
                  clipboardData: dt,
                }));
              } catch (e) {}
            }
          }

          try {
            box.dispatchEvent(new InputEvent("input", {
              bubbles: true,
              cancelable: true,
              composed: true,
              inputType: "insertText",
              data: text.slice(0, 64),
            }));
            box.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
            box.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
          } catch (e) {}
        } else {
          try {
            const proto = box instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
            if (setter) {
              setter.call(box, text);
            } else {
              box.value = text;
            }
          } catch (e) {
            box.value = text;
          }
          box.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
          box.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
        }

        if (autoSubmit) {
          await smartDelay(160);
          if (typeof window.__AGY_MARK_RUNNING === "function") {
            window.__AGY_MARK_RUNNING(1600);
          }
          const sendBtn = findPromptSendButton(box);
          if (sendBtn && !sendBtn.disabled && sendBtn.getAttribute("aria-disabled") !== "true") {
            forceClick(sendBtn);
          } else {
            triggerPromptSubmit(box);
          }
        }
        return { ok: true };
      }

      // ─── 1-Tap Recent Conversation Tracker & Switcher (v21) ───────────────
      function normalizeTitleForMatch(t) {
        return (t || "").replace(/\.{2,}|…$/g, "").trim().toLowerCase().substring(0, 15);
      }

      let lastKnownSelectedTitle = "";
      function isNoiseHeaderLabel(txt) {
        if (!txt) return true;
        const lower = txt.trim().toLowerCase();
        if (lower.length < 2 || lower.length > 90) return true;
        if (/^(\d+\s*(s|m|h|d|w|mo|y)\b|worked for\b|\d+\s+ago\b)/i.test(lower) || /\bago$/i.test(lower)) return true;
        if (/^\d+\s+files?\s+changed$/i.test(lower) || /^(files?\s+changed|review\s+changes|accept\s+all|reject\s+all|discard\s+all)$/i.test(lower)) return true;
        if (/^(\+\d+|-\d+|\d+\s+errors?|\d+\s+warnings?)$/i.test(lower)) return true;
        return false;
      }

      function getCurrentConversationTitle() {
        // 1. Exact check: selected conversation row inside real sidebar
        const selectedRow = document.querySelector('[data-testid="conversation-row-sidebar"][data-selected="true"]');
        if (selectedRow) {
          const t = (
            selectedRow.querySelector("a[aria-label]")?.getAttribute("aria-label") ||
            selectedRow.querySelector(".truncate")?.textContent ||
            ""
          ).trim();
          if (t && !isNoiseHeaderLabel(t)) {
            lastKnownSelectedTitle = t;
            return t;
          }
        }

        // 2. Top header bar fallback when prompt box is present
        const promptBox = findRealChatInputBox();
        if (!promptBox) {
          if (!selectedRow) lastKnownSelectedTitle = "";
          return null;
        }

        const ignoreWords = new Set([
          "antigravity", "/", "inbox", "start conversation", "projects",
          "conversation history", "knowledge", "browser", "settings",
          "playground", "recents", "see all", "customizations", "new conversation"
        ]);

        const candidates = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, null);
        let el;
        while ((el = walker.nextNode())) {
          if (el.children.length > 0) continue;
          if (el.closest('button, [role="button"], [role="navigation"], [data-testid="conversation-list-sidebar"], [data-testid*="diff" i], [data-testid*="changes" i], [class*="diff" i], [id^="agy-"], nav, aside')) continue;
          const txt = (el.textContent || "").trim();
          if (isNoiseHeaderLabel(txt)) continue;
          const lower = txt.toLowerCase();
          if (ignoreWords.has(lower)) continue;

          const rect = el.getBoundingClientRect();
          if (
            rect.top >= 4 &&
            rect.top <= 64 &&
            rect.left >= 32 &&
            rect.left < window.innerWidth - 85 &&
            rect.width > 16 &&
            rect.height >= 10 &&
            rect.height <= 44
          ) {
            candidates.push({ text: txt, left: rect.left });
          }
        }

        if (candidates.length === 0) {
          return lastKnownSelectedTitle || null;
        }
        candidates.sort((a, b) => b.left - a.left);
        const winner = candidates[0].text;
        lastKnownSelectedTitle = winner;
        return winner;
      }

      let lastReportedTitle = "";
      function reportActiveConversation() {
        if (!isCurrentInstance()) return;
        const title = getCurrentConversationTitle();
        if (title && title !== lastReportedTitle) {
          lastReportedTitle = title;
          try {
            window.top.postMessage({
              type: "AGY_ACTIVE_CHAT_V21",
              title: title,
            }, "*");
          } catch (err) {}
        }
      }

      setInterval(reportActiveConversation, 1500);
      setTimeout(reportActiveConversation, 600);

      function findSidebarConversationItem(targetTitle) {
        const normTarget = normalizeTitleForMatch(targetTitle);
        if (!normTarget || normTarget.length < 2) return null;

        const allEls = document.querySelectorAll("a, button, [role='button'], [role='treeitem'], [role='listitem'], div, span");
        let bestMatch = null;

        for (const el of allEls) {
          if (el.id && el.id.startsWith("agy-")) continue;
          if (el.children.length > 2) continue;
          const rawText = (el.textContent || "").trim();
          if (rawText.length < 2 || rawText.length > 100) continue;

          const rect = el.getBoundingClientRect();
          // Must be visible in the left sidebar / conversation list area (below top header)
          if (rect.top <= 68 || rect.left < 0 || rect.left > 320 || rect.width < 30 || rect.height < 14 || rect.height > 65) {
            continue;
          }

          const normEl = normalizeTitleForMatch(rawText);
          if (normEl === normTarget || normEl.startsWith(normTarget) || normTarget.startsWith(normEl)) {
            const clickable = el.closest("a, button, [role='button'], [role='treeitem'], [role='listitem'], [tabindex]") || el;
            bestMatch = clickable;
            break;
          }
        }
        return bestMatch;
      }

      function findSidebarToggleBtn() {
        const byAria = document.querySelector(
          'button[aria-label*="Sidebar" i], button[title*="Sidebar" i], button[aria-label*="menu" i], button[aria-label*="Back" i]'
        );
        if (byAria) return byAria;

        // Fallback: top-left button in the header bar (arrow ← on mobile or sidebar icon)
        const buttons = document.querySelectorAll("button, [role='button']");
        for (const b of buttons) {
          if (b.id && b.id.startsWith("agy-")) continue;
          const r = b.getBoundingClientRect();
          if (r.top >= 4 && r.top <= 70 && r.left >= 0 && r.left <= 68 && r.width >= 20 && r.height >= 20) {
            return b;
          }
        }
        return null;
      }

      function findConversationHistoryTab() {
        const allEls = document.querySelectorAll("a, button, [role='button'], div, span");
        for (const el of allEls) {
          if (el.children.length > 2) continue;
          const txt = (el.textContent || "").trim().toLowerCase();
          if (txt === "conversation history") {
            const r = el.getBoundingClientRect();
            if (r.top > 60 && r.left >= 0 && r.left < 320 && r.width > 30 && r.height > 12) {
              return el.closest("a, button, [role='button'], [tabindex]") || el;
            }
          }
        }
        return null;
      }

      function switchToConversation(target) {
        if (!target || !target.title) return;

        // 1. If sidebar is already open and item is visible, click immediately
        const immediateItem = findSidebarConversationItem(target.title);
        if (immediateItem) {
          lastReportedTitle = ""; // Force re-sync after switch
          forceClick(immediateItem);
          return;
        }

        // 2. Otherwise open the Sidebar first
        const toggleBtn = findSidebarToggleBtn();
        if (toggleBtn) {
          forceClick(toggleBtn);
        }

        // 3. Poll for the sidebar item (and open Conversation History if needed)
        let attempts = 0;
        const maxAttempts = 7;
        const pollTimer = setInterval(() => {
          attempts++;
          const item = findSidebarConversationItem(target.title);
          if (item) {
            clearInterval(pollTimer);
            lastReportedTitle = "";
            forceClick(item);
            return;
          }

          // On attempt 3, if not found under expanded workspace tree, click "Conversation History"
          if (attempts === 3) {
            const histTab = findConversationHistoryTab();
            if (histTab) {
              forceClick(histTab);
            }
          }

          if (attempts >= maxAttempts) {
            clearInterval(pollTimer);
            // Fallback to top URL navigation if available
            if (target.topUrl) {
              try {
                window.top.postMessage({
                  type: "AGY_FALLBACK_NAVIGATE_V21",
                  url: target.topUrl,
                }, "*");
              } catch (err) {}
            }
          }
        }, 140);
      }

      // ─── Extension Bridge Helpers: Search, DOM Dump, Patrol & 2-Way Relay (v22) ─
      let lastUserTypeTime = 0;
      addSafeListener(document, "keydown", () => { lastUserTypeTime = Date.now(); }, true);
      addSafeListener(document, "input", () => { lastUserTypeTime = Date.now(); }, true);

      let lastKnownSearchOpen = false;
      function isSearchDialogOpen() {
        const vp = document.querySelector('[data-testid="fast-pick-viewport"][data-open]');
        if (vp && isElementVisible(vp)) return true;
        const fp = document.querySelector('[data-testid="fastpick"]');
        if (fp && isElementVisible(fp)) return true;
        const inp = document.querySelector('input[data-testid="fastpick-input"]');
        return !!(inp && isElementVisible(inp));
      }

      function syncSearchStateToTop(forceVal = null) {
        const open = forceVal !== null ? !!forceVal : isSearchDialogOpen();
        lastKnownSearchOpen = open;
        try {
          window.top.postMessage({ type: "AGY_SEARCH_STATE_V25", open }, "*");
        } catch (err) {}
        return open;
      }

      function closeSearchDialog() {
        const escOpts = {
          key: "Escape",
          code: "Escape",
          keyCode: 27,
          which: 27,
          bubbles: true,
          cancelable: true,
          composed: true,
        };
        const inp = document.querySelector('input[data-testid="fastpick-input"]');
        if (inp) {
          try { inp.dispatchEvent(new KeyboardEvent("keydown", escOpts)); } catch (e) {}
        }
        try { document.dispatchEvent(new KeyboardEvent("keydown", escOpts)); } catch (e) {}
        try { window.dispatchEvent(new KeyboardEvent("keydown", escOpts)); } catch (e) {}

        const fp = document.querySelector('[data-testid="fastpick"]');
        const vp = document.querySelector('[data-testid="fast-pick-viewport"][data-open], [data-testid="fast-pick-viewport"]');
        if (vp && isElementVisible(vp)) {
          const r = vp.getBoundingClientRect();
          const bx = r.left + 8;
          const by = r.top + 8;
          const hit = document.elementFromPoint(bx, by);
          const clickTarget = (hit && (!fp || !fp.contains(hit))) ? hit : vp;
          if (!fp || !fp.contains(clickTarget)) {
            try {
              const ev = { bubbles: true, cancelable: true, view: window, clientX: bx, clientY: by, button: 0 };
              clickTarget.dispatchEvent(new PointerEvent("pointerdown", ev));
              clickTarget.dispatchEvent(new MouseEvent("mousedown", ev));
              clickTarget.dispatchEvent(new PointerEvent("pointerup", ev));
              clickTarget.dispatchEvent(new MouseEvent("mouseup", ev));
              clickTarget.dispatchEvent(new MouseEvent("click", ev));
            } catch (e) {}
          }
        }
        setTimeout(() => syncSearchStateToTop(), 80);
        setTimeout(() => syncSearchStateToTop(), 220);
        updateBar("🔍 Đã đóng tìm kiếm dự án", "info", 1500);
        return true;
      }

      function toggleSearchDialog() {
        if (isSearchDialogOpen()) {
          closeSearchDialog();
          return { open: false, action: "closed" };
        }
        const triggered = triggerSearchDialog();
        setTimeout(() => syncSearchStateToTop(), 100);
        setTimeout(() => syncSearchStateToTop(), 280);
        return { open: true, action: "opened", triggered };
      }

      function triggerSearchDialog() {
        // 1. Try direct visible search icon button in sidebar/header (never click fastpick input itself)
        const directBtns = Array.from(
          document.querySelectorAll(
            'button[aria-label*="Search" i], button[title*="Search" i], button[aria-label*="Tìm" i]'
          )
        ).filter((b) => isElementVisible(b) && !b.closest("#agy-control-container") && !b.closest('[data-testid="fastpick"]'));

        if (directBtns.length > 0) {
          forceClick(directBtns[0]);
          try { directBtns[0].focus(); } catch (e) {}
          updateBar("🔍 Đã mở tìm kiếm Antigravity!", "success", 1800);
          return true;
        }

        // 2. Try magnifying-glass icon button near top-left header ("Antigravity [sidebar] [search]")
        const topLeftBtns = Array.from(document.querySelectorAll("button, [role='button']")).filter((b) => {
          if (b.id && b.id.startsWith("agy-")) return false;
          if (b.closest('[data-testid="fastpick"]')) return false;
          const r = b.getBoundingClientRect();
          return r.top >= 4 && r.top <= 68 && r.left >= 70 && r.left <= 320 && r.width >= 18 && r.height >= 18 && !!b.querySelector("svg");
        });
        if (topLeftBtns.length > 0) {
          const candidate = topLeftBtns[topLeftBtns.length - 1];
          forceClick(candidate);
          updateBar("🔍 Đã mở tìm kiếm Sidebar!", "success", 1800);
          return true;
        }

        // 3. Dispatch native Ctrl + K keyboard shortcut (Quick Open / Search Conversations)
        const target = document.body || document.documentElement;
        const kOpts = {
          key: "k",
          code: "KeyK",
          keyCode: 75,
          which: 75,
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
          composed: true,
        };
        target.dispatchEvent(new KeyboardEvent("keydown", kOpts));
        window.dispatchEvent(new KeyboardEvent("keydown", kOpts));
        updateBar("🔍 Đã kích hoạt phím tắt tìm kiếm (Ctrl+K)!", "info", 1800);
        return true;
      }

      function collectSidebarItems({ detectBadges = true } = {}) {
        const items = [];
        const convRows = Array.from(document.querySelectorAll('[data-testid="conversation-row-sidebar"]'));

        // Map each visible row to nearest preceding project-header in DOM order if data-subtext is absent
        const rowProjectMap = new Map();
        try {
          const orderedNodes = document.querySelectorAll('button[data-testid="project-header"], [data-testid="conversation-row-sidebar"]');
          let currentProj = "";
          for (const node of orderedNodes) {
            if (node.matches('button[data-testid="project-header"]')) {
              currentProj = (node.getAttribute("data-project-label") || node.innerText || node.textContent || "").replace(/\s+/g, " ").trim();
            } else if (currentProj) {
              rowProjectMap.set(node, currentProj);
            }
          }
        } catch (_) {}

        if (convRows.length > 0) {
          for (const row of convRows) {
            if (!isElementVisible(row)) continue;
            const link = row.querySelector("a[href]") || row;
            const href = (row.querySelector("a[href]")?.getAttribute("href") || "");
            const title = (
              row.querySelector("a[aria-label]")?.getAttribute("aria-label") ||
              row.querySelector(".truncate")?.textContent ||
              row.innerText ||
              ""
            ).replace(/\s+/g, " ").trim();
            if (!title) continue;

            const cascadeId = row.getAttribute("data-cascade-id") || "";
            const projectId = row.closest("[data-sidebar-section-id]")?.getAttribute("data-sidebar-section-id") || "";
            const selected = row.getAttribute("data-selected") === "true";
            const subtext = row.getAttribute("data-subtext") || "";
            const projectLabel = (subtext || rowProjectMap.get(row) || "").trim();

            let hasAttentionBadge = false;
            let hasStopBtn = false;
            let hasArchiveBtn = false;
            let statusIconHtml = "";
            const badgeSignals = [];

            if (detectBadges) {
              const dot = row.querySelector('[data-testid="attention-dot"], .animate-unread-ping');
              if (dot) {
                hasAttentionBadge = true;
                badgeSignals.push("attention-dot");
                statusIconHtml = (dot.closest("div.flex")?.innerHTML || dot.parentElement?.outerHTML || "").slice(0, 1200);
              }
              const stopBtn = row.querySelector('button[aria-label*="Stop" i]');
              if (stopBtn) {
                hasStopBtn = true;
                badgeSignals.push("stop-execution");
              }
              const archBtn = row.querySelector('button[data-testid="conversation-archive-button"], button[aria-label*="Archive" i]');
              if (archBtn) {
                hasArchiveBtn = true;
              }
              // Capture right-side status badge HTML even if not attention-dot (for diagnostics)
              if (!statusIconHtml) {
                const statusArea = row.querySelector('div.flex.items-center.gap-1\\.5');
                if (statusArea) statusIconHtml = statusArea.innerHTML.slice(0, 900);
              }
            }

            const rect = row.getBoundingClientRect();
            items.push({
              el: link,
              rowEl: row,
              cascadeId,
              projectId,
              projectLabel,
              href,
              title,
              selected,
              subtext,
              hasAttentionBadge,
              hasStopBtn,
              hasArchiveBtn,
              badgeSignals,
              statusIconHtml,
              rect: { top: Math.round(rect.top), left: Math.round(rect.left), w: Math.round(rect.width), h: Math.round(rect.height) },
            });
          }
          return items;
        }

        // Fallback generic scan (e.g. if sidebar uses compact/mobile layout without conversation-row-sidebar)
        const ignoreLabels = new Set([
          "antigravity", "new conversation", "+ new conversation",
          "customizations", "projects", "settings", "see all",
          "no conversations yet", "files", "folder", "mentions", "actions", "browser", "drive"
        ]);
        const seenRects = new Set();
        const sidebarScope = document.querySelector('[role="navigation"][aria-label="Sidebar"], aside, nav, [class*="sidebar" i]') || document;
        const candidates = sidebarScope.querySelectorAll("a, button, [role='button'], [role='treeitem'], [role='listitem'], [tabindex='0']");

        for (const el of candidates) {
          if (el.id && el.id.startsWith("agy-")) continue;
          if (el.closest("#agy-control-container, #agy-autoapprove-overlay")) continue;
          if (!isElementVisible(el)) continue;

          const rect = el.getBoundingClientRect();
          if (rect.left < 0 || rect.left > 340 || rect.width < 45 || rect.height < 18 || rect.height > 66) continue;
          if (rect.top < 62 || rect.top > window.innerHeight - 68) continue;

          const text = (el.getAttribute("aria-label") || el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
          if (!text || text.length < 2 || text.length > 140) continue;
          const lower = text.toLowerCase();
          if (ignoreLabels.has(lower) || lower.startsWith("see all (") || lower.startsWith("desktop-")) continue;

          const rectKey = `${Math.round(rect.top / 4)}_${Math.round(rect.left / 4)}`;
          if (seenRects.has(rectKey)) continue;
          seenRects.add(rectKey);

          const hasAttentionBadge = !!el.querySelector('[data-testid="attention-dot"], .animate-unread-ping');
          items.push({
            el,
            rowEl: el,
            cascadeId: "",
            projectId: "",
            title: text,
            selected: false,
            subtext: "",
            hasAttentionBadge,
            hasStopBtn: false,
            hasArchiveBtn: false,
            badgeSignals: hasAttentionBadge ? ["attention-dot"] : [],
            statusIconHtml: "",
            rect: { top: Math.round(rect.top), left: Math.round(rect.left), w: Math.round(rect.width), h: Math.round(rect.height) },
          });
        }
        return items;
      }

      function buildDomSnapshotReport() {
        const activeChat = getCurrentConversationTitle();
        const items = collectSidebarItems({ detectBadges: true });
        const sidebarRoot =
          document.querySelector('[role="navigation"][aria-label="Sidebar"], aside, nav, [class*="sidebar" i]') ||
          document.body;

        const cleanHtml = sidebarRoot
          ? sidebarRoot.outerHTML.replace(/<path\b[^>]*>/gi, "<path/>").substring(0, 18000)
          : "(no sidebar root found)";

        const dialogInfo = findApprovalDialog();
        const summary = {
          capturedAt: new Date().toISOString(),
          extensionVersion: AGY_VERSION,
          url: window.location.href,
          activeChat,
          hasPromptBox: !!document.querySelector('[role="combobox"], textarea'),
          hasApprovalDialog: !!dialogInfo,
          approvalPicked: dialogInfo ? { optNumber: dialogInfo.optNumber, strategy: dialogInfo.strategy } : null,
          sidebarItems: items.map((it) => ({
            cascadeId: it.cascadeId,
            title: it.title,
            selected: it.selected,
            hasAttentionBadge: it.hasAttentionBadge,
            hasStopBtn: it.hasStopBtn,
            hasArchiveBtn: it.hasArchiveBtn,
            badgeSignals: it.badgeSignals,
            rect: it.rect,
          })),
        };

        const reportText =
          "=== AGY EXTENSION BRIDGE DOM SNAPSHOT ===\n" +
          JSON.stringify(summary, null, 2) +
          "\n\n=== SIDEBAR OUTER HTML (SANITIZED) ===\n" +
          cleanHtml;

        return { summary, items, reportText };
      }

      async function sweepSidebarConversations() {
        const sc = document.querySelector('[data-testid="conversation-list-sidebar"]');
        const byId = new Map();
        const projectsMap = new Map();

        function snapshotVisible() {
          document.querySelectorAll('button[data-testid="project-header"]').forEach((p) => {
            const label = p.getAttribute("data-project-label") || p.innerText?.trim() || "";
            const dropId = p.closest("[data-sidebar-section-drop-id]")?.getAttribute("data-sidebar-section-drop-id") || label;
            if (dropId) {
              projectsMap.set(dropId, {
                dropId,
                label,
                expanded: p.getAttribute("aria-expanded") === "true",
              });
            }
          });
          for (const item of collectSidebarItems({ detectBadges: true })) {
            const key = item.cascadeId || item.title;
            byId.set(key, {
              cascadeId: item.cascadeId,
              projectId: item.projectId,
              title: item.title,
              selected: item.selected,
              hasAttentionBadge: item.hasAttentionBadge,
              hasStopBtn: item.hasStopBtn,
              hasArchiveBtn: item.hasArchiveBtn,
              badgeSignals: item.badgeSignals,
              subtext: item.subtext,
              statusIconHtml: item.statusIconHtml,
            });
          }
        }

        snapshotVisible();
        if (sc && sc.scrollHeight > sc.clientHeight + 20) {
          const origTop = sc.scrollTop;
          const step = Math.max(460, Math.floor(sc.clientHeight * 0.88));
          for (let y = 0, steps = 0; y <= sc.scrollHeight + step && steps < 25; y += step, steps++) {
            sc.scrollTop = y;
            sc.dispatchEvent(new Event("scroll", { bubbles: true }));
            await smartDelay(65);
            snapshotVisible();
          }
          sc.scrollTop = origTop;
          sc.dispatchEvent(new Event("scroll", { bubbles: true }));
          await smartDelay(45);
        }

        return {
          totalProjects: projectsMap.size,
          totalConversations: byId.size,
          projects: Array.from(projectsMap.values()),
          conversations: Array.from(byId.values()),
        };
      }

      function buildInspectUiReport() {
        const activeChat = getCurrentConversationTitle();
        const dialogInfo = findApprovalDialog();
        const popovers = Array.from(
          document.querySelectorAll('[role="dialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper], [data-base-ui-portal]')
        )
          .filter((el) => isElementVisible(el) && !el.closest("#agy-control-container, #agy-autoapprove-overlay"))
          .map((el) => ({
            role: el.getAttribute("role") || "",
            text: (el.innerText || "").slice(0, 1000),
            html: el.outerHTML.slice(0, 6000),
          }));

        const sampleRows = Array.from(document.querySelectorAll('[data-testid="conversation-row-sidebar"]'))
          .slice(0, 5)
          .map((r) => r.outerHTML.slice(0, 3500));

        const reportObj = {
          capturedAt: new Date().toISOString(),
          url: window.location.href,
          activeChat,
          hasApprovalDialog: !!dialogInfo,
          approvalPicked: dialogInfo
            ? { optNumber: dialogInfo.optNumber, strategy: dialogInfo.strategy, cardHtml: dialogInfo.card.outerHTML.slice(0, 4000) }
            : null,
          visiblePopoversCount: popovers.length,
          visiblePopovers: popovers,
          sampleRowsHtml: sampleRows,
        };
        return "=== AGY INSPECT UI REPORT ===\n" + JSON.stringify(reportObj, null, 2);
      }

      function sendBridgeResult(cmdId, cmdName, ok, extra = {}) {
        try {
          chrome.runtime.sendMessage({
            type: "AGY_BRIDGE_RESULT",
            payload: {
              id: cmdId || null,
              cmd: cmdName,
              ok: !!ok,
              frame: "iframe",
              extensionVersion: AGY_VERSION,
              timestamp: Date.now(),
              ...extra,
            },
          });
        } catch (err) {}
      }

      function dumpSidebarDom({ copyClipboard = true, bridgeCmdId = null } = {}) {
        const { summary, items, reportText } = buildDomSnapshotReport();

        if (copyClipboard) {
          try {
            window.top.postMessage(
              { type: "AGY_COPY_CLIPBOARD_TOP_V22", text: reportText, count: items.length },
              "*"
            );
          } catch (err) {}
        }

        sendBridgeResult(bridgeCmdId, "DUMP_DOM", true, {
          activeChat: summary.activeChat,
          sidebarCount: items.length,
          domReport: reportText,
        });
        return { summary, items, reportText };
      }

      function sendProofSnapshot(bridgeCmdId = null, customMessage = "", bridgeOnline = true) {
        const activeChat = getCurrentConversationTitle();
        const items = collectSidebarItems({ detectBadges: true });
        const hasPromptBox = !!document.querySelector('[role="combobox"], textarea');
        const hasApproval = !!findApprovalDialog();

        try {
          window.top.postMessage(
            {
              type: "AGY_SHOW_PROOF_V22",
              iframeOk: true,
              bridgeOnline,
              activeChat,
              sidebarCount: items.length,
              message: customMessage || "Đã xác thực điều khiển Iframe + DOM!",
            },
            "*"
          );
        } catch (err) {}

        sendBridgeResult(bridgeCmdId, "PING_PROOF", true, {
          activeChat,
          sidebarCount: items.length,
          hasPromptBox,
          hasApprovalDialog: hasApproval,
          sampleItems: items.slice(0, 12).map((i) => ({
            title: i.title,
            attention: i.hasAttentionBadge,
            stop: i.hasStopBtn,
          })),
          message: customMessage,
        });
      }

      // ─── Smart Multi-Project Patrol & Batch Auto-Approval State Machine (v24) ──
      const patrolCooldowns = new Map();
      let patrolHomeCascadeId = null;
      let lastKnownSelectedCascadeId = "";
      let patrolVisit = null;
      let patrolBusy = false;
      let lastSweepAt = 0;
      let sweepOffset = 0;
      let sweepOrigTop = null;
      let lastUserInteractTime = 0;
      let lastSidebarHoverTime = 0;
      let lastPatrolCheckAt = 0;

      addSafeListener(
        document,
        "pointerdown",
        (e) => {
          if (!e.isTrusted) return;
          lastUserInteractTime = Date.now();
          if (e.target && e.target.closest?.('[data-testid="conversation-list-sidebar"]')) {
            lastSidebarHoverTime = Date.now();
          }
          // User explicitly clicked a chat -> respect user's manual navigation
          patrolHomeCascadeId = null;
          patrolVisit = null;
        },
        true
      );
      addSafeListener(
        document,
        "wheel",
        (e) => {
          if (e.isTrusted && e.target && e.target.closest?.('[data-testid="conversation-list-sidebar"]')) {
            lastSidebarHoverTime = Date.now();
          }
        },
        true
      );

      window.__AGY_ON_APPROVAL_DONE = () => {
        if (patrolVisit) {
          patrolVisit.approvedHere = true;
          patrolVisit.startedAt = Date.now();
          // Short 2.5s cooldown so follow-up commands in the same chat can immediately auto-approve too
          if (patrolVisit.key) {
            patrolCooldowns.set(patrolVisit.key, { ts: Date.now(), ttl: 2500 });
          }
        }
        setTimeout(() => runMultiProjectPatrol(), 900);
      };

      async function enableStatusGroupView() {
        const displayBtn = document.querySelector('button[aria-label="Display Options"]');
        if (!displayBtn) {
          updateBar("⚠️ Không tìm thấy nút Display Options trong Sidebar!", "warning", 2500);
          return false;
        }
        forceClick(displayBtn);
        await smartDelay(200);
        const groupTrigger = document.querySelector('[data-testid="group-by-submenu-trigger"]');
        if (groupTrigger) {
          forceClick(groupTrigger);
          await smartDelay(200);
          const statusOpt = document.querySelector('[data-testid="group-by-option-status"]');
          if (statusOpt) {
            forceClick(statusOpt);
            updateBar("📊 Đã gom toàn bộ dự án đang chạy (In Progress) lên đầu!", "success", 3000);
            return true;
          }
        }
        return false;
      }

      async function switchToCascadeId(targetId) {
        if (!targetId) return false;
        let row = document.querySelector(`[data-testid="conversation-row-sidebar"][data-cascade-id="${targetId}"]`);
        if (!row) {
          const sc = document.querySelector('[data-testid="conversation-list-sidebar"]');
          if (sc && sc.scrollHeight > sc.clientHeight) {
            const origTop = sc.scrollTop;
            const step = Math.max(460, Math.floor(sc.clientHeight * 0.88));
            for (let y = 0, steps = 0; y <= sc.scrollHeight + step && steps < 25; y += step, steps++) {
              sc.scrollTop = y;
              sc.dispatchEvent(new Event("scroll", { bubbles: true }));
              await smartDelay(60);
              row = document.querySelector(`[data-testid="conversation-row-sidebar"][data-cascade-id="${targetId}"]`);
              if (row) break;
            }
            if (!row) {
              sc.scrollTop = origTop;
              sc.dispatchEvent(new Event("scroll", { bubbles: true }));
            }
          }
        }
        if (row) {
          const link = row.querySelector("a[href]") || row;
          forceClick(link);
          return true;
        }
        return false;
      }

      function pickPatrolCandidate(items, normActive, now) {
        // Priority 1: Official Antigravity attention-dot / unread-ping badge
        // Priority 2: Running (Stop execution) WITHOUT loading-spinner (potentially waiting/paused)
        let tier1 = null;
        let tier2 = null;

        for (const item of items) {
          if (item.selected) continue;
          const key = item.cascadeId || normalizeTitleForMatch(item.title);
          if (!key || (normActive && !item.cascadeId && normalizeTitleForMatch(item.title) === normActive)) {
            continue;
          }
          const cd = patrolCooldowns.get(key);
          if (cd && now - cd.ts < cd.ttl) continue;

          if (item.hasAttentionBadge) {
            tier1 = { ...item, key };
            break;
          }
          if (!tier2 && item.hasStopBtn && !item.rowEl?.querySelector('[data-testid="status-loading-spinner"]')) {
            tier2 = { ...item, key, ttlOverride: 60000 };
          }
        }
        return tier1 || tier2;
      }

      async function runMultiProjectPatrol() {
        if (!isChatOwnerActive() || isProcessing || isScanning || patrolBusy) return;
        const now = Date.now();
        if (now - lastPatrolCheckAt < 2200) return;
        lastPatrolCheckAt = now;

        const settings = await getSettings();
        if (!settings.enabled || !settings.multiProjectPatrol) return;

        // If an approval card is open RIGHT HERE, process it immediately instead of leaving!
        if (findApprovalDialog(settings)) {
          scanAndProcess();
          return;
        }

        // Never interrupt if user is actively typing or just interacted with UI
        const ae = document.activeElement;
        const isTypingFocus =
          ae &&
          (ae.tagName === "TEXTAREA" ||
            ae.tagName === "INPUT" ||
            ae.isContentEditable ||
            ae.getAttribute("role") === "combobox");
        if (isTypingFocus || now - lastUserTypeTime < 6000 || now - lastUserInteractTime < 4500) {
          return;
        }

        patrolBusy = true;
        try {
          const activeChat = getCurrentConversationTitle() || "";
          const normActive = normalizeTitleForMatch(activeChat);
          let items = collectSidebarItems({ detectBadges: true });
          const selectedItem = items.find((i) => i.selected);
          const urlCascadeId = extractCascadeIdFromUrl();
          if (!patrolVisit && (selectedItem?.cascadeId || urlCascadeId)) {
            lastKnownSelectedCascadeId = selectedItem?.cascadeId || urlCascadeId;
          }

          // Mobile safety: if sidebar rows aren't rendered/visible, never force navigation hops during patrol
          if (items.length === 0) {
            return;
          }

          // If we are inside an active patrol check visit, wait >= 2.2s before leaving
          if (patrolVisit && now - patrolVisit.startedAt < 2200) {
            return;
          }

          let candidate = pickPatrolCandidate(items, normActive, now);

          // If none visible and sidebar is tall/virtualized, do non-intrusive scroll sweep every 18s
          const sc = document.querySelector('[data-testid="conversation-list-sidebar"]');
          if (
            !candidate &&
            sc &&
            sc.scrollHeight > sc.clientHeight + 80 &&
            now - lastSidebarHoverTime > 10000 &&
            (sweepOrigTop !== null || now - lastSweepAt > 18000)
          ) {
            if (sweepOrigTop === null) {
              sweepOrigTop = sc.scrollTop;
              sweepOffset = 0;
            }
            const step = Math.max(460, Math.floor(sc.clientHeight * 0.88));
            // Advance up to 4 virtualized viewports per cycle
            for (let c = 0; c < 4 && sweepOffset <= sc.scrollHeight; c++) {
              sc.scrollTop = sweepOffset;
              sc.dispatchEvent(new Event("scroll", { bubbles: true }));
              await smartDelay(60);
              items = collectSidebarItems({ detectBadges: true });
              candidate = pickPatrolCandidate(items, normActive, Date.now());
              if (candidate) break;
              sweepOffset += step;
            }
            if (!candidate && sweepOffset > sc.scrollHeight) {
              sc.scrollTop = sweepOrigTop;
              sc.dispatchEvent(new Event("scroll", { bubbles: true }));
              sweepOrigTop = null;
              sweepOffset = 0;
              lastSweepAt = Date.now();
            }
          }

          if (candidate) {
            const currentHomeId = selectedItem?.cascadeId || urlCascadeId || lastKnownSelectedCascadeId;
            if (!patrolHomeCascadeId && settings.autoReturnHome !== false && currentHomeId) {
              patrolHomeCascadeId = currentHomeId;
            }
            patrolCooldowns.set(candidate.key, {
              ts: Date.now(),
              ttl: candidate.ttlOverride || 45000,
            });
            patrolVisit = {
              key: candidate.key,
              cascadeId: candidate.cascadeId,
              startedAt: Date.now(),
              approvedHere: false,
            };
            const shortTitle = candidate.title.length > 26 ? candidate.title.substring(0, 26) + "…" : candidate.title;
            updateBar(`🔄 Tuần tra: Kiểm tra "${shortTitle}"`, "info", 2600);
            forceClick(candidate.el);
            await smartDelay(800);
            scanAndProcess();
            return;
          }

          // No more waiting candidates -> return to user's original conversation if needed
          if (patrolVisit) {
            const didApproveAny = patrolVisit.approvedHere;
            patrolVisit = null;
            const homeId = patrolHomeCascadeId;
            patrolHomeCascadeId = null;
            const currentNowId = selectedItem?.cascadeId || extractCascadeIdFromUrl();
            if (homeId && settings.autoReturnHome !== false && currentNowId !== homeId) {
              const ok = await switchToCascadeId(homeId);
              if (ok) {
                updateBar(
                  didApproveAny ? "✓ Đã duyệt xong — quay về hội thoại gốc!" : "↩️ Quay về hội thoại gốc",
                  "success",
                  2400
                );
              }
            }
          }
        } finally {
          patrolBusy = false;
        }
      }

      window.__AGY_PATROL_INTERVAL = setInterval(runMultiProjectPatrol, 3500);

      // ─── 2-Way Bridge Heartbeat & Command Executor inside Iframe ────────────────
      const executedBridgeCmdIds = new Set();
      async function executeBridgeCommand(cmd) {
        if (!cmd || !cmd.cmd) return;
        if (cmd.id) {
          if (executedBridgeCmdIds.has(cmd.id)) return;
          executedBridgeCmdIds.add(cmd.id);
        }
        const args = cmd.args || {};

        switch (cmd.cmd) {
          case "PING_PROOF":
            sendProofSnapshot(cmd.id, args.message || "AI đang kiểm tra kết nối trực tiếp!", true);
            break;

          case "DUMP_DOM":
            dumpSidebarDom({ copyClipboard: !!args.copy, bridgeCmdId: cmd.id });
            updateBar("🤖 AI Bridge đã đọc DOM Sidebar!", "info", 2200);
            break;

          case "ENABLE_STATUS_GROUP": {
            const ok = await enableStatusGroupView();
            sendBridgeResult(cmd.id, "ENABLE_STATUS_GROUP", ok);
            break;
          }

          case "SWEEP_SIDEBAR": {
            const sweepRes = await sweepSidebarConversations();
            const attentionList = sweepRes.conversations.filter((c) => c.hasAttentionBadge || c.hasStopBtn);
            const reportText = "=== AGY FULL SIDEBAR SWEEP ===\n" + JSON.stringify(sweepRes, null, 2);
            sendBridgeResult(cmd.id, "SWEEP_SIDEBAR", true, {
              totalProjects: sweepRes.totalProjects,
              totalConversations: sweepRes.totalConversations,
              attentionCount: attentionList.length,
              attentionConversations: attentionList,
              domReport: reportText,
            });
            break;
          }

          case "INSPECT_UI": {
            const uiReport = buildInspectUiReport();
            sendBridgeResult(cmd.id, "INSPECT_UI", true, {
              activeChat: getCurrentConversationTitle(),
              domReport: uiReport,
            });
            break;
          }

          case "PROBE_DISPLAY_OPTIONS": {
            const btn = document.querySelector('button[aria-label="Display Options"]');
            if (!btn) {
              sendBridgeResult(cmd.id, "PROBE_DISPLAY_OPTIONS", false, { error: "Display Options button not found" });
              break;
            }
            forceClick(btn);
            await smartDelay(280);
            const report = buildInspectUiReport();
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, bubbles: true }));
            btn.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, bubbles: true }));
            sendBridgeResult(cmd.id, "PROBE_DISPLAY_OPTIONS", true, { domReport: report });
            break;
          }

          case "SWITCH_BY_ID": {
            const cid = args.cascadeId || "";
            const title = args.title || "";
            let ok = false;
            if (cid) {
              ok = await switchToCascadeId(cid);
            } else {
              const row = collectSidebarItems({ detectBadges: false }).find((i) =>
                normalizeTitleForMatch(i.title).includes(normalizeTitleForMatch(title))
              )?.rowEl;
              if (row) {
                forceClick(row.querySelector("a[href]") || row);
                ok = true;
              }
            }
            if (ok) {
              await smartDelay(args.waitMs || 900);
              const dlg = findApprovalDialog();
              sendBridgeResult(cmd.id, "SWITCH_BY_ID", true, {
                activeChat: getCurrentConversationTitle(),
                hasApprovalDialog: !!dlg,
                approvalOptNumber: dlg ? dlg.optNumber : null,
                approvalCardText: dlg ? (dlg.card.innerText || "").slice(0, 600) : null,
              });
            } else {
              sendBridgeResult(cmd.id, "SWITCH_BY_ID", false, { error: "Row not found", cid, title });
            }
            break;
          }

          case "TRIGGER_SEARCH": {
            const res = args.toggle
              ? toggleSearchDialog()
              : (args.close ? { open: false, action: "closed", ok: closeSearchDialog() } : { open: true, action: "opened", ok: triggerSearchDialog() });
            await smartDelay(280);
            const report = buildInspectUiReport();
            syncSearchStateToTop();
            sendBridgeResult(cmd.id, "TRIGGER_SEARCH", true, { ...res, isOpenNow: isSearchDialogOpen(), domReport: report });
            break;
          }

          case "TOGGLE_SEARCH": {
            const res = toggleSearchDialog();
            await smartDelay(280);
            syncSearchStateToTop();
            sendBridgeResult(cmd.id, "TOGGLE_SEARCH", true, { ...res, isOpenNow: isSearchDialogOpen() });
            break;
          }

          case "TOGGLE_PROMPT": {
            isPromptHidden = typeof args.hidden === "boolean" ? args.hidden : !isPromptHidden;
            applyPromptVisibility();
            try {
              window.top.postMessage({ type: "AGY_PROMPT_STATE", hidden: isPromptHidden }, "*");
            } catch (err) {}
            const stillVisible = !!(findRealChatInputBox() && isElementVisible(findRealChatInputBox()));
            sendBridgeResult(cmd.id, "TOGGLE_PROMPT", true, { hidden: isPromptHidden, boxStillVisible: stillVisible });
            break;
          }

          case "SWITCH_CHAT": {
            const title = args.title || "";
            const el = findSidebarConversationItem(title);
            if (el) {
              forceClick(el);
              updateBar(`🤖 AI chuyển sang: ${title.slice(0, 24)}`, "info", 2200);
              sendBridgeResult(cmd.id, "SWITCH_CHAT", true, { clickedTitle: title });
            } else {
              switchToConversation({ title });
              sendBridgeResult(cmd.id, "SWITCH_CHAT", false, { reason: "Trying sidebar fallback", title });
            }
            break;
          }

          case "QUICK_SEND":
            handleQuickSend(args.char || "o");
            sendBridgeResult(cmd.id, "QUICK_SEND", true, { char: args.char || "o" });
            break;

          case "CLICK_SELECTOR": {
            let targetEl = null;
            if (args.selector) {
              const found = queryDeep(args.selector).filter((el) => isElementVisible(el));
              if (args.text) {
                const want = String(args.text).toLowerCase();
                targetEl = found.find((el) => (el.innerText || el.textContent || "").toLowerCase().includes(want)) || null;
              } else {
                targetEl = found[0] || null;
              }
            }
            if (targetEl) {
              forceClick(targetEl);
              sendBridgeResult(cmd.id, "CLICK_SELECTOR", true, { text: (targetEl.innerText || "").slice(0, 80) });
            } else {
              sendBridgeResult(cmd.id, "CLICK_SELECTOR", false, { error: "Element not found" });
            }
            break;
          }

          default:
            sendBridgeResult(cmd.id, cmd.cmd, false, { error: "Unknown command" });
        }
      }

      let lastBridgeOnline = false;
      function sendIframeBridgeHeartbeat() {
        if (isTop || !isChatOwnerActive()) return;
        const activeChat = getCurrentConversationTitle();
        const searchOpen = isSearchDialogOpen();
        if (searchOpen !== lastKnownSearchOpen) {
          syncSearchStateToTop(searchOpen);
        }
        const items = collectSidebarItems({ detectBadges: true });
        const hasApprovalDialog = !!findApprovalDialog();

        try {
          window.top.postMessage(
            {
              type: "AGY_IFRAME_HEARTBEAT_V22",
              bridgeOnline: lastBridgeOnline,
              activeChat,
              sidebarCount: items.length,
            },
            "*"
          );
        } catch (e) {}

        try {
          chrome.runtime.sendMessage(
            {
              type: "AGY_BRIDGE_HEARTBEAT",
              payload: {
                frame: "iframe",
                extensionVersion: AGY_VERSION,
                url: window.location.href,
                activeChat,
                sidebarCount: items.length,
                hasApprovalDialog,
                idlePromptWaiting: document.body?.classList.contains("agy-idle-light") || document.body?.classList.contains("agy-idle-dark"),
                sidebarPreview: items.slice(0, 20).map((i) => ({
                  cascadeId: i.cascadeId,
                  title: i.title,
                  selected: i.selected,
                  hasAttentionBadge: i.hasAttentionBadge,
                  hasStopBtn: i.hasStopBtn,
                })),
                timestamp: Date.now(),
              },
            },
            (resp) => {
              if (chrome.runtime.lastError) return;
              lastBridgeOnline = !!(resp && resp.bridgeOnline);
              try {
                window.top.postMessage(
                  {
                    type: "AGY_IFRAME_HEARTBEAT_V22",
                    bridgeOnline: lastBridgeOnline,
                    activeChat,
                    sidebarCount: items.length,
                  },
                  "*"
                );
              } catch (e) {}

              if (resp && Array.isArray(resp.commands)) {
                for (const cmd of resp.commands) {
                  executeBridgeCommand(cmd);
                }
              }
            }
          );
        } catch (err) {}
      }

      if (!isTop) {
        window.__AGY_BRIDGE_INTERVAL = setInterval(sendIframeBridgeHeartbeat, 1400);
        setTimeout(sendIframeBridgeHeartbeat, 300);
      }

      // ─── Smart Search Catalog Scraper, Sweep & Direct Jump (v2.0.0) ───────────
      let cachedMappings = [];
      let cachedCatalog = [];
      let cachedJobs = {};
      let lastCatalogSig = "";
      let lastCatalogSyncAt = 0;
      let catalogSweepBusy = false;
      const notifiedResultKeys = new Set();

      async function refreshHandoffStorageCache() {
        try {
          const data = await chrome.storage.local.get([
            "agy_project_mappings",
            "agy_search_index",
            "agy_local_catalog",
            "agy_handoff_jobs"
          ]);
          cachedMappings = Array.isArray(data.agy_project_mappings) ? data.agy_project_mappings : [];
          const a = Array.isArray(data.agy_search_index) ? data.agy_search_index : [];
          const b = Array.isArray(data.agy_local_catalog) ? data.agy_local_catalog : [];
          const map = new Map();
          for (const it of [...a, ...b]) {
            if (!it) continue;
            const k = it.cascadeId || ("proj:" + String(it.projectLabel || it.title || "").toLowerCase());
            if (!map.has(k)) map.set(k, it);
          }
          cachedCatalog = Array.from(map.values());
          cachedJobs = data.agy_handoff_jobs && typeof data.agy_handoff_jobs === "object" ? data.agy_handoff_jobs : {};
        } catch (_) {}
      }

      function fetchHostTabInfoOnce() {
        if (isTop) return;
        try {
          chrome.runtime.sendMessage({ type: "AGY_GET_SELF_TAB_INFO" }, (resp) => {
            if (chrome.runtime.lastError || !resp || !resp.ok) return;
            if (resp.url) hostTabMeta.url = resp.url;
            if (resp.title) hostTabMeta.title = resp.title;
          });
        } catch (_) {}
      }

      function getCurrentProjectLabel() {
        const selectedRow = document.querySelector('[data-testid="conversation-row-sidebar"][data-selected="true"]');
        if (selectedRow) {
          const sub = (selectedRow.getAttribute("data-subtext") || "").trim();
          if (sub) return sub;
          const sec = selectedRow.closest("[data-sidebar-section-id]");
          const hdr = sec?.querySelector('button[data-testid="project-header"]');
          const hdrLabel = (hdr?.getAttribute("data-project-label") || hdr?.textContent || "").trim();
          if (hdrLabel) return hdrLabel;
        }
        const crumbs = Array.from(document.querySelectorAll("header *, nav *")).filter((el) => {
          const t = (el.textContent || "").trim();
          return el.children.length === 0 && t.includes(" / ") && t.length < 120;
        });
        if (crumbs.length > 0) {
          return (crumbs[0].textContent || "").split(" / ")[0].trim();
        }
        return "";
      }

      function getCurrentRemoteContext() {
        const rawUrl = isTop ? window.location.href : (hostTabMeta.url || window.location.href);
        const rawTitle = isTop ? document.title : (hostTabMeta.title || document.title);
        const base = HANDOFF_CORE
          ? HANDOFF_CORE.extractRemoteContextFromUrl(rawUrl, rawTitle)
          : { url: rawUrl, title: rawTitle, workspaceId: "", projectId: "", cascadeId: "", isRemote: /\/remote\//i.test(rawUrl), suggestedMatch: rawUrl };
        return {
          ...base,
          projectLabel: getCurrentProjectLabel() || base.projectLabel || "",
          cascadeId: extractCascadeIdFromUrl() || base.cascadeId || "",
        };
      }

      function collectCatalogSnapshot() {
        if (!isChatOwnerActive()) return [];
        const itemsMap = new Map();
        const now = Date.now();

        function upsert(entry) {
          if (!entry) return;
          const key = entry.isProjectHeader
            ? "proj:" + String(entry.projectLabel || entry.title || "").toLowerCase()
            : (entry.cascadeId || ("chat:" + String(entry.title || "").toLowerCase()));
          if (!key || key === "proj:" || key === "chat:") return;
          const prev = itemsMap.get(key) || {};
          itemsMap.set(key, { ...prev, ...entry, updatedAt: entry.updatedAt || prev.updatedAt || now });
        }

        // 1. Visible Project Headers & Folder Labels (supports all Antigravity sidebar variants)
        const sidebarRoot = document.querySelector('[role="navigation"][aria-label="Sidebar"], [data-testid="conversation-list-sidebar"], aside, nav') || document;
        sidebarRoot.querySelectorAll('button[data-testid="project-header"], [data-project-card="true"], [data-project-label]').forEach((btn) => {
          const lbl = (btn.getAttribute("data-project-label") || btn.innerText || btn.textContent || "").replace(/\s+/g, " ").trim();
          if (!lbl || /^(in progress|idle|pinned|conversations|projects)$/i.test(lbl)) return;
          upsert({
            isProjectHeader: true,
            kind: "project",
            projectLabel: lbl,
            title: lbl,
            cascadeId: "",
            updatedAt: now,
          });
        });

        sidebarRoot.querySelectorAll('[data-project-glyph="folder"]').forEach((glyph) => {
          if (glyph.closest('[data-testid="conversation-row-sidebar"]')) return;
          const wrap = glyph.closest('button, a, [role="button"], div.flex') || glyph.parentElement;
          const lbl = (wrap?.innerText || wrap?.textContent || "").replace(/\s+/g, " ").trim();
          if (!lbl || lbl.length > 100 || /^(in progress|idle|pinned|conversations|projects)$/i.test(lbl)) return;
          upsert({
            isProjectHeader: true,
            kind: "project",
            projectLabel: lbl,
            title: lbl,
            cascadeId: "",
            updatedAt: now,
          });
        });

        // 2. Visible Sidebar Conversation Rows (+ synthesize project entry for every projectLabel seen)
        const sidebarRows = collectSidebarItems({ detectBadges: true });
        for (const r of sidebarRows) {
          const proj = (r.projectLabel || r.subtext || "").trim();
          if (proj) {
            upsert({
              isProjectHeader: true,
              kind: "project",
              projectLabel: proj,
              title: proj,
              cascadeId: "",
              updatedAt: now,
            });
          }
          if (r.cascadeId) {
            upsert({
              isProjectHeader: false,
              kind: "conversation",
              cascadeId: r.cascadeId,
              title: r.title,
              projectLabel: proj,
              href: r.href || "",
              isSelected: !!r.selected,
              isAttention: !!r.hasAttentionBadge,
              isRunning: !!(r.hasStopBtn || r.rowEl?.querySelector('[data-testid="status-loading-spinner"]')),
              updatedAt: now,
            });
          }
        }

        // 3. Opportunistically capture visible Fastpick items when native Ctrl+K search is open
        document.querySelectorAll('[data-testid^="fastpick-item-"]').forEach((fp) => {
          const id = fp.getAttribute("data-item-id") || fp.getAttribute("data-testid").replace("fastpick-item-", "") || "";
          const spans = Array.from(fp.querySelectorAll("span, div")).map((s) => (s.textContent || "").trim()).filter(Boolean);
          const title = spans[0] || (fp.innerText || "").split("\n")[0]?.trim() || "";
          if (!id || !title) return;
          let proj = "";
          const folder = fp.querySelector('[data-project-glyph="folder"]')?.parentElement?.textContent || "";
          if (folder) proj = folder.trim();
          if (proj) {
            upsert({
              isProjectHeader: true,
              kind: "project",
              projectLabel: proj,
              title: proj,
              cascadeId: "",
              updatedAt: now,
            });
          }
          upsert({
            isProjectHeader: false,
            kind: "conversation",
            cascadeId: id,
            title: title.slice(0, 140),
            projectLabel: proj,
            updatedAt: now,
          });
        });

        return Array.from(itemsMap.values());
      }

      function syncCatalogToBackground(force = false) {
        if (!isCurrentInstance() || !isChatOwnerActive()) return;
        const snapshot = collectCatalogSnapshot();
        const remoteCtx = getCurrentRemoteContext();
        const sig = `${remoteCtx.url}|${remoteCtx.projectLabel}|${snapshot.length}|` +
          snapshot.slice(0, 12).map((x) => `${x.cascadeId || x.projectLabel}:${x.isRunning ? 1 : 0}:${x.isAttention ? 1 : 0}`).join(",");
        const now = Date.now();
        if (!force && sig === lastCatalogSig && now - lastCatalogSyncAt < 12000) return;
        lastCatalogSig = sig;
        lastCatalogSyncAt = now;

        try {
          chrome.runtime.sendMessage({
            type: "AGY_REGISTER_CATALOG",
            catalogItems: snapshot,
            activeProjectLabel: remoteCtx.projectLabel || "",
            activeCascadeId: remoteCtx.cascadeId || "",
            isChatOwner: true,
            remoteContext: remoteCtx,
          }, () => { void chrome.runtime.lastError; });
        } catch (_) {}
      }

      function findSidebarScrollContainer() {
        const primary = document.querySelector('[data-testid="conversation-list-sidebar"], [data-sidebar-scroll-container="true"]');
        if (primary && primary.scrollHeight > primary.clientHeight + 20) return primary;
        const nav = document.querySelector('[role="navigation"][aria-label="Sidebar"], aside, nav');
        if (nav) {
          const scrollers = Array.from(nav.querySelectorAll('.overflow-y-auto, [class*="overflow-y"]'))
            .filter((el) => el.scrollHeight > el.clientHeight + 20);
          if (scrollers.length > 0) {
            scrollers.sort((a, b) => b.scrollHeight - a.scrollHeight);
            return scrollers[0];
          }
        }
        return primary || null;
      }

      async function sweepFullCatalogForSmartSearch() {
        if (!isChatOwnerActive() || catalogSweepBusy) return;
        catalogSweepBusy = true;
        try {
          const allMap = new Map();
          const mergeSnap = (snap) => {
            for (const x of snap) {
              const k = x.isProjectHeader ? "proj:" + x.projectLabel.toLowerCase() : x.cascadeId;
              if (k) allMap.set(k, x);
            }
          };
          const countStats = () => {
            let projects = 0, chats = 0;
            for (const v of allMap.values()) {
              if (v.isProjectHeader) projects++;
              else if (v.cascadeId) chats++;
            }
            return { projects, chats };
          };

          mergeSnap(collectCatalogSnapshot());

          const sc = findSidebarScrollContainer();
          if (sc) {
            const origTop = sc.scrollTop;
            const step = Math.max(180, Math.floor((sc.clientHeight || 400) * 0.65));
            let y = 0;
            let atEndCount = 0;

            for (let stepCount = 0; stepCount < 250; stepCount++) {
              sc.scrollTop = y;
              sc.dispatchEvent(new Event("scroll", { bubbles: true }));
              await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 55)));
              mergeSnap(collectCatalogSnapshot());

              if (stepCount % 5 === 0) {
                const st = countStats();
                try {
                  window.top.postMessage({ type: "AGY_SWEEP_PROGRESS_V2", projects: st.projects, chats: st.chats }, "*");
                } catch (_) {}
              }

              const maxTop = Math.max(0, sc.scrollHeight - sc.clientHeight);
              if (y >= maxTop) {
                atEndCount++;
                if (atEndCount >= 2) break;
                y = maxTop;
              } else {
                y = Math.min(maxTop, y + step);
              }
            }

            // Capture any visible "See all (N)" expanded rows safely without losing earlier full sweep
            const seeAllBtns = Array.from(document.querySelectorAll("button, a, [role='button']")).filter((b) => {
              if (!isElementVisible(b)) return false;
              const t = (b.textContent || "").trim();
              return /^see all\s*(\(\d+\))?$/i.test(t) || /^xem tất cả/i.test(t);
            }).slice(0, 6);

            for (const btn of seeAllBtns) {
              try {
                forceClick(btn);
                await smartDelay(240);
                mergeSnap(collectCatalogSnapshot());
              } catch (_) {}
            }

            sc.scrollTop = origTop;
            sc.dispatchEvent(new Event("scroll", { bubbles: true }));
          }

          const collected = Array.from(allMap.values());
          const finalStats = countStats();
          const remoteCtx = getCurrentRemoteContext();
          await new Promise((resolve) => {
            chrome.runtime.sendMessage({
              type: "AGY_REGISTER_CATALOG",
              catalogItems: collected,
              activeProjectLabel: remoteCtx.projectLabel || "",
              activeCascadeId: remoteCtx.cascadeId || "",
              isChatOwner: true,
              remoteContext: remoteCtx,
            }, () => {
              void chrome.runtime.lastError;
              resolve();
            });
          });

          try {
            window.top.postMessage({
              type: "AGY_SWEEP_DONE_V2",
              count: collected.length,
              projects: finalStats.projects,
              chats: finalStats.chats
            }, "*");
          } catch (_) {}
        } finally {
          catalogSweepBusy = false;
        }
      }

      async function handleJumpToCatalogItem(item) {
        if (!item || !isChatOwnerActive()) return false;
        if (item.cascadeId && await switchToCascadeId(item.cascadeId)) {
          return true;
        }

        // Mobile fallback: if sidebar rows aren't rendered, tap top-left sidebar/back trigger once requested
        const visibleRows = document.querySelectorAll('[data-testid="conversation-row-sidebar"]');
        if (visibleRows.length === 0) {
          const toggleBtn = Array.from(document.querySelectorAll('button, a, [role="button"]')).find((b) => {
            if (b.id && b.id.startsWith("agy-")) return false;
            if (!isElementVisible(b)) return false;
            const lbl = ((b.getAttribute("aria-label") || "") + " " + (b.title || "")).toLowerCase();
            const r = b.getBoundingClientRect();
            return r.top < 72 && r.left < 80 && (/back|sidebar|menu|drawer|conversations|quay lại/.test(lbl) || !!b.querySelector("svg"));
          });
          if (toggleBtn) {
            forceClick(toggleBtn);
            await smartDelay(450);
            if (item.cascadeId && await switchToCascadeId(item.cascadeId)) {
              return true;
            }
          }
        }

        if (item.title && switchToConversation(item.title)) {
          return true;
        }

        if (item.href && item.href.startsWith("/")) {
          const a = document.createElement("a");
          a.href = item.href;
          a.style.display = "none";
          document.body.appendChild(a);
          forceClick(a);
          setTimeout(() => a.remove(), 200);
          return true;
        }
        return false;
      }

      // ─── Handoff 1-Click & Return Result System (v2.0.0) ─────────────────────
      function injectHandoffStyles() {
        if (document.getElementById("agy-handoff-style")) return;
        const st = document.createElement("style");
        st.id = "agy-handoff-style";
        st.setAttribute("data-agy-ui", "1");
        st.textContent = `
          .agy-handoff-bar, .agy-result-bar {
            margin: 6px 0 12px 0 !important;
            padding: 10px 12px !important;
            border-radius: 12px !important;
            background: rgba(15, 23, 42, 0.95) !important;
            color: #f8fafc !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            font-size: 12.5px !important;
            line-height: 1.4 !important;
            border: 1.5px solid rgba(56, 189, 248, 0.45) !important;
            box-shadow: 0 8px 22px rgba(0, 0, 0, 0.35) !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .agy-result-bar {
            border-color: rgba(52, 211, 153, 0.55) !important;
          }
          .agy-hb-top {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 8px !important;
            flex-wrap: wrap !important;
          }
          .agy-hb-title {
            display: flex !important;
            align-items: center !important;
            gap: 7px !important;
            flex-wrap: wrap !important;
            font-weight: 700 !important;
          }
          .agy-hb-badge {
            background: rgba(37, 99, 235, 0.35) !important;
            border: 1px solid rgba(96, 165, 250, 0.55) !important;
            color: #bfdbfe !important;
            padding: 2px 7px !important;
            border-radius: 6px !important;
            font-size: 11px !important;
            font-weight: 800 !important;
          }
          .agy-hb-badge.res {
            background: rgba(16, 185, 129, 0.25) !important;
            border-color: rgba(52, 211, 153, 0.55) !important;
            color: #6ee7b7 !important;
          }
          .agy-hb-status {
            padding: 2px 8px !important;
            border-radius: 999px !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            background: rgba(255, 255, 255, 0.1) !important;
            color: #cbd5e1 !important;
          }
          .agy-hb-status.sent { background: rgba(16, 185, 129, 0.24) !important; color: #86efac !important; }
          .agy-hb-status.sending { background: rgba(251, 191, 36, 0.24) !important; color: #fde68a !important; }
          .agy-hb-status.err { background: rgba(239, 68, 68, 0.24) !important; color: #fca5a5 !important; }
          .agy-hb-controls {
            display: flex !important;
            align-items: center !important;
            gap: 7px !important;
            flex-wrap: wrap !important;
          }
          .agy-hb-select {
            background: #020617 !important;
            color: #f8fafc !important;
            border: 1px solid rgba(148, 163, 184, 0.35) !important;
            border-radius: 7px !important;
            padding: 6px 8px !important;
            font-size: 12px !important;
            max-width: 220px !important;
            min-height: 34px !important;
          }
          .agy-hb-btn {
            border: none !important;
            border-radius: 8px !important;
            padding: 7px 12px !important;
            min-height: 36px !important;
            font-size: 12.5px !important;
            font-weight: 800 !important;
            cursor: pointer !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 5px !important;
            touch-action: manipulation !important;
          }
          .agy-hb-btn:disabled { opacity: 0.55 !important; cursor: not-allowed !important; }
          .agy-hb-btn-primary { background: #2563eb !important; color: #fff !important; }
          .agy-hb-btn-return { background: #059669 !important; color: #fff !important; }
          .agy-hb-btn-pairlocal { background: rgba(16, 185, 129, 0.24) !important; border: 1px solid rgba(52, 211, 153, 0.6) !important; color: #6ee7b7 !important; }
          .agy-hb-btn-save { background: rgba(245, 158, 11, 0.22) !important; border: 1px solid rgba(245, 158, 11, 0.55) !important; color: #fde68a !important; }
          .agy-hb-btn-sec { background: rgba(255, 255, 255, 0.1) !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; color: #e2e8f0 !important; }
          .agy-hb-check {
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
            font-size: 11.5px !important;
            color: #cbd5e1 !important;
            cursor: pointer !important;
          }
        `;
        (document.head || document.documentElement).appendChild(st);
      }

      let openLocalTabInfo = null;
      let lastOpenLocalTabCheckAt = 0;

      function refreshOpenLocalTabInfo(force = false, onUpdated = null) {
        const now = Date.now();
        if (!force && now - lastOpenLocalTabCheckAt < 5000) return;
        lastOpenLocalTabCheckAt = now;
        try {
          chrome.runtime.sendMessage({ type: "AGY_GET_ACTIVE_LOCAL_TAB" }, (resp) => {
            if (chrome.runtime.lastError || !resp || !resp.ok) return;
            const nextInfo = resp.localTab || null;
            const prevKey = openLocalTabInfo ? `${openLocalTabInfo.tabId}|${openLocalTabInfo.projectLabel}|${openLocalTabInfo.chatTitle}` : "";
            const nextKey = nextInfo ? `${nextInfo.tabId}|${nextInfo.projectLabel}|${nextInfo.chatTitle}` : "";
            openLocalTabInfo = nextInfo;
            if (prevKey !== nextKey && typeof onUpdated === "function") {
              onUpdated();
            }
          });
        } catch (_) {}
      }

      function getAllKnownLocalProjects(resolvedProject) {
        const set = new Set();
        if (resolvedProject) set.add(resolvedProject);
        for (const m of cachedMappings) {
          if (m && m.localProject) set.add(m.localProject.trim());
        }
        for (const c of cachedCatalog) {
          const p = String(c?.projectLabel || (c?.isProjectHeader ? c.title : "") || "").trim();
          if (p) set.add(p);
        }
        return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
      }

      async function copyTextSafe(text) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch (_) {
          try {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;";
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand("copy");
            ta.remove();
            return !!ok;
          } catch (e2) {
            return false;
          }
        }
      }

      function renderHandoffBar(codeContainer, handoff) {
        injectHandoffStyles();
        let bar = codeContainer.nextElementSibling;
        if (!bar || !bar.classList || !bar.classList.contains("agy-handoff-bar")) {
          bar = document.createElement("div");
          bar.className = "agy-handoff-bar";
          bar.setAttribute("data-agy-ui", "1");
          codeContainer.insertAdjacentElement("afterend", bar);
        }

        const remoteCtx = getCurrentRemoteContext();
        const resolved = HANDOFF_CORE
          ? HANDOFF_CORE.resolveTargetMapping(handoff, remoteCtx, cachedMappings, cachedCatalog)
          : { matchedBy: "unmatched", mapping: null, targetLocalProject: "", targetCascadeId: "" };

        const hid = handoff.id || "no-id";
        const job = cachedJobs[hid] || null;
        const jobStatus = bar.dataset.sending === "1" ? "sending" : (job?.status || "ready");
        const chosenProj = bar.dataset.userSelectedProj !== undefined
          ? bar.dataset.userSelectedProj
          : (resolved.targetLocalProject || resolved.suggestedLocalProject || "");
        const projects = getAllKnownLocalProjects(chosenProj);

        const canShowPairLocal = resolved.matchedBy === "unmatched" || resolved.matchedBy === "default";
        if (handoff.complete && canShowPairLocal) {
          refreshOpenLocalTabInfo(false, () => {
            bar.dataset.agySig = "";
            renderHandoffBar(codeContainer, handoff);
          });
        }
        const openLocalLabel = canShowPairLocal && openLocalTabInfo
          ? String(openLocalTabInfo.projectLabel || openLocalTabInfo.chatTitle || "").trim()
          : "";

        const sig = JSON.stringify([
          handoff.complete ? 1 : 0,
          hid,
          handoff.targetProject,
          handoff.actionSummary,
          jobStatus,
          resolved.matchedBy,
          resolved.targetLocalProject,
          chosenProj,
          projects.join("|"),
          openLocalLabel,
        ]);
        if (bar.dataset.agySig === sig) return;
        bar.dataset.agySig = sig;

        if (!handoff.complete) {
          bar.innerHTML = `
            <div class="agy-hb-top">
              <div class="agy-hb-title">
                <span class="agy-hb-badge">⚡ HANDOFF${hid !== "no-id" ? " #" + hid.replace(/</g, "&lt;") : ""}</span>
                <span>${String(handoff.actionSummary || "Đang stream nội dung...").replace(/</g, "&lt;")}</span>
              </div>
              <span class="agy-hb-status">Stream...</span>
            </div>
            <div class="agy-hb-controls">
              <button type="button" class="agy-hb-btn agy-hb-btn-primary" disabled>⏳ Đang nhận prompt...</button>
            </div>
          `;
          return;
        }

        const matchLabel =
          resolved.matchedBy === "alias" ? "Khớp alias" :
          resolved.matchedBy === "remote_match" ? "Khớp tab Remote" :
          resolved.matchedBy === "default" ? "Mặc định" : "Chưa liên kết";

        const isSent = jobStatus === "sent" || jobStatus === "queued_new_tab" || jobStatus === "result_ready" || jobStatus === "returned_to_web";
        const statusText =
          jobStatus === "sending" ? "Đang gửi..." :
          jobStatus === "result_ready" ? "✅ Đã có kết quả" :
          isSent ? "✅ Đã gửi" :
          jobStatus === "failed" ? "⚠️ Gửi lỗi" : "Sẵn sàng";
        const statusCls =
          jobStatus === "sending" ? "sending" :
          isSent ? "sent" :
          jobStatus === "failed" ? "err" : "";

        const needsQuickSave =
          Boolean(chosenProj) &&
          (resolved.matchedBy === "unmatched" || resolved.matchedBy === "default" || (resolved.targetLocalProject && chosenProj !== resolved.targetLocalProject));

        bar.innerHTML = `
          <div class="agy-hb-top">
            <div class="agy-hb-title">
              <span class="agy-hb-badge">⚡ HANDOFF #${hid.replace(/</g, "&lt;")}</span>
              <span>${String(handoff.actionSummary || "(Không có mô tả)").replace(/</g, "&lt;")}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <span class="agy-hb-status">${matchLabel}</span>
              <span class="agy-hb-status ${statusCls}">${statusText}</span>
            </div>
          </div>
          <div class="agy-hb-controls">
            <select class="agy-hb-select" title="Chọn dự án AGY Local đích">
              <option value="">-- Chọn dự án Local --</option>
              ${projects.map((p) => `<option value="${p.replace(/"/g, "&quot;")}" ${p === chosenProj ? "selected" : ""}>📁 ${p.replace(/</g, "&lt;")}</option>`).join("")}
            </select>
            <label class="agy-hb-check" title="Mở cuộc trò chuyện mới trước khi gửi prompt">
              <input type="checkbox" class="agy-hb-newchat" ${bar.dataset.newChat === "1" ? "checked" : ""}> + Chat mới
            </label>
            <button type="button" class="agy-hb-btn agy-hb-btn-primary agy-hb-send" ${(jobStatus === "sending" || !chosenProj) ? "disabled" : ""}>
              ${jobStatus === "sending" ? "⏳ Đang gửi..." : (isSent ? `🔄 Gửi lại (${chosenProj.replace(/</g, "&lt;")})` : `▶ Gửi sang Local (${(chosenProj || "Chọn dự án").replace(/</g, "&lt;")})`)}
            </button>
            ${openLocalLabel ? `<button type="button" class="agy-hb-btn agy-hb-btn-pairlocal agy-hb-pairlocal" title="Ghép tab này với dự án ở Tab Local đang mở">🔗 Ghép với Tab Local đang mở (${openLocalLabel.slice(0, 28).replace(/</g, "&lt;")})</button>` : ""}
            ${needsQuickSave ? `<button type="button" class="agy-hb-btn agy-hb-btn-save agy-hb-quicksave">💾 Lưu liên kết này</button>` : ""}
            <button type="button" class="agy-hb-btn agy-hb-btn-sec agy-hb-opts" title="Mở Setting Remote <-> Local">⚙️</button>
          </div>
        `;

        const sel = bar.querySelector(".agy-hb-select");
        const chk = bar.querySelector(".agy-hb-newchat");
        const sendBtn = bar.querySelector(".agy-hb-send");
        const pairLocalBtn = bar.querySelector(".agy-hb-pairlocal");
        const saveBtn = bar.querySelector(".agy-hb-quicksave");
        const optsBtn = bar.querySelector(".agy-hb-opts");

        if (sel) {
          sel.onchange = () => {
            bar.dataset.userSelectedProj = sel.value;
            bar.dataset.agySig = "";
            renderHandoffBar(codeContainer, handoff);
          };
        }
        if (chk) {
          chk.onchange = () => {
            bar.dataset.newChat = chk.checked ? "1" : "0";
          };
        }
        if (optsBtn) {
          optsBtn.onclick = () => chrome.runtime.sendMessage({ type: "AGY_OPEN_OPTIONS" });
        }
        if (pairLocalBtn && openLocalTabInfo) {
          pairLocalBtn.onclick = async () => {
            const projToSave = String(openLocalTabInfo.projectLabel || openLocalTabInfo.chatTitle || "").trim();
            if (!projToSave) return;
            const aliasToSave = !HANDOFF_CORE.isGenericTargetProject(handoff.targetProject)
              ? handoff.targetProject
              : projToSave.toLowerCase().replace(/[^a-z0-9/_-]+/g, "-").replace(/^-|-$/g, "");
            const resp = await chrome.runtime.sendMessage({
              type: "AGY_SAVE_QUICK_MAPPING",
              payload: {
                alias: aliasToSave || projToSave,
                remoteMatch: remoteCtx.suggestedMatch || remoteCtx.projectLabel || remoteCtx.url,
                localProject: projToSave,
                localCascadeId: openLocalTabInfo.projectLabel ? "" : (openLocalTabInfo.cascadeId || ""),
                isDefault: cachedMappings.length === 0,
              },
            });
            if (resp && resp.ok) {
              delete bar.dataset.userSelectedProj;
              await refreshHandoffStorageCache();
              bar.dataset.agySig = "";
              renderHandoffBar(codeContainer, handoff);
              updateBar(`🔗 Đã ghép với Tab Local đang mở (${projToSave})!`, "success", 2800);
            }
          };
        }
        if (saveBtn) {
          saveBtn.onclick = async () => {
            const projToSave = sel ? sel.value.trim() : chosenProj;
            if (!projToSave) return;
            const aliasToSave = !HANDOFF_CORE.isGenericTargetProject(handoff.targetProject)
              ? handoff.targetProject
              : projToSave.toLowerCase().replace(/[^a-z0-9/_-]+/g, "-");
            const resp = await chrome.runtime.sendMessage({
              type: "AGY_SAVE_QUICK_MAPPING",
              payload: {
                alias: aliasToSave,
                remoteMatch: remoteCtx.suggestedMatch || remoteCtx.projectLabel || remoteCtx.url,
                localProject: projToSave,
                isDefault: cachedMappings.length === 0,
              },
            });
            if (resp && resp.ok) {
              await refreshHandoffStorageCache();
              bar.dataset.agySig = "";
              renderHandoffBar(codeContainer, handoff);
              updateBar(`💾 Đã lưu liên kết ${aliasToSave} -> ${projToSave}!`, "success", 2600);
            }
          };
        }
        if (sendBtn) {
          sendBtn.onclick = async () => {
            if (bar.dataset.sending === "1") return;
            const targetProj = sel ? sel.value.trim() : chosenProj;
            if (!targetProj) {
              updateBar("⚠️ Hãy chọn dự án Local đích trước khi gửi!", "warning", 2200);
              return;
            }
            bar.dataset.sending = "1";
            bar.dataset.agySig = "";
            renderHandoffBar(codeContainer, handoff);

            const matchedMapping = resolved.mapping && resolved.mapping.localProject === targetProj
              ? resolved.mapping
              : cachedMappings.find((m) => HANDOFF_CORE.normalizeSearchText(m.localProject) === HANDOFF_CORE.normalizeSearchText(targetProj));
            const formattedPrompt = HANDOFF_CORE
              ? HANDOFF_CORE.formatOutgoingHandoffPrompt(handoff)
              : handoff.prompt;

            try {
              const res = await chrome.runtime.sendMessage({
                type: "AGY_DISPATCH_HANDOFF",
                payload: {
                  handoff,
                  targetLocalProject: targetProj,
                  targetCascadeId: matchedMapping?.localCascadeId || "",
                  createNewChat: chk ? chk.checked : false,
                  formattedPrompt,
                  sourceRemoteCtx: remoteCtx,
                },
              });
              await refreshHandoffStorageCache();
              if (res && res.ok) {
                updateBar(`✅ Đã gửi Handoff #${hid} sang Local (${targetProj})!`, "success", 2800);
              } else {
                updateBar(`⚠️ ${(res && res.error) || "Gửi Handoff thất bại"}`, "warning", 3500);
              }
            } catch (err) {
              updateBar("⚠️ Lỗi kết nối background khi gửi Handoff", "warning", 3000);
            } finally {
              bar.dataset.sending = "0";
              bar.dataset.agySig = "";
              renderHandoffBar(codeContainer, handoff);
            }
          };
        }
      }

      function renderResultBar(codeContainer, result) {
        injectHandoffStyles();
        const notifyKey = `${result.id}|${(result.body || "").slice(0, 80)}`;
        if (result.id && !notifiedResultKeys.has(notifyKey)) {
          notifiedResultKeys.add(notifyKey);
          try {
            chrome.runtime.sendMessage({ type: "AGY_NOTIFY_RESULT_READY", payload: { result } }, () => {
              void chrome.runtime.lastError;
            });
          } catch (_) {}
        }

        let bar = codeContainer.nextElementSibling;
        if (!bar || !bar.classList || !bar.classList.contains("agy-result-bar")) {
          bar = document.createElement("div");
          bar.className = "agy-result-bar";
          bar.setAttribute("data-agy-ui", "1");
          codeContainer.insertAdjacentElement("afterend", bar);
        }

        const sig = `${result.id}|${result.status}|${(result.body || "").length}`;
        if (bar.dataset.agySig === sig) return;
        bar.dataset.agySig = sig;

        bar.innerHTML = `
          <div class="agy-hb-top">
            <div class="agy-hb-title">
              <span class="agy-hb-badge res">↩ KẾT QUẢ #${String(result.id || "?").replace(/</g, "&lt;")}</span>
              <span>${String(result.summary || "Sẵn sàng trả kết quả về bản Web Remote").replace(/</g, "&lt;")}</span>
            </div>
            <span class="agy-hb-status sent">${String(result.status || "done").replace(/</g, "&lt;")}</span>
          </div>
          <div class="agy-hb-controls">
            <button type="button" class="agy-hb-btn agy-hb-btn-return agy-res-return">↩ Dán kết quả về Web</button>
            <button type="button" class="agy-hb-btn agy-hb-btn-sec agy-res-copy">📋 Copy kết quả</button>
          </div>
        `;

        const returnBtn = bar.querySelector(".agy-res-return");
        const copyBtn = bar.querySelector(".agy-res-copy");
        if (returnBtn) {
          returnBtn.onclick = async () => {
            returnBtn.disabled = true;
            returnBtn.textContent = "⏳ Đang dán về Web...";
            try {
              const resp = await chrome.runtime.sendMessage({
                type: "AGY_RETURN_RESULT_TO_WEB",
                payload: {
                  id: result.id,
                  result,
                  formattedReturn: result.rawBlock || result.body,
                },
              });
              if (resp && resp.ok) {
                returnBtn.textContent = "✅ Đã dán vào ô chat Web!";
                updateBar("✓ Đã dán kết quả về tab Web — kiểm tra rồi bấm Gửi!", "success", 3200);
              } else {
                returnBtn.textContent = "↩ Dán kết quả về Web";
                updateBar(`⚠️ ${(resp && resp.error) || "Không tìm thấy tab Web Remote"}`, "warning", 3200);
              }
            } catch (_) {
              returnBtn.textContent = "↩ Dán kết quả về Web";
            } finally {
              setTimeout(() => { if (returnBtn) returnBtn.disabled = false; }, 1200);
            }
          };
        }
        if (copyBtn) {
          copyBtn.onclick = async () => {
            const ok = await copyTextSafe(result.rawBlock || result.body || "");
            updateBar(ok ? "✓ Đã copy kết quả Handoff!" : "⚠️ Trình duyệt chặn Copy", ok ? "success" : "warning", 2200);
          };
        }
      }

      function scanHandoffAndResultBlocks() {
        if (!isCurrentInstance() || !isChatOwnerActive() || !HANDOFF_CORE) return;
        // Scan ONLY fenced <pre> code blocks (never inline <code> mentions inside prose)
        const nodes = document.querySelectorAll("pre");
        for (const el of nodes) {
          if (el.closest('[data-agy-ui="1"], #agy-control-container, #agy-smart-search-overlay')) continue;
          const raw = (el.innerText || el.textContent || "").trim();
          if (!raw.includes(HANDOFF_CORE.HANDOFF_START_MARKER) && !raw.includes(HANDOFF_CORE.RESULT_START_MARKER)) {
            continue;
          }

          // Ignore bare single-line marker strings without multi-line payload or metadata fields
          const hasBlockStructure = raw.includes("\n") || /(?:id|target_project|action_summary)\s*:|---PROMPT---|---RESULT---/i.test(raw);
          if (!hasBlockStructure) {
            continue;
          }

          if (raw.includes(HANDOFF_CORE.HANDOFF_START_MARKER)) {
            const h = HANDOFF_CORE.parseHandoffBlock(raw);
            if (h.found) {
              if (h.id === "<handoff_id>" || h.prompt === "<nội dung prompt nhiều dòng>") continue;
              renderHandoffBar(el, h);
            }
          }

          if (raw.includes(HANDOFF_CORE.RESULT_START_MARKER)) {
            const r = HANDOFF_CORE.parseResultBlock(raw);
            if (r.found && r.complete) {
              if (!r.body || /^<ket qua/i.test(r.body.trim())) continue;
              renderResultBar(el, r);
            }
          }
        }
      }

      function scheduleHandoffDomScan() {
        if (!isCurrentInstance() || !isChatOwnerActive()) return;
        clearTimeout(window.__AGY_HANDOFF_DEBOUNCE);
        window.__AGY_HANDOFF_DEBOUNCE = setTimeout(scanHandoffAndResultBlocks, 220);
      }
      window.__AGY_SCAN_HANDOFFS = scheduleHandoffDomScan;

      async function executeIncomingLocalHandoff(payload) {
        if (!payload || !isChatOwnerActive()) {
          return { ok: false, error: "Frame chua san sang nhan lenh Local" };
        }
        const targetProj = String(payload.targetLocalProject || "").trim();
        let targetId = String(payload.targetCascadeId || "").trim();

        if (!targetId && targetProj && HANDOFF_CORE) {
          const normProj = HANDOFF_CORE.normalizeSearchText(targetProj);
          const visibleMatch = collectSidebarItems({ detectBadges: false }).find(
            (i) => i.cascadeId && HANDOFF_CORE.normalizeSearchText(i.projectLabel) === normProj
          );
          if (visibleMatch) {
            targetId = visibleMatch.cascadeId;
          } else {
            const catMatch = cachedCatalog.find(
              (c) => !c.isProjectHeader && c.cascadeId && HANDOFF_CORE.normalizeSearchText(c.projectLabel) === normProj
            );
            if (catMatch) targetId = catMatch.cascadeId;
          }
        }

        if (targetId && extractCascadeIdFromUrl() !== targetId) {
          const switched = await switchToCascadeId(targetId);
          if (switched) await smartDelay(750);
        }

        if (payload.createNewChat) {
          const newBtn = Array.from(document.querySelectorAll('[data-testid="new-conversation-button"], a[aria-label*="New Conversation" i], button[aria-label*="New Conversation" i]'))
            .find((b) => isElementVisible(b));
          if (newBtn) {
            forceClick(newBtn);
            await smartDelay(650);
          }
        }

        const injectRes = await injectPromptText(payload.prompt || "", { autoSubmit: true, retries: 6 });
        if (!injectRes.ok) return injectRes;

        updateBar(`⚡ Đã nhận & gửi Handoff #${payload.id || ""} trên Local!`, "success", 3200);
        return {
          ok: true,
          chatTitle: getCurrentConversationTitle() || "",
          cascadeId: extractCascadeIdFromUrl() || targetId || "",
        };
      }

      window.__AGY_EXEC_BRIDGE_CMD_LOCAL = (cmd) => executeBridgeCommand(cmd);
      window.__AGY_LOCAL_CHAT_ACTION = (action, data = {}) => {
        if (!isCurrentInstance()) return;
        switch (action) {
          case "TOGGLE_PROMPT":
            isPromptHidden = !!data.hidden;
            pausedReadingForApproval = false;
            applyPromptVisibility();
            break;
          case "QUICK_SEND":
            handleQuickSend(data.char || "o");
            break;
          case "DIRECT_SUBMIT":
            handleDirectSubmit();
            break;
          case "TOGGLE_SEARCH":
            toggleSearchDialog();
            break;
          case "SWEEP_CATALOG":
            sweepFullCatalogForSmartSearch();
            break;
          case "JUMP_CASCADE":
            handleJumpToCatalogItem(data);
            break;
          case "DUMP_DOM":
            dumpSidebarDom({ copyClipboard: true });
            break;
          case "PING_PROOF":
            sendProofSnapshot(null, "Kiểm tra kết nối trực tiếp (Top Frame)", lastBridgeOnline || true);
            break;
          case "ENABLE_STATUS_GROUP":
            enableStatusGroupView();
            break;
        }
      };

      // Listen for broadcasts & relayed wakeup/bridge commands from top frame (in subframes only)
      addSafeListener(window, "message", (e) => {
        if (isTop || !isChatOwnerActive()) return;
        if (e.data && e.data.type === "AGY_HEARTBEAT_TICK_V24") {
          if (e.data.topUrl) hostTabMeta.url = e.data.topUrl;
          if (e.data.topTitle) hostTabMeta.title = e.data.topTitle;
          flushTickWaiters();
          scanAndProcess();
          runMultiProjectPatrol();
          return;
        }
        if (e.data && e.data.type === "AGY_BRIDGE_EXEC_V23") {
          executeBridgeCommand(e.data.cmd);
        }
        if (e.data && e.data.type === "AGY_TOGGLE_PROMPT") {
          isPromptHidden = !!e.data.hidden;
          pausedReadingForApproval = false;
          applyPromptVisibility();
        }
        if (e.data && e.data.type === "AGY_QUICK_SEND_V20") {
          handleQuickSend(e.data.char);
        }
        if (e.data && e.data.type === "AGY_DIRECT_SUBMIT_V20") {
          handleDirectSubmit();
        }
        if (e.data && e.data.type === "AGY_SWITCH_CHAT_V21") {
          switchToConversation(e.data.target);
        }
        if (e.data && (e.data.type === "AGY_TOGGLE_SEARCH_V25" || e.data.type === "AGY_TRIGGER_SEARCH_V22")) {
          toggleSearchDialog();
        }
        if (e.data && e.data.type === "AGY_SWEEP_CATALOG_V2") {
          sweepFullCatalogForSmartSearch();
        }
        if (e.data && e.data.type === "AGY_JUMP_CASCADE_V2") {
          handleJumpToCatalogItem(e.data.item || e.data);
        }
        if (e.data && e.data.type === "AGY_DUMP_SIDEBAR_REQ") {
          dumpSidebarDom({ copyClipboard: true });
        }
        if (e.data && e.data.type === "AGY_PING_PROOF_REQ") {
          sendProofSnapshot(null, "Kiểm tra thủ công từ Thanh điều khiển", lastBridgeOnline);
        }
        if (e.data && e.data.type === "AGY_ENABLE_STATUS_GROUP_V24") {
          enableStatusGroupView();
        }
      });

      // Relay Smart Search shortcut (Alt+K / Ctrl+Shift+K) from child iframes to Top frame
      if (!isTop) {
        addSafeListener(window, "keydown", (e) => {
          if (!isCurrentInstance()) return;
          const isAltK = e.altKey && !e.ctrlKey && !e.metaKey && (e.key || "").toLowerCase() === "k";
          const isCtrlShiftK = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key || "").toLowerCase() === "k";
          if (isAltK || isCtrlShiftK) {
            e.preventDefault();
            e.stopPropagation();
            try { window.top.postMessage({ type: "AGY_OPEN_SMART_SEARCH_V2" }, "*"); } catch (_) {}
          }
        }, true);
      }

      // Listen to Popup & Background messages (only the active chat-owner frame handles & responds)
      try {
        chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
          if (!isCurrentInstance() || !isChatOwnerActive() || !msg) return false;
          if (msg.type === "AGY_GET_LIVE_TAB_CONTEXT") {
            try {
              const ctx = getCurrentRemoteContext();
              sendResponse({
                ok: true,
                ...ctx,
                chatTitle: getCurrentConversationTitle() || "",
              });
            } catch (_) {
              sendResponse({ ok: false });
            }
            return false;
          }
          if (msg.type === "AGY_DUMP_SIDEBAR_REQ") {
            dumpSidebarDom({ copyClipboard: true });
            return false;
          }
          if (msg.type === "AGY_PING_PROOF_REQ") {
            sendProofSnapshot(null, "Kiểm tra từ Popup Extension", lastBridgeOnline);
            return false;
          }
          if (msg.type === "AGY_ENABLE_STATUS_GROUP_V24") {
            enableStatusGroupView();
            return false;
          }
          if (msg.type === "AGY_EXECUTE_HANDOFF_LOCAL") {
            executeIncomingLocalHandoff(msg.payload)
              .then(sendResponse)
              .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));
            return true;
          }
          if (msg.type === "AGY_FILL_RESULT_ON_WEB") {
            const txt = String((msg.payload && msg.payload.text) || "");
            injectPromptText(txt, { autoSubmit: false, retries: 5 })
              .then((res) => {
                if (res && res.ok) {
                  updateBar("✓ Đã điền kết quả vào ô chat — hãy kiểm tra rồi bấm Gửi!", "success", 3500);
                }
                sendResponse(res || { ok: false });
              })
              .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));
            return true;
          }
          return false;
        });
      } catch (err) {}

      // Sync Handoff storage cache & periodic Catalog/Handoff loops
      if (chrome?.storage?.onChanged) {
        const storageListener = (_changes, area) => {
          if (area !== "local" || !isCurrentInstance() || !isChatOwnerActive()) return;
          refreshHandoffStorageCache().then(() => {
            document.querySelectorAll(".agy-handoff-bar").forEach((b) => { b.dataset.agySig = ""; });
            scanHandoffAndResultBlocks();
          });
        };
        chrome.storage.onChanged.addListener(storageListener);
      }

      fetchHostTabInfoOnce();
      refreshHandoffStorageCache().then(() => {
        if (isChatOwnerActive()) {
          syncCatalogToBackground(true);
          scanHandoffAndResultBlocks();
        }
      });

      window.__AGY_CATALOG_INTERVAL = setInterval(() => syncCatalogToBackground(false), 3500);
      window.__AGY_HANDOFF_INTERVAL = setInterval(scanHandoffAndResultBlocks, 1500);

      // Background auto-sweep once ~4.5s after load so deep projects (beyond initial viewport) are pre-indexed
      setTimeout(() => {
        if (!isCurrentInstance() || !isChatOwnerActive() || catalogSweepBusy) return;
        const now = Date.now();
        if (now - lastSidebarHoverTime < 6000 || now - lastUserInteractTime < 4500) return;
        if (findSidebarScrollContainer()) {
          sweepFullCatalogForSmartSearch();
        }
      }, 4500);

      // Single-use pending Local Handoff recovery (if new Local tab was opened on dispatch)
      setTimeout(async () => {
        if (!isCurrentInstance() || !isChatOwnerActive()) return;
        const ctx = getCurrentRemoteContext();
        if (ctx.isRemote) return;
        try {
          const data = await chrome.storage.local.get(["agy_pending_local_handoff"]);
          const pending = data.agy_pending_local_handoff;
          if (!pending || !pending.prompt || Number(pending.expiresAt || 0) < Date.now()) return;
          await chrome.storage.local.remove("agy_pending_local_handoff");
          await executeIncomingLocalHandoff(pending);
        } catch (_) {}
      }, 1300);

      // 4. Continuously ensure the prompt card is lifted above dock / navigation bar
      function liftPromptCard() {
        if (!isChatOwnerActive()) return;
        if (!isTouch || isPromptHidden || document.body.classList.contains("agy-reading-mode")) return;
        const box = findRealChatInputBox();
        if (!box) return;

        // Find outer prompt card container safely without touching Search modal
        const card = findPromptContainerToHide(box);

        if (card && card.style.marginBottom !== "62px") {
          card.style.marginBottom = "62px";
          card.style.transition = "margin-bottom 0.25s ease";
        }
      }

      if (isTouch) {
        window.__AGY_LIFT_INTERVAL = setInterval(liftPromptCard, 1000);
        liftPromptCard();
      }

      // 5. Idle Prompt Background Monitor: tints active chat window warm yellow when AI stops & awaits prompt
      function initIdleBackgroundMonitor() {
        const idleStyleId = "agy-idle-bg-style";
        if (!document.getElementById(idleStyleId)) {
          const st = document.createElement("style");
          st.id = idleStyleId;
          st.textContent = `
            body.agy-idle-light [data-agy-idle-pane="1"],
            body.agy-idle-light [data-agy-idle-scroller="1"],
            body.agy-idle-light [data-agy-idle-footer="1"],
            body.agy-idle-light[data-agy-idle-body="1"] {
              background-color: #FEF5B3 !important;
              transition: background-color 0.35s ease !important;
            }
            body.agy-idle-dark [data-agy-idle-pane="1"],
            body.agy-idle-dark [data-agy-idle-scroller="1"],
            body.agy-idle-dark [data-agy-idle-footer="1"],
            body.agy-idle-dark[data-agy-idle-body="1"] {
              background-color: #2B240E !important;
              transition: background-color 0.35s ease !important;
            }
            body.agy-idle-light [data-agy-idle-card="1"] {
              background-color: rgba(255, 255, 255, 0.96) !important;
              box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.6) !important;
            }
            body.agy-idle-dark [data-agy-idle-card="1"] {
              box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.45) !important;
            }
          `;
          document.head.appendChild(st);
        }

        let cachedIdleYellowBg = true;
        getSettings().then((s) => {
          cachedIdleYellowBg = s.idleYellowBg !== false;
          updateIdlePromptBackground();
        });

        try {
          chrome.storage.onChanged.addListener((changes, area) => {
            if (!isCurrentInstance() || area !== "sync") return;
            if (changes.idleYellowBg !== undefined) {
              cachedIdleYellowBg = changes.idleYellowBg.newValue !== false;
              updateIdlePromptBackground();
            }
          });
        } catch (e) {}

        function detectDarkTheme() {
          try {
            const color = getComputedStyle(document.body).color || "";
            const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
            if (m) {
              const lum = Number(m[1]) * 0.299 + Number(m[2]) * 0.587 + Number(m[3]) * 0.114;
              return lum >= 128;
            }
          } catch (e) {}
          return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        }

        function findMainChatPane() {
          const sc = findChatScroller();
          if (!sc) return null;
          let cur = sc;
          while (cur.parentElement && cur.parentElement !== document.body && cur.parentElement !== document.documentElement) {
            const p = cur.parentElement;
            if (p.querySelector('[data-testid="conversation-list-sidebar"], nav[aria-label="Sidebar"], [role="navigation"][aria-label="Sidebar"]')) {
              break;
            }
            cur = p;
          }
          return cur;
        }

        let idleCandidateSince = 0;
        let manualForceRunningUntil = 0;

        function setAttrIfNeeded(el, attr) {
          document.querySelectorAll(`[${attr}]`).forEach((oldEl) => {
            if (oldEl !== el) oldEl.removeAttribute(attr);
          });
          if (el && el.getAttribute(attr) !== "1") {
            el.setAttribute(attr, "1");
          }
        }

        function clearIdleTags() {
          document.body.classList.remove("agy-idle-light", "agy-idle-dark");
          setAttrIfNeeded(null, "data-agy-idle-pane");
          setAttrIfNeeded(null, "data-agy-idle-scroller");
          setAttrIfNeeded(null, "data-agy-idle-footer");
          setAttrIfNeeded(null, "data-agy-idle-card");
          setAttrIfNeeded(null, "data-agy-idle-body");
        }

        function applyIdleYellowState(shouldShow) {
          if (!shouldShow) {
            if (document.body.classList.contains("agy-idle-light") || document.body.classList.contains("agy-idle-dark")) {
              clearIdleTags();
            }
            return;
          }

          const dark = detectDarkTheme();
          const wantCls = dark ? "agy-idle-dark" : "agy-idle-light";
          const otherCls = dark ? "agy-idle-light" : "agy-idle-dark";
          if (document.body.classList.contains(otherCls)) document.body.classList.remove(otherCls);
          if (!document.body.classList.contains(wantCls)) document.body.classList.add(wantCls);

          const sc = findChatScroller();
          const pane = findMainChatPane();
          const promptBox = findRealChatInputBox();
          const innerCard = promptBox
            ? (promptBox.closest("form") || promptBox.closest('[class*="rounded-"][class*="border"]') || promptBox.closest('[class*="rounded-"]'))
            : null;
          const footer = promptBox ? findPromptContainerToHide(promptBox) : null;
          const validFooter = footer && footer !== pane && (!innerCard || (footer !== innerCard && !innerCard.contains(footer))) ? footer : null;

          const sidebarEl = document.querySelector('[data-testid="conversation-list-sidebar"], nav[aria-label="Sidebar"], [role="navigation"][aria-label="Sidebar"]');
          const sidebarVisible = !!(sidebarEl && isElementVisible(sidebarEl) && sidebarEl.getBoundingClientRect().width >= 60);

          setAttrIfNeeded(sc, "data-agy-idle-scroller");
          setAttrIfNeeded(validFooter, "data-agy-idle-footer");
          setAttrIfNeeded(innerCard, "data-agy-idle-card");
          setAttrIfNeeded(sidebarVisible ? null : document.body, "data-agy-idle-body");

          // Also tag intermediate flex shells between sc and pane so bg-background never leaves white gaps
          const paneTargets = new Set();
          if (sc && pane) {
            let walk = sc.parentElement;
            while (walk && walk !== document.body && walk !== document.documentElement) {
              paneTargets.add(walk);
              if (walk === pane) break;
              walk = walk.parentElement;
            }
            paneTargets.add(pane);
          } else if (pane) {
            paneTargets.add(pane);
          }
          document.querySelectorAll("[data-agy-idle-pane]").forEach((oldEl) => {
            if (!paneTargets.has(oldEl)) oldEl.removeAttribute("data-agy-idle-pane");
          });
          paneTargets.forEach((t) => {
            if (t && t.getAttribute("data-agy-idle-pane") !== "1") t.setAttribute("data-agy-idle-pane", "1");
          });
        }

        function findFullComposerCard(promptBox) {
          if (!promptBox) return null;
          let best = promptBox.closest('[id*="agentSidePanelInputBox" i]') || promptBox.closest("form") || promptBox;
          let cur = best;
          let depth = 0;
          while (cur && cur.parentElement && cur.parentElement !== document.body && cur.parentElement !== document.documentElement && depth < 7) {
            const parent = cur.parentElement;
            if (parent.matches("main, nav, aside, header, [role='dialog']")) break;
            if (parent.classList.contains("overflow-y-auto") || parent.classList.contains("overflow-y-scroll")) break;
            if (isApprovalContainerNode(parent)) break;
            const hasSiblingFeed = Array.from(parent.querySelectorAll(".overflow-y-auto, .overflow-y-scroll")).some(
              (sc) => !cur.contains(sc) && sc !== cur && sc.getBoundingClientRect().height > 100
            );
            if (hasSiblingFeed) break;
            const rect = parent.getBoundingClientRect();
            if (rect.height > Math.max(360, window.innerHeight * 0.55)) break;
            best = parent;
            cur = parent;
            depth++;
          }
          return best;
        }

        function isRedStopButtonVisual(btn) {
          if (!btn || btn.closest('[id^="agy-"], [data-agy-ui="1"]')) return false;
          const lbl = ((btn.getAttribute("aria-label") || "") + " " + (btn.title || "") + " " + (btn.getAttribute("data-testid") || "")).toLowerCase();
          if (/mic|voice|audio|attach|upload|permission|model|context|feedback|delete|trash|remove|error|plus|add/.test(lbl)) {
            return false;
          }
          if (/stop|cancel|abort|interrupt|dừng|hủy/.test(lbl)) return true;

          const targets = [btn, btn.querySelector("svg"), btn.querySelector("path"), btn.querySelector("rect"), btn.querySelector("span")].filter(Boolean);
          for (const el of targets) {
            try {
              const cs = window.getComputedStyle(el);
              const colorStrs = [cs.backgroundColor, cs.color, cs.fill, cs.stroke];
              for (const raw of colorStrs) {
                if (!raw || raw === "none" || raw === "transparent") continue;
                const m = raw.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/i);
                if (!m) continue;
                const alpha = m[4] === undefined ? 1 : parseFloat(m[4]);
                if (alpha <= 0.15) continue;
                const r = Number(m[1]), g = Number(m[2]), b = Number(m[3]);
                if (r >= 175 && g <= 105 && b <= 105) {
                  return true;
                }
              }
            } catch (_) {}
          }
          return false;
        }

        function detectIsPromptWaitingIdle() {
          if (Date.now() < manualForceRunningUntil) return false;
          if (isProcessing) return false;

          const promptBox = findRealChatInputBox();
          if (!promptBox) return false;

          // Only tint actual open conversations (skip empty Start Home / Settings screens)
          const hasOpenChat =
            window.location.pathname.includes("/c/") ||
            /\/remote\/[0-9a-f-]{8,}/i.test(window.location.pathname) ||
            /\/remote\/[0-9a-f-]{8,}/i.test(hostTabMeta.url || "") ||
            !!getCurrentConversationTitle();
          if (!hasOpenChat) return false;

          if (findApprovalDialog()) return false;

          const composerRoot = findPromptContainerToHide(promptBox);
          const fullComposer = findFullComposerCard(promptBox) || composerRoot;
          const stopSelector = 'button[aria-label*="stop" i], button[aria-label*="cancel" i], button[aria-label*="abort" i], button[aria-label*="interrupt" i], button[aria-label*="dừng" i], button[aria-label*="hủy" i], button[title*="stop" i], button[title*="cancel" i], button[data-testid*="stop" i], button[data-testid*="cancel" i]';

          if (fullComposer) {
            const composerStops = Array.from(fullComposer.querySelectorAll(stopSelector));
            if (composerStops.some((b) => !b.closest('[id^="agy-"], [data-agy-ui="1"]') && (isPromptHidden || isElementVisible(b)))) {
              return false;
            }
            const rectBtns = Array.from(fullComposer.querySelectorAll("button:has(svg rect), button")).filter((b) => {
              if (b.closest('[id^="agy-"], [data-agy-ui="1"]')) return false;
              if (!isPromptHidden && !isElementVisible(b)) return false;
              if (b.querySelector("svg rect")) {
                const lbl = (b.getAttribute("aria-label") || b.title || "").toLowerCase();
                if (!/context|model|mic|voice|audio|attach|upload|permission|preset|feedback|plus|add|collapse|expand/.test(lbl)) {
                  return true;
                }
              }
              return isRedStopButtonVisual(b);
            });
            if (rectBtns.length > 0) return false;

            // Missing Send button check: Antigravity replaces Send (→) with Stop (■) while AI runs
            const sendBtn = findPromptSendButton(promptBox);
            const toolbarBtns = Array.from(fullComposer.querySelectorAll("button")).filter(
              (b) => !b.closest('[id^="agy-"], [data-agy-ui="1"]') && isElementVisible(b)
            );
            if (toolbarBtns.length > 0 && (!sendBtn || !(isPromptHidden ? document.contains(sendBtn) : isElementVisible(sendBtn)))) {
              return false;
            }
          }

          const globalStops = Array.from(document.querySelectorAll(stopSelector));
          for (const b of globalStops) {
            if (b.closest('[data-testid="conversation-list-sidebar"], nav, aside, [role="navigation"], [id^="agy-"], [data-agy-ui="1"], [role="dialog"]')) continue;
            if (!isElementVisible(b)) continue;
            if (b.getBoundingClientRect().top > 70) return false;
          }

          const activeCascadeId = extractCascadeIdFromUrl();
          const selectedRow =
            document.querySelector('[data-testid="conversation-row-sidebar"][data-selected="true"]') ||
            (activeCascadeId ? document.querySelector(`[data-testid="conversation-row-sidebar"][data-cascade-id="${activeCascadeId}"]`) : null);
          if (selectedRow && selectedRow.querySelector('button[aria-label*="Stop" i], button[aria-label*="Cancel" i], [data-testid*="spinner" i], [aria-busy="true"]')) {
            return false;
          }

          const activeRunSelectors = '[data-testid="status-loading-spinner"], [role="progressbar"], [aria-busy="true"], svg.animate-spin';
          const loadingEls = Array.from((fullComposer || document).querySelectorAll(activeRunSelectors));
          if (loadingEls.some((el) => !el.closest('[data-testid="conversation-list-sidebar"], [id^="agy-"], [data-agy-ui="1"]') && (isPromptHidden || isElementVisible(el)))) {
            return false;
          }

          // Also check visible chat feed loading spinner / aria-busy outside sidebar
          const feedLoading = Array.from(document.querySelectorAll('[data-testid="status-loading-spinner"], [aria-busy="true"]'));
          if (feedLoading.some((el) => !el.closest('[data-testid="conversation-list-sidebar"], [id^="agy-"], [data-agy-ui="1"], nav, aside') && isElementVisible(el))) {
            return false;
          }

          return true;
        }

        function markPromptSubmitted(lockMs = 1400) {
          manualForceRunningUntil = Math.max(manualForceRunningUntil, Date.now() + lockMs);
          idleCandidateSince = 0;
          applyIdleYellowState(false);
        }

        function updateIdlePromptBackground() {
          if (!isChatOwnerActive()) {
            idleCandidateSince = 0;
            applyIdleYellowState(false);
            return;
          }
          if (!cachedIdleYellowBg) {
            idleCandidateSince = 0;
            applyIdleYellowState(false);
            return;
          }
          const rawIdle = detectIsPromptWaitingIdle();
          if (!rawIdle) {
            idleCandidateSince = 0;
            applyIdleYellowState(false);
            return;
          }
          const now = Date.now();
          if (!idleCandidateSince) {
            idleCandidateSince = now;
          }
          if (now - idleCandidateSince >= 450) {
            applyIdleYellowState(true);
          }
        }

        window.__AGY_CHECK_IDLE_BG = updateIdlePromptBackground;
        window.__AGY_MARK_RUNNING = markPromptSubmitted;

        addSafeListener(document, "keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
            const box = findRealChatInputBox();
            if (box && (e.target === box || box.contains(e.target))) {
              if ((box.textContent || box.value || "").trim().length > 0) {
                markPromptSubmitted(1400);
              }
            }
          }
        }, true);

        addSafeListener(document, "click", (e) => {
          const btn = e.target?.closest?.("button");
          if (!btn || btn.closest('[id^="agy-"]')) return;
          const aria = (btn.getAttribute("aria-label") || btn.title || "").toLowerCase();
          if ((aria.includes("send") || aria.includes("submit") || aria.includes("gửi")) && !aria.includes("feedback")) {
            markPromptSubmitted(1400);
          }
        }, true);

        window.__AGY_IDLE_BG_INTERVAL = setInterval(updateIdlePromptBackground, 450);
        setTimeout(updateIdlePromptBackground, 500);
      }

      initIdleBackgroundMonitor();
    }

    initMobileKeyboardHandler();
    initMobileEnhancements();
    initImageModalHandler();
    scanAndProcess();
  }

  console.log(`[AGY Auto-Approve] v${AGY_VERSION} (Extension Bridge) active | frame: ${isTop ? "TOP" : "IFRAME"}`);
})();


