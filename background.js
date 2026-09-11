/**
 * background.js — Service Worker for AGY Auto-Approve extension.
 * Handles badge updates to show enabled/disabled state.
 */

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
  chrome.tabs.query({ url: "*://*.google.com/*" }, (tabs) => {
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
