/**
 * content.js — AGY Auto-Approve v14
 *
 * Updates in v14:
 * 1. Zero-F5 Live Reloading: Added a __AGY_CLEANUP function that destroys the old instance
 *    when the extension is updated and re-injected, completely eliminating the need to F5 the page!
 * 2. Layout Thrashing & URL Bar Fix: Uses absolute maxHeight instead of relative diffs to prevent false-positive keyboard closures caused by mobile URL bar hiding during scroll.
 */

(() => {
  // ─── Guard: Only run in AGY or Webviews ─────────────────────────────────────
  const currentUrl = window.location.href.toLowerCase();
  const isTop = window.self === window.top;
  
  // We only run in the Top Frame (for debug bar) and the specific Antigravity app Iframe.
  // This prevents background iframes (like accounts.google.com) from running concurrently.
  if (!isTop && !currentUrl.includes("antigravity.static.usercontent.goog")) {
    return;
  }

  // ─── Zero-F5 Live Reload Teardown ───────────────────────────────────────────
  if (window.__AGY_CLEANUP) {
    try { window.__AGY_CLEANUP(); } catch (e) {}
  }

  const _listeners = [];
  function addSafeListener(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    _listeners.push({ target, type, handler, options });
  }

  window.__AGY_CLEANUP = () => {
    if (window.__AGY_INTERVAL) clearInterval(window.__AGY_INTERVAL);
    if (window.__AGY_COUNTDOWN) clearInterval(window.__AGY_COUNTDOWN);
    if (window.__AGY_OBSERVER) window.__AGY_OBSERVER.disconnect();
    for (const l of _listeners) {
      l.target.removeEventListener(l.type, l.handler, l.options);
    }
  };

  const DEFAULT_SETTINGS = {
    enabled: true,
    delaySafe: 5,
    delayDangerous: 120,
    targetOption: 4,
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

  // ─── Notification Bar (Auto-hide & Zero Conflict) ─────────────────────────────
  let hideBarTimer = null;

  function hideBar() {
    const bar = document.getElementById("agy-debug-bar");
    if (bar) {
      bar.style.opacity = "0";
      bar.style.transform = "translateY(-6px)";
      bar.style.pointerEvents = "none";
    }
  }

  function updateBar(htmlContent, bg = "#0f172a", text = "#38bdf8", border = "#0284c7", autoHideMs = 0) {
    // If we are in an iframe, relay the status to the top frame
    if (!isTop) {
      try {
        window.top.postMessage(
          { type: "AGY_UPDATE_BAR", htmlContent, bg, text, border, autoHideMs },
          "*"
        );
      } catch (e) {}
      return;
    }

    let bar = document.getElementById("agy-debug-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "agy-debug-bar";
      bar.style.cssText = `
        position: fixed; top: 54px; right: 24px;
        z-index: 2147483647; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 11px; font-weight: 500; padding: 6px 14px; border-radius: 8px;
        transition: opacity .35s ease, transform .35s ease; box-shadow: 0 4px 16px rgba(0,0,0,0.45);
        max-width: 440px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        pointer-events: auto; display: flex; align-items: center; gap: 8px;
        opacity: 0; transform: translateY(-6px);
      `;
      document.body.appendChild(bar);
    }

    clearTimeout(hideBarTimer);

    bar.style.background = bg;
    bar.style.color = text;
    bar.style.border = `1px solid ${border}`;
    bar.style.opacity = "1";
    bar.style.transform = "translateY(0)";
    bar.style.pointerEvents = "auto";

    const newHTML = `⚡ <strong>AGY Auto-Approve:</strong> ${htmlContent}`;
    if (bar.innerHTML !== newHTML) {
      bar.innerHTML = newHTML;
    }

    if (autoHideMs > 0) {
      hideBarTimer = setTimeout(() => {
        hideBar();
      }, autoHideMs);
    }
  }

  // Top frame listens for messages from the chat iframe
  if (isTop) {
    addSafeListener(window, "message", (e) => {
      if (e.data && e.data.type === "AGY_UPDATE_BAR") {
        // Block zombie messages from older orphaned script instances in memory
        const content = String(e.data.htmlContent || "");
        if (content.includes("Dang cho dialog") || content.includes("Chua thay")) {
          return;
        }

        updateBar(
          e.data.htmlContent,
          e.data.bg,
          e.data.text,
          e.data.border,
          e.data.autoHideMs || 0
        );
      }
    });
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

  // ─── Robust Submit Button Finder ─────────────────────────────────────────────
  function findSubmitButton() {
    const candidates = queryDeep("button, [role='button'], input[type='submit'], div, a, span");
    for (const el of candidates) {
      const t = (el.innerText || el.textContent || "").trim().toLowerCase();
      // Matches "submit", "submit ↵", etc.
      if (
        (t === "submit" || t.startsWith("submit ") || t.startsWith("submit\n") || t === "submit ↵") &&
        t.length < 25
      ) {
        const clickable = el.closest('button, [role="button"], a, div[tabindex]') || el;
        const rect = clickable.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return clickable;
      }
    }

    // Fallback: any button containing "submit"
    for (const el of candidates) {
      const t = (el.innerText || el.textContent || "").trim().toLowerCase();
      if (t.includes("submit") && t.length < 20) {
        const clickable = el.closest('button, [role="button"], a') || el;
        const rect = clickable.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return clickable;
      }
    }

    return null;
  }

  // ─── Robust Option 4 Finder ──────────────────────────────────────────────────
  function findOptionFour() {
    const all = queryDeep("div, li, button, [role='button'], [role='radio'], [role='option'], label");

    // Strategy 1: Semantic match — "Yes, and always allow" WITHOUT conversation/project
    for (const el of all) {
      const text = (el.innerText || el.textContent || "").trim();
      if (
        text.includes("Yes, and always allow") &&
        !text.includes("this conversation") &&
        !text.includes("this project") &&
        !text.includes("Yes, allow this time") // must NOT contain other options
      ) {
        // Walk UP to find the specific option row container
        let row = el;
        while (row && row.parentElement && row.parentElement !== document.body) {
          const parentText = (row.parentElement.innerText || "").trim();
          if (parentText.includes("Yes, allow this time") || parentText.includes("this conversation")) {
            return row;
          }
          row = row.parentElement;
        }
        return el;
      }
    }

    // Strategy 2: By badge '4'
    for (const el of all) {
      if (el.children.length === 0 && el.textContent.trim() === "4") {
        let row = el;
        while (row && row.parentElement && row.parentElement !== document.body) {
          const t = (row.innerText || "").trim();
          if (t.includes("Yes") && t.includes("allow")) {
            return row;
          }
          row = row.parentElement;
        }
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
  function showCountdown(delay, remaining, classification, previewText, onCancel, onNow) {
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
        Tu dong chon <strong style="color:#38bdf8;">Option 4</strong> va Submit sau
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

  function cancelAutoApprove() {
    clearInterval(countdownTimer);
    countdownTimer = null;
    removeCountdown();
    isProcessing = false;
    updateBar("Nguoi dung da bam Huy bo qua lan nay", "#451a03", "#fbbf24", "#d97706", 3000);
  }

  // ─── Approval Execution ───────────────────────────────────────────────────────
  async function executeApproval(optEl, submitBtn, fullText, settings, dialogKey) {
    updateBar("Dang click Option 4...", "#451a03", "#fbbf24", "#d97706");

    // 1. Force click Option 4 row and its internal targets
    optEl.scrollIntoView({ behavior: "smooth", block: "center" });
    forceClick(optEl);

    // Also click any clickable children inside the row (e.g. badge, text span, radio)
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

    // Wait 400ms for React state update
    await new Promise((r) => setTimeout(r, 400));

    // 2. Force click Submit
    updateBar("Dang click Submit...", "#451a03", "#fbbf24", "#d97706");
    forceClick(submitBtn);

    const form = submitBtn.closest("form");
    if (form) {
      try { form.requestSubmit(submitBtn); } catch (e) { form.submit(); }
    }

    // Wait 600ms and verify if submit actually closed the dialog
    await new Promise((r) => setTimeout(r, 600));
    const stillPresent = findOptionFour();
    if (stillPresent) {
      // Retry clicking submit directly if dialog still exists
      const retryBtn = findSubmitButton();
      if (retryBtn) forceClick(retryBtn);
      await new Promise((r) => setTimeout(r, 400));
    }

    updateBar("✓ Da tu dong phe duyet thanh cong!", "#064e3b", "#34d399", "#059669", 3500);

    await logEvent({
      time: new Date().toISOString(),
      classification: window.AGY_RULES?.classify ? window.AGY_RULES.classify(fullText) : "safe",
      delay: settings._usedDelay || 0,
      preview: fullText.substring(0, 100),
      option: 4,
    });

    lastProcessedKey = dialogKey;
    isProcessing = false;
  }

  // ─── Main Scanning Loop ───────────────────────────────────────────────────────
  async function scanAndProcess() {
    if (isProcessing) return;

    const opt4 = findOptionFour();
    const submitBtn = findSubmitButton();

    if (!opt4 || !submitBtn) {
      return;
    }

    const container = opt4.closest("[class*='rounded'], [class*='card'], [class*='border']") || document.body;
    const fullText = container.innerText || container.textContent || "";

    // Stable dialogKey based on question and command, ignoring dynamic spinners
    const questionEl = container.querySelector('h1, h2, h3, h4, strong, [class*="title"]') || opt4.parentElement?.parentElement;
    const codeEl = container.querySelector('code, pre, [class*="command"]');
    const dialogKey = ((questionEl?.innerText || "") + "::" + (codeEl?.innerText || "")).trim() || fullText.substring(0, 80);

    if (dialogKey === lastProcessedKey) return;

    const settings = await getSettings();
    if (!settings.enabled) {
      updateBar("Extension dang bi TAT trong popup", "#451a03", "#fbbf24", "#d97706");
      return;
    }

    isProcessing = true;

    const classification = window.AGY_RULES?.classify
      ? window.AGY_RULES.classify(fullText)
      : "safe";

    const delay = classification === "safe" ? settings.delaySafe : settings.delayDangerous;
    settings._usedDelay = delay;

    updateBar(
      `Phat hien Approval! [${classification.toUpperCase()}] — phe duyet sau ${delay}s...`,
      classification === "safe" ? "#064e3b" : "#451a03",
      classification === "safe" ? "#34d399" : "#fbbf24",
      classification === "safe" ? "#059669" : "#d97706"
    );

    let remaining = delay;

    showCountdown(
      delay,
      remaining,
      classification,
      fullText,
      () => { lastProcessedKey = dialogKey; },
      () => executeApproval(opt4, submitBtn, fullText, settings, dialogKey)
    );

    window.__AGY_COUNTDOWN = countdownTimer = setInterval(() => {
      remaining--;
      updateCountdown(remaining, delay);
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        removeCountdown();
        executeApproval(opt4, submitBtn, fullText, settings, dialogKey);
      }
    }, 1000);
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
          (node.closest && node.closest("#agy-debug-bar, #agy-autoapprove-overlay"))
        );
      });
      if (isOnlyOurUI) return;
      scanAndProcess();
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
            const target = el.closest("[class*='chat'], [class*='input'], [class*='prompt'], [id*='InputBox']") || el;
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

    initMobileKeyboardHandler();
    scanAndProcess();
  }

  console.log(`[AGY Auto-Approve] v18 active | frame: ${isTop ? "TOP" : "IFRAME"}`);
})();


