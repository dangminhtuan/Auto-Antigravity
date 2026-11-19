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
        files: ["rules.js", "handoff_core.js", "content.js"]
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

try {
  importScripts("handoff_core.js");
} catch (_) {}

const CORE = self.AGY_HANDOFF_CORE || null;
const STORAGE_KEYS = {
  MAPPINGS: "agy_project_mappings",
  SEARCH_INDEX: "agy_search_index",
  LOCAL_CATALOG: "agy_local_catalog",
  JOBS: "agy_handoff_jobs",
  LAST_REMOTE_CTX: "agy_last_remote_context",
  PENDING_LOCAL_HANDOFF: "agy_pending_local_handoff"
};

const tabRegistry = new Map();
let catalogWriteChain = Promise.resolve();

function extractCtxFromTab(tab) {
  const url = String((tab && tab.url) || "");
  const title = String((tab && tab.title) || "");
  const base = CORE && CORE.extractRemoteContextFromUrl
    ? CORE.extractRemoteContextFromUrl(url, title)
    : { url, title, workspaceId: "", projectId: "", cascadeId: "", isRemote: /\/remote\//i.test(url), suggestedMatch: url };
  const cached = tab && tab.id ? (tabRegistry.get(tab.id) || {}) : {};
  return {
    ...base,
    tabId: tab && tab.id ? tab.id : cached.tabId || null,
    projectLabel: cached.projectLabel || "",
    activeCascadeId: cached.activeCascadeId || base.cascadeId || "",
    isRemote: Boolean(base.isRemote || cached.isRemote),
    updatedAt: Date.now()
  };
}

function enqueueCatalogMerge(incomingItems, meta) {
  if (!Array.isArray(incomingItems) || incomingItems.length === 0) {
    return catalogWriteChain;
  }
  catalogWriteChain = catalogWriteChain.then(async () => {
    try {
      const data = await chrome.storage.local.get([STORAGE_KEYS.SEARCH_INDEX]);
      const existing = Array.isArray(data[STORAGE_KEYS.SEARCH_INDEX]) ? data[STORAGE_KEYS.SEARCH_INDEX] : [];
      const map = new Map();

      for (let i = 0; i < existing.length; i++) {
        const item = existing[i];
        if (!item) continue;
        const key = item.cascadeId || ("proj:" + String(item.projectLabel || item.title || "").toLowerCase());
        if (key) map.set(key, item);
      }

      const now = Date.now();
      for (let i = 0; i < incomingItems.length; i++) {
        const item = incomingItems[i];
        if (!item) continue;
        const key = item.cascadeId || ("proj:" + String(item.projectLabel || item.title || "").toLowerCase());
        if (!key) continue;
        const prev = map.get(key) || {};
        map.set(key, {
          ...prev,
          ...item,
          title: item.title || prev.title || "",
          projectLabel: item.projectLabel || prev.projectLabel || "",
          subtext: item.subtext || prev.subtext || "",
          href: item.href || prev.href || "",
          sourceTabId: (meta && meta.tabId) || item.sourceTabId || prev.sourceTabId || null,
          sourceIsRemote: Boolean(meta && meta.isRemote),
          updatedAt: item.updatedAt || now
        });
      }

      const merged = Array.from(map.values())
        .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
        .slice(0, 2500);

      await chrome.storage.local.set({
        [STORAGE_KEYS.SEARCH_INDEX]: merged,
        [STORAGE_KEYS.LOCAL_CATALOG]: merged.filter((x) => !x.sourceIsRemote).slice(0, 2000)
      });
      return merged.length;
    } catch (err) {
      console.warn("[AGY-BG] Catalog merge error:", err);
    }
  });
  return catalogWriteChain;
}

async function queryAllAntigravityTabs() {
  const tabs = await chrome.tabs.query({
    url: ["*://antigravity.google/*", "*://*.antigravity.google/*", "*://*.google.com/*"]
  });
  return tabs.filter((t) => t && t.url && /antigravity\.google/i.test(t.url));
}

async function saveHandoffJob(jobPatch) {
  if (!jobPatch || !jobPatch.id) return null;
  const data = await chrome.storage.local.get([STORAGE_KEYS.JOBS]);
  const jobs = (data[STORAGE_KEYS.JOBS] && typeof data[STORAGE_KEYS.JOBS] === "object") ? { ...data[STORAGE_KEYS.JOBS] } : {};
  const prev = jobs[jobPatch.id] || {};
  const next = {
    ...prev,
    ...jobPatch,
    updatedAt: Date.now()
  };
  jobs[jobPatch.id] = next;

  const entries = Object.entries(jobs);
  if (entries.length > 80) {
    entries.sort((a, b) => Number(b[1].updatedAt || 0) - Number(a[1].updatedAt || 0));
    const trimmed = {};
    for (let i = 0; i < 80; i++) trimmed[entries[i][0]] = entries[i][1];
    await chrome.storage.local.set({ [STORAGE_KEYS.JOBS]: trimmed });
  } else {
    await chrome.storage.local.set({ [STORAGE_KEYS.JOBS]: jobs });
  }
  return next;
}

async function findBestLocalTab(excludeTabId) {
  const tabs = await queryAllAntigravityTabs();
  const candidates = tabs.filter((t) => {
    if (!t || !t.id) return false;
    if (excludeTabId && t.id === excludeTabId) return false;
    return !/\/remote\//i.test(t.url || "");
  });

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    const regA = tabRegistry.get(a.id) || {};
    const regB = tabRegistry.get(b.id) || {};
    const scoreA = (regA.isChatOwner ? 100 : 0) + (a.active ? 20 : 0) + (regA.updatedAt ? 10 : 0);
    const scoreB = (regB.isChatOwner ? 100 : 0) + (b.active ? 20 : 0) + (regB.updatedAt ? 10 : 0);
    return scoreB - scoreA;
  });

  return candidates[0];
}

