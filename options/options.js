(function () {
  "use strict";

  const CORE = window.AGY_HANDOFF_CORE;
  const STORAGE_KEYS = {
    mappings: "agy_project_mappings",
    searchIndex: "agy_search_index",
    localCatalog: "agy_local_catalog",
    remoteCatalog: "agy_remote_catalog",
    jobs: "agy_handoff_jobs"
  };

  let mappings = [];
  let catalogItems = [];
  let remoteCatalogItems = [];
  let openTabs = [];
  let qpRemoteTab = null;
  let qpLocalTab = null;
  let jobs = {};

  const elBanner = document.getElementById("status-banner");
  const elFormTitle = document.getElementById("form-title");
  const elEditId = document.getElementById("inp-edit-id");
  const elAlias = document.getElementById("inp-alias");
  const elRemoteSelect = document.getElementById("sel-remote-catalog");
  const elRemoteMatch = document.getElementById("inp-remote-match");
  const elRemotePreview = document.getElementById("remote-grab-preview");
  const elLocalSelect = document.getElementById("sel-local-catalog");
  const elLocalProject = document.getElementById("inp-local-project");
  const elLocalCascade = document.getElementById("inp-local-cascade");
  const elIsDefault = document.getElementById("chk-is-default");
  const elAdvBox = document.getElementById("advanced-options");

  const elBtnSave = document.getElementById("btn-save-mapping");
  const elBtnReset = document.getElementById("btn-reset-form");
  const elBtnRefreshRemote = document.getElementById("btn-refresh-remote");
  const elBtnRefreshCatalog = document.getElementById("btn-refresh-catalog");

  const elQpRemoteName = document.getElementById("qp-remote-name");
  const elQpRemoteSub = document.getElementById("qp-remote-sub");
  const elQpLocalName = document.getElementById("qp-local-name");
  const elQpLocalSub = document.getElementById("qp-local-sub");
  const elBtnRescanTabs = document.getElementById("btn-rescan-tabs");
  const elBtnSwapPair = document.getElementById("btn-swap-pair");
  const elBtnQuickPair = document.getElementById("btn-quick-pair-save");

  const elMappingList = document.getElementById("mapping-list");
  const elMappingCount = document.getElementById("mapping-count");
  const elCatalogStat = document.getElementById("catalog-stat");

  const elImportPanel = document.getElementById("import-panel");
  const elBtnExport = document.getElementById("btn-export-json");
  const elBtnImportToggle = document.getElementById("btn-import-toggle");
  const elBtnImportClose = document.getElementById("btn-import-close");
  const elBtnChooseFile = document.getElementById("btn-choose-file");
  const elFileImport = document.getElementById("file-import-json");
  const elTxtImport = document.getElementById("txt-import-json");
  const elChkImportMerge = document.getElementById("chk-import-merge");
  const elBtnApplyImport = document.getElementById("btn-apply-import");

  const elTabCatalog = document.getElementById("tab-btn-catalog");
  const elTabRemote = document.getElementById("tab-btn-remote");
  const elTabJobs = document.getElementById("tab-btn-jobs");
  const elPaneCatalog = document.getElementById("pane-catalog");
  const elPaneRemote = document.getElementById("pane-remote");
  const elPaneJobs = document.getElementById("pane-jobs");
  const elBottomDesc = document.getElementById("bottom-pane-desc");
  const elCatalogProjCount = document.getElementById("catalog-proj-count");
  const elRemoteProjCount = document.getElementById("remote-proj-count");
  const elJobsCount = document.getElementById("jobs-count");

  function showBanner(msg, type) {
    elBanner.textContent = msg;
    elBanner.className = "status-banner " + (type || "info");
    clearTimeout(showBanner._timer);
    showBanner._timer = setTimeout(() => {
      elBanner.classList.add("hidden");
    }, 5000);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function slugifyAlias(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u0111\u0110]/g, "d")
      .toLowerCase()
      .replace(/[^a-z0-9/_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function formatTabDisplay(t) {
    if (!t) return "(Chưa phát hiện)";
    const proj = String(t.projectLabel || "").trim();
    const chat = String(t.chatTitle || "").trim();
    const title = String(t.title || "").trim();
    const kind = t.isRemote ? "Remote" : (t.isUnifiedShell ? "Desktop" : "Local");
    if (proj && chat && proj !== chat) return `[${kind}] ${proj} / ${chat}`;
    return `[${kind}] ${proj || chat || title || t.suggestedMatch || "(Tab Antigravity)"}`;
  }

  function renderQuickPairPreview() {
    if (qpRemoteTab) {
      elQpRemoteName.textContent = formatTabDisplay(qpRemoteTab);
      elQpRemoteSub.textContent = "Match: " + (qpRemoteTab.suggestedMatch || qpRemoteTab.url || "(chưa rõ)");
    } else {
      elQpRemoteName.textContent = openTabs.length === 1 ? formatTabDisplay(openTabs[0]) : "(Cần mở tab dự án 1)";
      elQpRemoteSub.textContent = openTabs.length < 2 ? "Mở thêm 1 tab Antigravity nữa để ghép tự động" : "";
    }

    if (qpLocalTab) {
      elQpLocalName.textContent = formatTabDisplay(qpLocalTab);
      elQpLocalSub.textContent = qpLocalTab.projectLabel
        ? "Dự án đích: " + qpLocalTab.projectLabel
        : ("Chat đích: " + (qpLocalTab.chatTitle || qpLocalTab.title || "(chưa rõ)"));
    } else {
      elQpLocalName.textContent = "(Cần mở tab dự án 2)";
      elQpLocalSub.textContent = "Mở sẵn 2 tab của 2 dự án muốn ghép với nhau";
    }

    elBtnQuickPair.disabled = !(qpRemoteTab && qpLocalTab);
    elBtnSwapPair.disabled = !(qpRemoteTab && qpLocalTab);
  }

  function getMergedCatalogProjects() {
    const map = new Map();
    for (let i = 0; i < catalogItems.length; i++) {
      const it = catalogItems[i];
      if (!it) continue;
      const proj = String(it.projectLabel || (it.isProjectHeader ? it.title : "") || "").trim();
      if (!proj) continue;
      if (!map.has(proj)) {
        map.set(proj, { projectLabel: proj, conversations: [] });
      }
      if (!it.isProjectHeader && it.cascadeId) {
        map.get(proj).conversations.push(it);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.projectLabel.localeCompare(b.projectLabel));
  }

  function populateRemoteSelect() {
    elRemoteSelect.innerHTML = '<option value="">-- Chọn tab đang mở hoặc dự án Remote --</option>';

    if (openTabs.length > 0) {
      const grpOpen = document.createElement("optgroup");
      grpOpen.label = "🟢 Tab đang mở (" + openTabs.length + ")";
      for (const t of openTabs) {
        const opt = document.createElement("option");
        const matchVal = t.suggestedMatch || t.projectId || t.workspaceId || t.url || "";
        const label = formatTabDisplay(t);
        opt.value = JSON.stringify({
          remoteMatch: matchVal,
          label: t.projectLabel || t.chatTitle || t.title || matchVal,
          guessAlias: slugifyAlias(t.projectLabel || t.title || "")
        });
        opt.textContent = label;
        grpOpen.appendChild(opt);
      }
      elRemoteSelect.appendChild(grpOpen);
    }

    if (remoteCatalogItems.length > 0) {
      const grpSaved = document.createElement("optgroup");
      grpSaved.label = "🌐 Dự án Remote đã ghé (" + remoteCatalogItems.length + ")";
      for (const r of remoteCatalogItems) {
        const opt = document.createElement("option");
        opt.value = JSON.stringify({
          remoteMatch: r.remoteMatch || r.url,
          label: r.label || r.projectLabel || r.title || r.remoteMatch,
          guessAlias: slugifyAlias(r.projectLabel || r.label || "")
        });
        opt.textContent = "🌐 " + (r.label || r.remoteMatch) + " (" + String(r.remoteMatch || "").slice(0, 14) + "…)";
        grpSaved.appendChild(opt);
      }
      elRemoteSelect.appendChild(grpSaved);
    }
    elRemoteProjCount.textContent = String(remoteCatalogItems.length);
  }

  function populateLocalSelect() {
    const projects = getMergedCatalogProjects();
    elLocalSelect.innerHTML = '<option value="">-- Chọn tab đang mở hoặc dự án Local --</option>';

    if (openTabs.length > 0) {
      const grpOpen = document.createElement("optgroup");
      grpOpen.label = "🟢 Tab đang mở (" + openTabs.length + ")";
      for (const t of openTabs) {
        const proj = String(t.projectLabel || t.chatTitle || t.title || "").trim();
        if (!proj) continue;
        const opt = document.createElement("option");
        opt.value = JSON.stringify({
          project: proj,
          cascadeId: t.projectLabel ? "" : (t.cascadeId || "")
        });
        opt.textContent = formatTabDisplay(t);
        grpOpen.appendChild(opt);
      }
      elLocalSelect.appendChild(grpOpen);
    }

    if (projects.length > 0) {
      const grpProj = document.createElement("optgroup");
      grpProj.label = "📁 Dự án Local đã quét (" + projects.length + ")";
      for (const p of projects) {
        const optProj = document.createElement("option");
        optProj.value = JSON.stringify({ project: p.projectLabel, cascadeId: "" });
        optProj.textContent = "📁 " + p.projectLabel + " (" + p.conversations.length + " chat)";
        grpProj.appendChild(optProj);

        const recentChats = p.conversations.slice(0, 4);
        for (const c of recentChats) {
          const optChat = document.createElement("option");
          optChat.value = JSON.stringify({ project: p.projectLabel, cascadeId: c.cascadeId });
          optChat.textContent = "   ↳ 💬 " + (c.title || c.cascadeId) + " [" + p.projectLabel + "]";
          grpProj.appendChild(optChat);
        }
      }
      elLocalSelect.appendChild(grpProj);
    }

    elCatalogStat.textContent = "Catalog: " + projects.length + " dự án · " + catalogItems.length + " mục";
    elCatalogProjCount.textContent = String(projects.length);
  }

  function renderCatalogPane() {
    const projects = getMergedCatalogProjects();
    if (!projects.length) {
      elPaneCatalog.innerHTML = '<div class="empty-state">Chưa quét được dự án Local nào. Hãy mở tab Antigravity rồi bấm "🔄 Quét đủ" trong Smart Search.</div>';
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "catalog-chip-grid";
    for (const p of projects) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "catalog-chip";
      chip.textContent = "📁 " + p.projectLabel + " (" + p.conversations.length + ")";
      chip.title = "Bấm để điền vào cột Dự án Local";
      chip.addEventListener("click", () => {
        elLocalProject.value = p.projectLabel;
        if (!elAlias.value.trim()) {
          elAlias.value = slugifyAlias(p.projectLabel);
        }
        showBanner("Đã điền cột Local: " + p.projectLabel, "info");
      });
      wrap.appendChild(chip);
    }
    elPaneCatalog.innerHTML = "";
    elPaneCatalog.appendChild(wrap);
  }

  function renderRemotePane() {
    if (!remoteCatalogItems.length) {
      elPaneRemote.innerHTML = '<div class="empty-state">Chưa ghi nhận dự án Remote nào. Hãy mở tab Web Remote (hoặc bấm "🔄 Quét lại tab") để extension tự lưu vào đây.</div>';
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "catalog-chip-grid";
    for (const r of remoteCatalogItems) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "catalog-chip";
      chip.textContent = "🌐 " + (r.label || r.projectLabel || r.remoteMatch);
      chip.title = "Match: " + (r.remoteMatch || "") + " — bấm để điền vào cột Remote";
      chip.addEventListener("click", () => {
        elRemoteMatch.value = r.remoteMatch || r.url || "";
        elRemotePreview.textContent = "Đã chọn Remote: " + (r.label || r.remoteMatch);
        if (!elAlias.value.trim() && (r.projectLabel || r.label)) {
          elAlias.value = slugifyAlias(r.projectLabel || r.label);
        }
        showBanner("Đã điền cột Remote: " + (r.label || r.remoteMatch), "info");
      });
      wrap.appendChild(chip);
    }
    elPaneRemote.innerHTML = "";
    elPaneRemote.appendChild(wrap);
  }

  function renderJobsPane() {
    const jobEntries = Object.values(jobs && typeof jobs === "object" ? jobs : {})
      .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))
      .slice(0, 30);

    elJobsCount.textContent = String(jobEntries.length);
    if (!jobEntries.length) {
      elPaneJobs.innerHTML = '<div class="empty-state">Chưa có lệnh Handoff nào được gửi đi. Mỗi lần bạn bấm "▶ Gửi sang Local", nhật ký sẽ hiện tại đây.</div>';
      return;
    }

    elPaneJobs.innerHTML = "";
    for (const j of jobEntries) {
      const row = document.createElement("div");
      row.className = "job-row";
      const time = j.updatedAt ? new Date(j.updatedAt).toLocaleString("vi-VN") : "";
      row.innerHTML =
        '<div><strong>#' + escapeHtml(j.id) + "</strong> → " + escapeHtml(j.targetLocalProject || "(chưa rõ)") +
        (j.actionSummary ? ' <span class="muted">(' + escapeHtml(j.actionSummary) + ")</span>" : "") + "</div>" +
        '<div class="pill">' + escapeHtml(j.status || "unknown") + (time ? " · " + escapeHtml(time) : "") + "</div>";
      elPaneJobs.appendChild(row);
    }
  }

  function renderMappingList() {
    elMappingCount.textContent = String(mappings.length);
    if (!mappings.length) {
      elMappingList.innerHTML = '<div class="empty-state">Chưa có cặp liên kết nào. Hãy bấm <strong>⚡ Quét &amp; Ghép 2 Tab Đang Mở</strong> ở trên hoặc chọn ở 2 cột bên cạnh!</div>';
      return;
    }

    elMappingList.innerHTML = "";
    for (const m of mappings) {
      const card = document.createElement("div");
      card.className = "mapping-card" + (m.isDefault ? " is-default" : "");

      const top = document.createElement("div");
      top.className = "mapping-top";

      const title = document.createElement("div");
      title.className = "mapping-alias";
      title.innerHTML =
        "<span>" + escapeHtml(m.alias || m.localProject || "(chưa đặt alias)") + "</span>" +
        (m.isDefault ? '<span class="badge-default">MẶC ĐỊNH</span>' : "");

      const actions = document.createElement("div");
      actions.className = "mapping-actions";

      if (!m.isDefault) {
        const btnDef = document.createElement("button");
        btnDef.className = "btn btn-mini btn-ghost";
        btnDef.textContent = "⭐ Mặc định";
        btnDef.addEventListener("click", () => setDefaultMapping(m.id));
        actions.appendChild(btnDef);
      }

      const btnEdit = document.createElement("button");
      btnEdit.className = "btn btn-mini btn-blue";
      btnEdit.textContent = "✏️ Sửa";
      btnEdit.addEventListener("click", () => startEditMapping(m));
      actions.appendChild(btnEdit);

      const btnDel = document.createElement("button");
      btnDel.className = "btn btn-mini btn-danger";
      btnDel.textContent = "🗑️ Xóa";
      btnDel.addEventListener("click", () => deleteMapping(m.id));
      actions.appendChild(btnDel);

      top.appendChild(title);
      top.appendChild(actions);

      const meta = document.createElement("div");
      meta.className = "mapping-meta";
      meta.innerHTML =
        '<div class="meta-cell"><span class="meta-label">🌐 Remote Match</span>' + escapeHtml(m.remoteMatch || "(khớp theo alias)") + "</div>" +
        '<div class="meta-cell"><span class="meta-label">💻 Local Đích</span>' + escapeHtml(m.localProject || "(chưa đặt)") +
        (m.localCascadeId ? '<br><small class="muted">Chat ID: ' + escapeHtml(m.localCascadeId.slice(0, 12)) + "…</small>" : "") + "</div>";

      card.appendChild(top);
      card.appendChild(meta);
      elMappingList.appendChild(card);
    }
  }

  function resetForm() {
    elEditId.value = "";
    elAlias.value = "";
    elRemoteSelect.value = "";
    elRemoteMatch.value = "";
    elLocalSelect.value = "";
    elLocalProject.value = "";
    elLocalCascade.value = "";
    elIsDefault.checked = false;
    elAdvBox.open = false;
    elFormTitle.textContent = "➕ Chọn thủ công (Remote ↔ Local)";
    elBtnSave.textContent = "💾 Lưu cặp liên kết";
    elBtnReset.classList.add("hidden");
  }

  function startEditMapping(m) {
    elEditId.value = m.id;
    elAlias.value = m.alias || "";
    elRemoteMatch.value = m.remoteMatch || "";
    elLocalProject.value = m.localProject || "";
    elLocalCascade.value = m.localCascadeId || "";
    elIsDefault.checked = Boolean(m.isDefault);
    elAdvBox.open = true;
    elFormTitle.textContent = "✏️ Sửa cặp: " + (m.alias || m.localProject);
    elBtnSave.textContent = "💾 Cập nhật cặp liên kết";
    elBtnReset.classList.remove("hidden");
    elRemoteMatch.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function persistMappings(nextList) {
    const validated = CORE.validateMappingsImport(nextList);
    if (!validated.ok) {
      showBanner(validated.error || "Lỗi validate danh sách", "err");
      return false;
    }
    mappings = validated.mappings;
    await chrome.storage.local.set({ [STORAGE_KEYS.mappings]: mappings });
    renderMappingList();
    return true;
  }

  async function savePairRecord({ id = "", alias = "", remoteMatch = "", localProject = "", localCascadeId = "", isDefault = false }) {
    const cleanLocal = String(localProject || "").trim();
    const cleanRemote = String(remoteMatch || "").trim();
    const cleanAlias = String(alias || "").trim() || slugifyAlias(cleanLocal || cleanRemote);

    if (!cleanAlias && !cleanRemote) {
      showBanner("Vui lòng chọn Dự án Remote (hoặc đặt Alias).", "err");
      return false;
    }
    if (!cleanLocal) {
      showBanner("Vui lòng chọn hoặc nhập tên Dự án AGY Local.", "err");
      return false;
    }

    const baseList = mappings.map((m) => ({
      ...m,
      isDefault: isDefault ? false : m.isDefault
    }));

    const record = {
      id: id || ("map_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6)),
      alias: cleanAlias,
      remoteMatch: cleanRemote,
      localProject: cleanLocal,
      localCascadeId: String(localCascadeId || "").trim(),
      isDefault: Boolean(isDefault),
      updatedAt: Date.now()
    };

    const existingIdx = id
      ? baseList.findIndex((m) => m.id === id)
      : baseList.findIndex((m) => cleanRemote && m.remoteMatch && m.remoteMatch.toLowerCase() === cleanRemote.toLowerCase());

    if (existingIdx >= 0) {
      record.id = baseList[existingIdx].id;
      baseList[existingIdx] = record;
    } else {
      baseList.unshift(record);
    }

    if (await persistMappings(baseList)) {
      showBanner((existingIdx >= 0 ? "Đã cập nhật cặp: " : "Đã ghép thành công: ") + (record.remoteMatch ? `${record.alias}` : record.alias) + " ↔ " + record.localProject, "ok");
      return true;
    }
    return false;
  }

  async function saveMappingFromForm() {
    const ok = await savePairRecord({
      id: elEditId.value.trim(),
      alias: elAlias.value.trim(),
      remoteMatch: elRemoteMatch.value.trim(),
      localProject: elLocalProject.value.trim(),
      localCascadeId: elLocalCascade.value.trim(),
      isDefault: elIsDefault.checked
    });
    if (ok) resetForm();
  }

  async function quickPairTwoOpenTabs() {
    if (!qpRemoteTab || !qpLocalTab) {
      showBanner("Cần mở sẵn 2 tab Antigravity (1 Remote + 1 Local) để ghép nhanh 1-click!", "err");
      return;
    }
    elBtnQuickPair.disabled = true;
    try {
      const remoteMatch = qpRemoteTab.suggestedMatch || qpRemoteTab.projectId || qpRemoteTab.workspaceId || qpRemoteTab.url || "";
      const localProject = String(qpLocalTab.projectLabel || qpLocalTab.chatTitle || qpLocalTab.title || "").trim();
      const localCascadeId = qpLocalTab.projectLabel ? "" : String(qpLocalTab.cascadeId || "").trim();
      const alias = slugifyAlias(qpLocalTab.projectLabel || qpRemoteTab.projectLabel || localProject || "pair");

      await savePairRecord({
        alias: alias,
        remoteMatch: remoteMatch,
        localProject: localProject,
        localCascadeId: localCascadeId,
        isDefault: mappings.length === 0
      });
    } finally {
      elBtnQuickPair.disabled = !(qpRemoteTab && qpLocalTab);
    }
  }

  async function scanOpenAgyTabs(showFeedback = false) {
    elBtnRescanTabs.disabled = true;
    elBtnRefreshRemote.disabled = true;
    try {
      const resp = await chrome.runtime.sendMessage({ type: "AGY_GET_OPEN_AGY_TABS" });
      if (resp && resp.ok) {
        openTabs = Array.isArray(resp.tabs) ? resp.tabs : [];
        const pair = resp.suggestedPair || {};
        qpRemoteTab = pair.remoteTab || null;
        qpLocalTab = pair.localTab || null;
        renderQuickPairPreview();
        populateRemoteSelect();
        populateLocalSelect();
        if (showFeedback) {
          showBanner(`Đã quét ${openTabs.length} tab Antigravity đang mở.`, "info");
        }
      }
    } catch (err) {
      if (showFeedback) {
        showBanner("Lỗi quét các tab mở: " + (err && err.message ? err.message : err), "err");
      }
    } finally {
      elBtnRescanTabs.disabled = false;
      elBtnRefreshRemote.disabled = false;
    }
  }

  async function deleteMapping(id) {
    const next = mappings.filter((m) => m.id !== id);
    if (await persistMappings(next)) {
      if (elEditId.value === id) resetForm();
      showBanner("Đã xóa cặp liên kết.", "info");
    }
  }

  async function setDefaultMapping(id) {
    const next = mappings.map((m) => ({
      ...m,
      isDefault: m.id === id
    }));
    if (await persistMappings(next)) {
      showBanner("Đã cập nhật dự án mặc định.", "ok");
    }
  }

  function exportJson() {
    const payload = {
      version: "2.0.2",
      exportedAt: new Date().toISOString(),
      mappings: mappings
    };
    const jsonText = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agy-handoff-mappings-v2.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showBanner("Đã xuất " + mappings.length + " cặp liên kết ra file JSON.", "ok");
  }

  async function applyImportJson() {
    const raw = elTxtImport.value.trim();
    if (!raw) {
      showBanner("Vui lòng chọn file .json hoặc dán nội dung JSON vào ô nhập.", "err");
      return;
    }
    const res = CORE.validateMappingsImport(raw);
    if (!res.ok) {
      showBanner(res.error, "err");
      return;
    }
    if (!res.mappings.length) {
      showBanner("File JSON không có bản ghi liên kết hợp lệ nào.", "err");
      return;
    }

    let finalList = res.mappings;
    if (elChkImportMerge.checked) {
      const byKey = new Map();
      for (const item of [...mappings, ...res.mappings]) {
        const key = (item.alias || "").toLowerCase() + "|" + (item.remoteMatch || "").toLowerCase();
        byKey.set(key, item);
      }
      finalList = Array.from(byKey.values());
    }

    if (await persistMappings(finalList)) {
      elImportPanel.classList.add("hidden");
      elTxtImport.value = "";
      showBanner("Đã nhập thành công " + res.mappings.length + " bản ghi (tổng " + mappings.length + ").", "ok");
    }
  }

  async function loadAllData() {
    const stored = await chrome.storage.local.get([
      STORAGE_KEYS.mappings,
      STORAGE_KEYS.searchIndex,
      STORAGE_KEYS.localCatalog,
      STORAGE_KEYS.remoteCatalog,
      STORAGE_KEYS.jobs
    ]);

    const rawMappings = Array.isArray(stored[STORAGE_KEYS.mappings]) ? stored[STORAGE_KEYS.mappings] : [];
    const validated = CORE.validateMappingsImport(rawMappings);
    mappings = validated.ok ? validated.mappings : [];

    const idxA = Array.isArray(stored[STORAGE_KEYS.searchIndex]) ? stored[STORAGE_KEYS.searchIndex] : [];
    const idxB = Array.isArray(stored[STORAGE_KEYS.localCatalog]) ? stored[STORAGE_KEYS.localCatalog] : [];
    const mergedMap = new Map();
    for (const item of [...idxA, ...idxB]) {
      if (!item) continue;
      const key = item.cascadeId || ("proj:" + (item.projectLabel || item.title || ""));
      if (!mergedMap.has(key)) mergedMap.set(key, item);
    }
    catalogItems = Array.from(mergedMap.values());
    remoteCatalogItems = Array.isArray(stored[STORAGE_KEYS.remoteCatalog]) ? stored[STORAGE_KEYS.remoteCatalog] : [];
    jobs = stored[STORAGE_KEYS.jobs] || {};

    populateRemoteSelect();
    populateLocalSelect();
    renderMappingList();
    renderCatalogPane();
    renderRemotePane();
    renderJobsPane();
  }

  elRemoteSelect.addEventListener("change", () => {
    const val = elRemoteSelect.value;
    if (!val) return;
    try {
      const parsed = JSON.parse(val);
      if (parsed.remoteMatch) elRemoteMatch.value = parsed.remoteMatch;
      if (parsed.label) elRemotePreview.textContent = "Đã chọn Remote: " + parsed.label;
      if (!elAlias.value.trim() && parsed.guessAlias) elAlias.value = parsed.guessAlias;
    } catch (_) {}
  });

  elLocalSelect.addEventListener("change", () => {
    const val = elLocalSelect.value;
    if (!val) return;
    try {
      const parsed = JSON.parse(val);
      if (parsed.project) elLocalProject.value = parsed.project;
      elLocalCascade.value = parsed.cascadeId || "";
      if (!elAlias.value.trim() && parsed.project) {
        elAlias.value = slugifyAlias(parsed.project);
      }
    } catch (_) {}
  });

  elBtnSwapPair.addEventListener("click", () => {
    const tmp = qpRemoteTab;
    qpRemoteTab = qpLocalTab;
    qpLocalTab = tmp;
    renderQuickPairPreview();
  });
  elBtnRescanTabs.addEventListener("click", () => scanOpenAgyTabs(true));
  elBtnQuickPair.addEventListener("click", quickPairTwoOpenTabs);

  elBtnSave.addEventListener("click", saveMappingFromForm);
  elBtnReset.addEventListener("click", resetForm);
  elBtnRefreshRemote.addEventListener("click", () => scanOpenAgyTabs(true));
  elBtnRefreshCatalog.addEventListener("click", async () => {
    await loadAllData();
    await scanOpenAgyTabs(true);
  });

  elBtnExport.addEventListener("click", exportJson);
  elBtnImportToggle.addEventListener("click", () => elImportPanel.classList.toggle("hidden"));
  elBtnImportClose.addEventListener("click", () => elImportPanel.classList.add("hidden"));
  elBtnChooseFile.addEventListener("click", () => elFileImport.click());
  elFileImport.addEventListener("change", (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      elTxtImport.value = String(reader.result || "");
      showBanner("Đã nạp nội dung từ file " + file.name + ". Bấm 'Áp dụng JSON' để lưu.", "info");
    };
    reader.readAsText(file);
  });
  elBtnApplyImport.addEventListener("click", applyImportJson);

  function activateBottomTab(which) {
    elTabCatalog.classList.toggle("active", which === "catalog");
    elTabRemote.classList.toggle("active", which === "remote");
    elTabJobs.classList.toggle("active", which === "jobs");
    elPaneCatalog.classList.toggle("hidden", which !== "catalog");
    elPaneRemote.classList.toggle("hidden", which !== "remote");
    elPaneJobs.classList.toggle("hidden", which !== "jobs");
    if (elBottomDesc) {
      elBottomDesc.textContent =
        which === "jobs"
          ? "Nhật ký từng lệnh Handoff đã bấm gửi sang Local / trả về Web."
          : "Bấm vào tên dự án bên dưới để điền nhanh vào form ghép đôi.";
    }
  }

  elTabCatalog.addEventListener("click", () => activateBottomTab("catalog"));
  elTabRemote.addEventListener("click", () => activateBottomTab("remote"));
  elTabJobs.addEventListener("click", () => activateBottomTab("jobs"));

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (
      changes[STORAGE_KEYS.mappings] ||
      changes[STORAGE_KEYS.searchIndex] ||
      changes[STORAGE_KEYS.localCatalog] ||
      changes[STORAGE_KEYS.remoteCatalog] ||
      changes[STORAGE_KEYS.jobs]
    ) {
      loadAllData();
    }
  });

  loadAllData().then(() => scanOpenAgyTabs(false));
})();
