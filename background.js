/**
 * background.js — Service Worker for AGY Auto-Approve extension.
 * Handles badge updates, Zero-F5 script injection, and 2-way Local Bridge relay.
 */

const BRIDGE_BASE = "http://127.0.0.1:9333";

// Update badge when settings change
chrome.storage.sync.onChanged.addListener((changes) => {
  if (changes.enabled !== undefined) {
    updateBadge(changes.enabled.newValue);
  }
});

// Set initial badge and inject scripts on install/update (Zero-F5 Live Reload)
chrome.runtime.onInstalled.addListener(async () => {
  const { enabled } = await chrome.storage.sync.get({ enabled: true });
  updateBadge(enabled);

  // Inject into all existing Antigravity tabs immediately
  chrome.tabs.query({ url: ["*://*.google.com/*", "*://*.antigravity.google/*"] }, (tabs) => {
    for (const tab of tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ["rules.js", "content.js"]
      }).catch(() => {});
    }
  });
});

chrome.runtime.onStartup.addListener(async () => {
  const { enabled } = await chrome.storage.sync.get({ enabled: true });
  updateBadge(enabled);
});

function updateBadge(enabled) {
  const text = enabled ? "ON" : "OFF";
  const color = enabled ? "#34a853" : "#ea4335";
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

// Helper: fetch with short timeout so unreachable localhost fails fast & silently
async function bridgeFetch(path, payload, timeoutMs = 900) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BRIDGE_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, bridgeOnline: false };
    const json = await res.json();
    return { ...json, bridgeOnline: true };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, bridgeOnline: false, commands: [] };
  }
}

// 2-Way Bridge Relay between Content Scripts (Top / Iframe) and Local Bridge Server
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return false;

  if (msg.type === "AGY_BRIDGE_HEARTBEAT") {
    const enriched = {
      ...(msg.payload || {}),
      tabId: sender?.tab?.id ?? null,
      tabUrl: sender?.tab?.url ?? null,
      frameId: sender?.frameId ?? null,
    };
    bridgeFetch("/telemetry", enriched, 800).then((data) => {
      sendResponse(data);
    });
    return true; // Keep message channel open for async response
  }

  if (msg.type === "AGY_BRIDGE_RESULT") {
    bridgeFetch("/result", msg.payload || {}, 2000).then((data) => {
      sendResponse(data);
    });
    return true;
  }

  return false;
});