async function handleGetActiveRemoteContext() {
  const tabs = await queryAllAntigravityTabs();
  const remoteTabs = tabs.filter((t) => /\/remote\//i.test(t.url || ""));
  if (remoteTabs.length > 0) {
    remoteTabs.sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0));
    return { ok: true, context: extractCtxFromTab(remoteTabs[0]) };
  }
  const unifiedTabs = tabs.filter((t) => /\/r\//i.test(t.url || ""));
  if (unifiedTabs.length > 0) {
    unifiedTabs.sort((a, b) => {
      const ctxA = extractCtxFromTab(a);
      const ctxB = extractCtxFromTab(b);
      const sA = (a.active ? 10 : 0) + (ctxA.projectId ? 5 : 0);
      const sB = (b.active ? 10 : 0) + (ctxB.projectId ? 5 : 0);
      return sB - sA;
    });
    return { ok: true, context: extractCtxFromTab(unifiedTabs[0]) };
  }
  if (tabs.length > 0) {
    tabs.sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0));
    return { ok: true, context: extractCtxFromTab(tabs[0]) };
  }
  const data = await chrome.storage.local.get([STORAGE_KEYS.LAST_REMOTE_CTX]);
  if (data[STORAGE_KEYS.LAST_REMOTE_CTX]) {
    return { ok: true, context: data[STORAGE_KEYS.LAST_REMOTE_CTX] };
  }
  return { ok: false, error: "Chua phat hien tab Antigravity nao dang mo." };
}

