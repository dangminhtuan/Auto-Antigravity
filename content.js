/**
 * content.js — AGY Auto-Approve v22 (Extension Bridge & Hybrid Selector)
 *
 * Updates in v22:
 * 1. Extension Bridge (2-Way Local Relay + Proof-of-Control Visual Banner & LED).
 * 2. Hybrid Approval Option Selector (Semantic Text Score + Max - 1 + No-Shield).
 * 3. Multi-Project Patrol & 1-Tap Sidebar DOM Dump (📋) + Dock Collapse (▾ / ⚡) + Search (🔍).
 */

(() => {
  const AGY_VERSION = "1.0.28";
  // ─── Guard: Strictly run ONLY inside Antigravity / AI Studio (never google.com/search) ─
  const currentUrl = window.location.href.toLowerCase();
  const isTop = window.self === window.top;
  const isAntigravityOrigin =
    currentUrl.includes("antigravity.google") ||
    currentUrl.includes("aistudio.google") ||
    currentUrl.includes("antigravity.static.usercontent.goog");

  if (!isAntigravityOrigin) {
    return;
  }
  if (!isTop && !currentUrl.includes("antigravity.static.usercontent.goog")) {
    return;
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
    if (window.__AGY_OBSERVER) window.__AGY_OBSERVER.disconnect();
    try { delete window.__AGY_CHECK_IDLE_BG; } catch (e) {}
    try { delete window.__AGY_MARK_RUNNING; } catch (e) {}
    try { delete window.__AGY_BEFORE_SCAN_REVEAL; } catch (e) {}
    try { delete window.__AGY_AFTER_APPROVAL_RESTORE; } catch (e) {}
    try {
      document.body?.classList.remove("agy-idle-light", "agy-idle-dark");
      document.querySelectorAll("[data-agy-idle-pane], [data-agy-idle-scroller], [data-agy-idle-footer], [data-agy-idle-card], [data-agy-idle-body]").forEach((el) => {
        el.removeAttribute("data-agy-idle-pane");
        el.removeAttribute("data-agy-idle-scroller");
        el.removeAttribute("data-agy-idle-footer");
        el.removeAttribute("data-agy-idle-card");
        el.removeAttribute("data-agy-idle-body");
      });
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
    let latestTelemetry = {};
    let proofBannerTimer = null;

    function updateBridgeLedUi() {
      const led = document.getElementById("agy-bridge-led");
      const mini = document.getElementById("agy-dock-mini-btn");
      const now = Date.now();
      const iframeOk = now - lastIframeSeenAt < 4500;
      const bridgeOk = now - lastBridgeSeenAt < 5500;

      let dotColor = "#ef4444"; // Red: no iframe
      let glow = "rgba(239, 68, 68, 0.7)";
      let title = "🔴 Chưa thấy Iframe chat — hãy mở 1 cuộc hội thoại (Bấm để kiểm tra)";

      if (bridgeOk && iframeOk) {
        dotColor = "#22c55e"; // Green: Full 2-Way AI Bridge
        glow = "rgba(34, 197, 94, 0.85)";
        title = "🟢 AI Bridge ĐÃ NẮM QUYỀN 100% (PC Bridge + Iframe OK) — Bấm để test!";
      } else if (iframeOk) {
        dotColor = "#38bdf8"; // Cyan/Blue: Iframe active Standalone
        glow = "rgba(56, 189, 248, 0.75)";
        title = "🔵 Extension ĐANG NẮM QUYỀN Iframe (Chế độ độc lập) — Bấm để test!";
      } else if (bridgeOk) {
        dotColor = "#f59e0b"; // Amber: Bridge ok, waiting for iframe
        glow = "rgba(245, 158, 11, 0.75)";
        title = "🟡 Bridge PC Online, đang chờ Iframe chat — Bấm để test!";
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
      const iframeOk = info.iframeOk !== undefined ? !!info.iframeOk : (now - lastIframeSeenAt < 4500);
      const bridgeOk = info.bridgeOnline !== undefined ? !!info.bridgeOnline : (now - lastBridgeSeenAt < 5500);

      // 1. Full-screen glowing emerald pulse border
      let borderEl = document.getElementById("agy-proof-border");
      if (!borderEl) {
        borderEl = document.createElement("div");
        borderEl.id = "agy-proof-border";
        (document.body || document.documentElement).appendChild(borderEl);
      }
      const accent = bridgeOk ? "#10b981" : (iframeOk ? "#38bdf8" : "#f59e0b");
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

      const headline = bridgeOk && iframeOk
        ? "🤖 XÁC NHẬN: AI BRIDGE ĐANG NẮM QUYỀN 100% TRÌNH DUYỆT"
        : (iframeOk
          ? "🔵 EXTENSION ĐANG NẮM QUYỀN IFRAME (CHẾ ĐỘ ĐỘC LẬP)"
          : "⚠️ EXTENSION ĐÃ CHẠY NHƯNG CHƯA VÀO KHUNG CHAT");

      const chatName = info.activeChat || latestTelemetry.activeChat || "(Trang chủ / Chưa mở chat)";
      const sidebarCount = info.sidebarCount ?? latestTelemetry.sidebarCount ?? "?";
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
          • <b>Iframe:</b> ${iframeOk ? "OK ✓" : "Chưa thấy"} &nbsp;|&nbsp;
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
        if (e.data.bridgeOnline) lastBridgeSeenAt = Date.now();
        latestTelemetry = e.data;
        updateBridgeLedUi();
      }
      if (e.data && e.data.type === "AGY_SHOW_PROOF_V22") {
        if (e.data.iframeOk) lastIframeSeenAt = Date.now();
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
        const toggleBtn = document.getElementById("agy-toggle-prompt-btn");
        if (toggleBtn) {
          const hidden = !!e.data.hidden;
          toggleBtn.dataset.hidden = hidden ? "1" : "0";
          toggleBtn.innerHTML = hidden ? "✏️" : "📖";
          toggleBtn.title = hidden ? "Hiện lại ô soạn thảo" : "Ẩn ô nhập để đọc tràn viền";
          toggleBtn.style.color = hidden ? "rgba(56, 189, 248, 0.95)" : "rgba(255, 255, 255, 0.88)";
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
    });

    // Continuous wakeup tick from top frame -> iframes (beats Chrome background iframe throttling)
    window.__AGY_TOP_TICK_INTERVAL = setInterval(() => {
      if (!isCurrentInstance()) return;
      document.querySelectorAll("iframe").forEach((ifr) => {
        try {
          ifr.contentWindow?.postMessage({ type: "AGY_HEARTBEAT_TICK_V24", ts: Date.now() }, "*");
        } catch (err) {}
      });
    }, 900);

    // Top-frame bridge heartbeat + instant command relay to wake throttled iframes
    window.__AGY_TOP_BRIDGE_INTERVAL = setInterval(() => {
      if (!isCurrentInstance()) return;
      try {
        const iframeAlive = Date.now() - lastIframeSeenAt < 15000 || document.querySelectorAll("iframe").length > 0;
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
                  if (wantIframe && iframes.length > 0) {
                    // Relay immediately via postMessage (wakes iframe even if Chrome throttled timers)
                    iframes.forEach((ifr) => {
                      try {
                        ifr.contentWindow?.postMessage({ type: "AGY_BRIDGE_EXEC_V23", cmd }, "*");
                      } catch (err) {}
                    });
                  } else if (cmd.cmd === "PING_PROOF") {
                    showProofOfControlBanner({
                      iframeOk: Date.now() - lastIframeSeenAt < 6500,
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
                        iframeAlive: Date.now() - lastIframeSeenAt < 6500,
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
      row1.style.cssText = "width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px;";

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
        let relayed = false;
        document.querySelectorAll("iframe").forEach((ifr) => {
          try {
            ifr.contentWindow?.postMessage({ type: "AGY_PING_PROOF_REQ" }, "*");
            relayed = true;
          } catch (err) {}
        });
        if (!relayed || Date.now() - lastIframeSeenAt > 4500) {
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
        document.querySelectorAll("iframe").forEach((ifr) => {
          try {
            ifr.contentWindow?.postMessage({ type: "AGY_TOGGLE_SEARCH_V25" }, "*");
          } catch (err) {}
        });
      });
      row1.appendChild(searchBtn);

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
        syncPromptBtnUi(nextHidden);
        document.querySelectorAll("iframe").forEach((ifr) => {
          try {
            ifr.contentWindow?.postMessage({ type: "AGY_TOGGLE_PROMPT", hidden: nextHidden }, "*");
          } catch (err) {}
        });
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
    if (!isCurrentInstance() || isProcessing || isScanning) return;
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

    setInterval(checkState, 400);

    addSafeListener(document, "click", (e) => {
      if (e.target.tagName === "IMG" || e.target.closest("img, [class*='image']")) {
        setTimeout(checkState, 100);
        setTimeout(checkState, 300);
        setTimeout(checkState, 600);
      }
    });

    checkState();
  }

  // ─── Polling, Mutation, Keyboard — ONLY in the app iframe ────────────────────
  // isTop frame only renders the debug bar via postMessage.
  // Scanning, observing, and keyboard handling only run inside the actual iframe.
  if (!isTop) {
    window.__AGY_INTERVAL = setInterval(scanAndProcess, 600);

    window.__AGY_OBSERVER = new MutationObserver((mutations) => {
      const isOnlyOurUI = mutations.every((m) => {
        const node = m.target;
        return (
          node.id === "agy-debug-bar" ||
          node.id === "agy-autoapprove-overlay" ||
          node.id === "agy-control-container" ||
          node.id === "agy-big-close-image-btn" ||
          node.id === "agy-top-close-image-btn" ||
          (node.closest && node.closest("#agy-debug-bar, #agy-autoapprove-overlay, #agy-control-container, #agy-big-close-image-btn, #agy-top-close-image-btn"))
        );
      });
      if (isOnlyOurUI) return;
      scanAndProcess();
      if (typeof window.__AGY_CHECK_IDLE_BG === "function") {
        window.__AGY_CHECK_IDLE_BG();
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
        const el = e.target;
        if (
          el.tagName === "TEXTAREA" ||
          el.tagName === "INPUT" ||
          el.getAttribute("contenteditable") === "true" ||
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
          [class*="prose"], [class*="markdown"], [class*="message"], p, li {
            font-size: 18px !important;
            line-height: 1.7 !important;
          }
          [role="combobox"], textarea, input {
            font-size: 18px !important;
          }
          pre, code {
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
        const candidates = Array.from(
          document.querySelectorAll(
            '[id*="agentSidePanelInputBox" i], [data-lexical-editor="true"][contenteditable="true"], [role="combobox"][contenteditable="true"], [contenteditable="true"][role="textbox"], textarea'
          )
        );
        const filtered = candidates.filter((el) => {
          if (el.closest('[data-testid="fastpick"], [data-testid="fast-pick-viewport"], [role="dialog"]')) return false;
          if (el.closest('[role="navigation"], [data-testid="conversation-list-sidebar"], nav, aside, header, [id^="agy-"]')) return false;
          if (el.tagName === "INPUT" && (el.type === "search" || el.type === "checkbox" || el.type === "radio" || el.type === "hidden")) return false;
          return true;
        });
        if (filtered.length === 0) return null;
        // Prefer lowest element in viewport (real bottom composer)
        filtered.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom);
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
          if (containerToHide && isApprovalContainerNode(containerToHide)) {
            pausedReadingForApproval = true;
            document.body.classList.remove("agy-reading-mode");
            updateBar("⚠️ Đang có hộp thoại duyệt — tạm giữ hiển thị để xử lý!", "warning", 2000);
            return;
          }
          document.body.classList.add("agy-reading-mode");
          if (containerToHide) {
            containerToHide.classList.add("agy-hidden-prompt-container");
            containerToHide.setAttribute("data-agy-prompt-hidden", "1");
          }
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
          updateBar("✏️ Đã hiện lại ô soạn thảo", "info", 1500);
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

        if (convRows.length > 0) {
          for (const row of convRows) {
            if (!isElementVisible(row)) continue;
            const link = row.querySelector("a[href]") || row;
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
        if (!isCurrentInstance() || isProcessing || isScanning || patrolBusy) return;
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
            if (!patrolHomeCascadeId && settings.autoReturnHome !== false && selectedItem?.cascadeId) {
              patrolHomeCascadeId = selectedItem.cascadeId;
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
            if (homeId && settings.autoReturnHome !== false && selectedItem?.cascadeId !== homeId) {
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
        if (!isCurrentInstance()) return;
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

      window.__AGY_BRIDGE_INTERVAL = setInterval(sendIframeBridgeHeartbeat, 1400);
      setTimeout(sendIframeBridgeHeartbeat, 500);

      // Listen for broadcasts & relayed wakeup/bridge commands from top frame
      addSafeListener(window, "message", (e) => {
        if (e.data && e.data.type === "AGY_HEARTBEAT_TICK_V24") {
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

      // Also listen to popup requests via chrome.runtime.onMessage
      try {
        chrome.runtime.onMessage.addListener((msg) => {
          if (!isCurrentInstance() || !msg) return;
          if (msg.type === "AGY_DUMP_SIDEBAR_REQ") {
            dumpSidebarDom({ copyClipboard: true });
          } else if (msg.type === "AGY_PING_PROOF_REQ") {
            sendProofSnapshot(null, "Kiểm tra từ Popup Extension", lastBridgeOnline);
          } else if (msg.type === "AGY_ENABLE_STATUS_GROUP_V24") {
            enableStatusGroupView();
          }
        });
      } catch (err) {}

      // 4. Continuously ensure the prompt card is lifted above dock / navigation bar
      function liftPromptCard() {
        if (!isCurrentInstance()) return;
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
        setInterval(liftPromptCard, 1000);
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

        function detectIsPromptWaitingIdle() {
          if (Date.now() < manualForceRunningUntil) return false;
          if (isProcessing) return false;

          const promptBox = findRealChatInputBox();
          if (!promptBox) return false;

          // Only tint actual open conversations (skip empty Start Home / Settings screens)
          const hasOpenChat = window.location.pathname.includes("/c/") || !!getCurrentConversationTitle();
          if (!hasOpenChat) return false;

          if (findApprovalDialog()) return false;

          const composerRoot = findPromptContainerToHide(promptBox);
          const stopSelector = 'button[aria-label*="stop" i], button[aria-label*="interrupt" i], button[aria-label*="dừng" i], button[title*="stop" i], button[data-testid*="stop" i]';

          if (composerRoot) {
            const composerStops = Array.from(composerRoot.querySelectorAll(stopSelector));
            if (composerStops.some((b) => !b.closest('[id^="agy-"]') && (isPromptHidden || isElementVisible(b)))) {
              return false;
            }
            const rectBtns = Array.from(composerRoot.querySelectorAll("button:has(svg rect)")).filter((b) => {
              if (b.closest('[id^="agy-"]')) return false;
              const lbl = (b.getAttribute("aria-label") || b.title || "").toLowerCase();
              if (/context|model|mic|voice|audio|attach|upload|permission|preset|feedback|plus|add/.test(lbl)) return false;
              return isPromptHidden || isElementVisible(b);
            });
            if (rectBtns.length > 0) return false;
          }

          const globalStops = Array.from(document.querySelectorAll(stopSelector));
          for (const b of globalStops) {
            if (b.closest('[data-testid="conversation-list-sidebar"], nav, aside, [role="navigation"], [id^="agy-"], [role="dialog"]')) continue;
            if (!isElementVisible(b)) continue;
            if (b.getBoundingClientRect().top > 70) return false;
          }

          const selectedRow = document.querySelector('[data-testid="conversation-row-sidebar"][data-selected="true"]');
          if (selectedRow && selectedRow.querySelector('button[aria-label*="Stop" i], button[aria-label*="Cancel" i], [data-testid*="spinner" i]')) {
            return false;
          }

          const progressEls = Array.from((composerRoot || document).querySelectorAll('[role="progressbar"]'));
          if (progressEls.some((el) => !el.closest('[data-testid="conversation-list-sidebar"], [id^="agy-"]') && isElementVisible(el))) {
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
          if (!isCurrentInstance()) return;
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