async function handleDispatchHandoff(msg, sender) {
  const payload = msg.payload || {};
  const handoff = payload.handoff || {};
  const handoffId = String(handoff.id || payload.id || ("handoff-" + Date.now()));
  const targetLocalProject = String(payload.targetLocalProject || "").trim();
  const targetCascadeId = String(payload.targetCascadeId || "").trim();
  const createNewChat = Boolean(payload.createNewChat);
  const formattedPrompt = String(payload.formattedPrompt || "");
  const sourceTabId = sender && sender.tab ? sender.tab.id : null;
  const sourceRemoteCtx = payload.sourceRemoteCtx || (sender && sender.tab ? extractCtxFromTab(sender.tab) : {});

  await saveHandoffJob({
    id: handoffId,
    actionSummary: handoff.actionSummary || "",
    targetLocalProject: targetLocalProject,
    targetCascadeId: targetCascadeId,
    sourceTabId: sourceTabId,
    sourceRemoteCtx: sourceRemoteCtx,
    status: "sending",
    createdAt: Date.now()
  });

  const execPayload = {
    id: handoffId,
    targetLocalProject: targetLocalProject,
    targetCascadeId: targetCascadeId,
    createNewChat: createNewChat,
    prompt: formattedPrompt
  };

  let localTab = await findBestLocalTab(sourceTabId);
  if (!localTab && sender && sender.tab && /\/r\//i.test(sender.tab.url || "")) {
    // Desktop /r/... unified shell holds both Remote & Local sidebar projects in the same tab
    localTab = sender.tab;
  }
  if (!localTab) {
    const nonce = handoffId + "_" + Date.now();
    await chrome.storage.local.set({
      [STORAGE_KEYS.PENDING_LOCAL_HANDOFF]: {
        ...execPayload,
        nonce: nonce,
        expiresAt: Date.now() + 25000
      }
    });
    const openUrl = targetCascadeId
      ? `https://antigravity.google/c/${encodeURIComponent(targetCascadeId)}`
      : "https://antigravity.google/";
    const createdTab = await chrome.tabs.create({ url: openUrl, active: true });
    await saveHandoffJob({ id: handoffId, targetTabId: createdTab.id, status: "queued_new_tab" });
    return { ok: true, queuedNewTab: true, targetTabId: createdTab.id, id: handoffId };
  }

  let execRes = null;
  try {
    execRes = await chrome.tabs.sendMessage(localTab.id, {
      type: "AGY_EXECUTE_HANDOFF_LOCAL",
      payload: execPayload
    });
  } catch (_) {
    execRes = null;
  }

  if (!execRes || !execRes.ok) {
    // Wake sleeping tab or re-inject scripts once before falling back to pending queue
    try {
      await chrome.tabs.update(localTab.id, { active: true });
      await new Promise((r) => setTimeout(r, 700));
      execRes = await chrome.tabs.sendMessage(localTab.id, {
        type: "AGY_EXECUTE_HANDOFF_LOCAL",
        payload: execPayload
      });
    } catch (_) {
      execRes = null;
    }
  }

  if (!execRes || !execRes.ok) {
    const errMsg = (execRes && execRes.error) || "Tab AGY Local chua san sang nhan lenh. Thu mo tab Local va bam Gui lai.";
    await saveHandoffJob({ id: handoffId, targetTabId: localTab.id, status: "failed", error: errMsg });
    return { ok: false, error: errMsg, targetTabId: localTab.id };
  }

  await saveHandoffJob({
    id: handoffId,
    targetTabId: localTab.id,
    status: "sent",
    executedTitle: execRes.chatTitle || "",
    executedCascadeId: execRes.cascadeId || targetCascadeId || ""
  });

  return {
    ok: true,
    id: handoffId,
    targetTabId: localTab.id,
    chatTitle: execRes.chatTitle || "",
    cascadeId: execRes.cascadeId || ""
  };
}

async function handleReturnResultToWeb(msg) {
  const payload = msg.payload || {};
  const result = payload.result || {};
  const handoffId = String(result.id || payload.id || "").trim();
  const textToFill = String(payload.formattedReturn || result.rawBlock || "");

  const data = await chrome.storage.local.get([STORAGE_KEYS.JOBS, STORAGE_KEYS.MAPPINGS]);
  const jobs = data[STORAGE_KEYS.JOBS] || {};
  const job = handoffId ? jobs[handoffId] : null;
  const tabs = await queryAllAntigravityTabs();
  const remoteTabs = tabs.filter((t) => /\/remote\//i.test(t.url || ""));
  const candidateReturnTabs = remoteTabs.length > 0 ? remoteTabs : tabs.filter((t) => /\/r\//i.test(t.url || ""));

  let targetTab = null;
  if (job && job.sourceTabId) {
    targetTab = tabs.find((t) => t.id === job.sourceTabId) || null;
  }
  if (!targetTab && job && job.sourceRemoteCtx) {
    const ws = String(job.sourceRemoteCtx.workspaceId || "").toLowerCase();
    const u = String(job.sourceRemoteCtx.url || "").toLowerCase();
    targetTab = candidateReturnTabs.find((t) => {
      const tu = String(t.url || "").toLowerCase();
      return (ws && tu.includes(ws)) || (u && tu === u);
    }) || null;
  }
  if (!targetTab && candidateReturnTabs.length === 1) {
    targetTab = candidateReturnTabs[0];
  } else if (!targetTab && candidateReturnTabs.length > 1) {
    const mappings = Array.isArray(data[STORAGE_KEYS.MAPPINGS]) ? data[STORAGE_KEYS.MAPPINGS] : [];
    const projNorm = CORE ? CORE.normalizeSearchText(job && job.targetLocalProject) : "";
    for (const m of mappings) {
      if (!projNorm || !m || !m.remoteMatch) continue;
      if (CORE.normalizeSearchText(m.localProject) === projNorm) {
        const needle = m.remoteMatch.toLowerCase();
        targetTab = candidateReturnTabs.find((t) => String(t.url || "").toLowerCase().includes(needle)) || null;
        if (targetTab) break;
      }
    }
    if (!targetTab) targetTab = candidateReturnTabs[0];
  }

  if (!targetTab) {
    return { ok: false, error: "Khong tim thay tab Web Remote nao dang mo de dan ket qua." };
  }

  await chrome.tabs.update(targetTab.id, { active: true });
  await new Promise((r) => setTimeout(r, 350));

  let fillRes = null;
  try {
    fillRes = await chrome.tabs.sendMessage(targetTab.id, {
      type: "AGY_FILL_RESULT_ON_WEB",
      payload: {
        id: handoffId,
        text: textToFill,
        autoSubmit: false // Never auto-submit on Web
      }
    });
  } catch (err) {
    fillRes = { ok: false, error: err && err.message ? err.message : String(err) };
  }

  if (!fillRes || !fillRes.ok) {
    return { ok: false, error: (fillRes && fillRes.error) || "Khong dien duoc vao o chat tren tab Web Remote." };
  }

  if (handoffId) {
    await saveHandoffJob({ id: handoffId, status: "returned_to_web" });
  }
  return { ok: true, remoteTabId: targetTab.id };
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
    return true;
  }

  if (msg.type === "AGY_BRIDGE_RESULT") {
    bridgeFetch("/result", msg.payload || {}, 2000).then((data) => {
      sendResponse(data);
    });
    return true;
  }

  if (msg.type === "AGY_GET_SELF_TAB_INFO") {
    const tab = sender && sender.tab ? sender.tab : null;
    sendResponse({
      ok: Boolean(tab),
      tabId: tab ? tab.id : null,
      url: tab ? tab.url : "",
      title: tab ? tab.title : "",
      context: tab ? extractCtxFromTab(tab) : null
    });
    return false;
  }

  if (msg.type === "AGY_REGISTER_CATALOG") {
    const tab = sender && sender.tab ? sender.tab : null;
    const tabId = tab ? tab.id : null;
    const isRemote = Boolean((msg.remoteContext && msg.remoteContext.isRemote) || (tab && /\/remote\//i.test(tab.url || "")));
    if (tabId) {
      tabRegistry.set(tabId, {
        tabId: tabId,
        url: tab.url || "",
        title: tab.title || "",
        isRemote: isRemote,
        projectLabel: msg.activeProjectLabel || (msg.remoteContext && msg.remoteContext.projectLabel) || "",
        activeCascadeId: msg.activeCascadeId || "",
        isChatOwner: Boolean(msg.isChatOwner),
        updatedAt: Date.now()
      });
    }
    const ctx = tab ? extractCtxFromTab(tab) : (msg.remoteContext || {});
    if ((isRemote || ctx.isUnifiedShell) && ctx.url) {
      chrome.storage.local.set({ [STORAGE_KEYS.LAST_REMOTE_CTX]: ctx }).catch(() => {});
    }
    enqueueCatalogMerge(msg.catalogItems, { tabId, isRemote }).then((totalCount) => {
      sendResponse({ ok: true, count: totalCount || 0, tabContext: ctx });
    });
    return true;
  }

  if (msg.type === "AGY_GET_ACTIVE_REMOTE_CONTEXT") {
    handleGetActiveRemoteContext().then(sendResponse);
    return true;
  }

  if (msg.type === "AGY_SAVE_QUICK_MAPPING") {
    (async () => {
      const incoming = msg.payload || {};
      const data = await chrome.storage.local.get([STORAGE_KEYS.MAPPINGS]);
      const existing = Array.isArray(data[STORAGE_KEYS.MAPPINGS]) ? data[STORAGE_KEYS.MAPPINGS] : [];
      const rec = {
        id: incoming.id || ("map_" + Date.now()),
        alias: String(incoming.alias || incoming.localProject || "").trim(),
        remoteMatch: String(incoming.remoteMatch || "").trim(),
        localProject: String(incoming.localProject || "").trim(),
        localCascadeId: String(incoming.localCascadeId || "").trim(),
        isDefault: Boolean(incoming.isDefault),
        updatedAt: Date.now()
      };
      const filtered = existing.filter((m) => {
        if (!m) return false;
        if (rec.remoteMatch && m.remoteMatch && m.remoteMatch.toLowerCase() === rec.remoteMatch.toLowerCase()) return false;
        if (rec.alias && m.alias && m.alias.toLowerCase() === rec.alias.toLowerCase()) return false;
        return true;
      }).map((m) => ({ ...m, isDefault: rec.isDefault ? false : Boolean(m.isDefault) }));
      const next = [rec, ...filtered];
      const validated = CORE ? CORE.validateMappingsImport(next) : { ok: true, mappings: next };
      const finalList = validated.ok ? validated.mappings : next;
      await chrome.storage.local.set({ [STORAGE_KEYS.MAPPINGS]: finalList });
      sendResponse({ ok: true, mapping: rec, mappings: finalList });
    })();
    return true;
  }

  if (msg.type === "AGY_OPEN_OPTIONS") {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage(() => sendResponse({ ok: true }));
      return true;
    }
    sendResponse({ ok: false });
    return false;
  }

  if (msg.type === "AGY_DISPATCH_HANDOFF") {
    handleDispatchHandoff(msg, sender).then(sendResponse);
    return true;
  }

  if (msg.type === "AGY_NOTIFY_RESULT_READY") {
    const res = (msg.payload && msg.payload.result) || {};
    if (res.id) {
      saveHandoffJob({
        id: res.id,
        status: "result_ready",
        result: res,
        targetTabId: sender?.tab?.id ?? null
      }).then((job) => sendResponse({ ok: true, job }));
      return true;
    }
    sendResponse({ ok: false });
    return false;
  }

  if (msg.type === "AGY_RETURN_RESULT_TO_WEB") {
    handleReturnResultToWeb(msg).then(sendResponse);
    return true;
  }

  return false;
});
