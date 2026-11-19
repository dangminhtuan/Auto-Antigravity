(function () {
  "use strict";

  const CORE = window.AGY_HANDOFF_CORE;
  const STORAGE_KEYS = {
    mappings: "agy_project_mappings",
    searchIndex: "agy_search_index",
    localCatalog: "agy_local_catalog",
    jobs: "agy_handoff_jobs",
    lastRemoteCtx: "agy_last_remote_context"
  };

  let mappings = [];
  let catalogItems = [];
  let jobs = [];

  const elBanner = document.getElementById("status-banner");
  const elFormTitle = document.getElementById("form-title");
  const elEditId = document.getElementById("inp-edit-id");
  const elAlias = document.getElementById("inp-alias");
  const elRemoteMatch = document.getElementById("inp-remote-match");
  const elRemotePreview = document.getElementById("remote-grab-preview");
  const elLocalSelect = document.getElementById("sel-local-catalog");
  const elLocalProject = document.getElementById("inp-local-project");
  const elLocalCascade = document.getElementById("inp-local-cascade");
  const elIsDefault = document.getElementById("chk-is-default");
  const elBtnSave = document.getElementById("btn-save-mapping");
  const elBtnReset = document.getElementById("btn-reset-form");
  const elBtnGrabRemote = document.getElementById("btn-grab-remote");
  const elBtnRefreshCatalog = document.getElementById("btn-refresh-catalog");
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
  const elTabJobs = document.getElementById("tab-btn-jobs");
  const elPaneCatalog = document.getElementById("pane-catalog");
  const elPaneJobs = document.getElementById("pane-jobs");
  const elCatalogProjCount = document.getElementById("catalog-proj-count");
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

  function populateCatalogSelect() {
    const projects = getMergedCatalogProjects();
    elLocalSelect.innerHTML = '<option value="">-- Chọn từ danh sách dự án Local đã phát hiện (hoặc nhập tay dưới) --</option>';

    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      const optProj = document.createElement("option");
      optProj.value = JSON.stringify({ project: p.projectLabel, cascadeId: "" });
      optProj.textContent = "📁 " + p.projectLabel + " (" + p.conversations.length + " đoạn chat)";
      elLocalSelect.appendChild(optProj);

      const recentChats = p.conversations.slice(0, 6);
      for (let j = 0; j < recentChats.length; j++) {
        const c = recentChats[j];
        const optChat = document.createElement("option");
        optChat.value = JSON.stringify({ project: p.projectLabel, cascadeId: c.cascadeId });
        optChat.textContent = "   ↳ 💬 " + (c.title || c.cascadeId) + " [" + p.projectLabel + "]";
        elLocalSelect.appendChild(optChat);
      }
    }

    elCatalogStat.textContent = "Catalog: " + projects.length + " dự án / " + catalogItems.length + " mục";
    elCatalogProjCount.textContent = String(projects.length);
  }

  function renderCatalogPane() {
    const projects = getMergedCatalogProjects();
    if (!projects.length) {
      elPaneCatalog.innerHTML = '<div class="empty-state">Chưa quét được dự án Local nào. Hãy mở tab Antigravity Local (hoặc bấm "🔄 Quét đủ" trong Smart Search), extension sẽ tự đồng bộ danh sách sang đây.</div>';
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "catalog-chip-grid";
    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "catalog-chip";
      chip.textContent = "📁 " + p.projectLabel + " (" + p.conversations.length + ")";
      chip.title = "Bấm để điền nhanh vào ô Dự án Local đích";
      chip.addEventListener("click", () => {
        elLocalProject.value = p.projectLabel;
        if (!elAlias.value.trim()) {
          elAlias.value = p.projectLabel.toLowerCase().replace(/[^a-z0-9/_-]+/g, "-").replace(/^-|-$/g, "");
        }
        showBanner("Đã điền dự án Local: " + p.projectLabel, "info");
      });
      wrap.appendChild(chip);
    }
    elPaneCatalog.innerHTML = "";
    elPaneCatalog.appendChild(wrap);
  }

  function renderJobsPane() {
    const jobEntries = Object.values(jobs && typeof jobs === "object" ? jobs : {})
      .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))
      .slice(0, 30);

    elJobsCount.textContent = String(jobEntries.length);
    if (!jobEntries.length) {
      elPaneJobs.innerHTML = '<div class="empty-state">Chưa có lịch sử Handoff nào trong phiên gần đây.</div>';
      return;
    }

    elPaneJobs.innerHTML = "";
    for (let i = 0; i < jobEntries.length; i++) {
      const j = jobEntries[i];
      const row = document.createElement("div");
      row.className = "job-row";
      const time = j.updatedAt ? new Date(j.updatedAt).toLocaleString("vi-VN") : "";
      row.innerHTML =
        '<div><strong>#' + escapeHtml(j.id) + "</strong> — " + escapeHtml(j.targetLocalProject || "(chưa rõ)") +
        (j.actionSummary ? ' <span class="muted">(' + escapeHtml(j.actionSummary) + ")</span>" : "") + "</div>" +
        '<div class="pill">' + escapeHtml(j.status || "unknown") + (time ? " · " + escapeHtml(time) : "") + "</div>";
      elPaneJobs.appendChild(row);
    }
  }

  function renderMappingList() {
    elMappingCount.textContent = String(mappings.length);
    if (!mappings.length) {
      elMappingList.innerHTML = '<div class="empty-state">Chưa có cặp liên kết nào. Hãy dùng form bên trái hoặc bấm "📍 Lấy từ tab Remote hiện tại".</div>';
      return;
    }

    elMappingList.innerHTML = "";
    for (let i = 0; i < mappings.length; i++) {
      const m = mappings[i];
      const card = document.createElement("div");
      card.className = "mapping-card" + (m.isDefault ? " is-default" : "");

      const top = document.createElement("div");
      top.className = "mapping-top";

      const title = document.createElement("div");
      title.className = "mapping-alias";
      title.innerHTML =
        "<span>" + escapeHtml(m.alias || "(chưa đặt alias)") + "</span>" +
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
        '<div class="meta-cell"><span class="meta-label">Web Remote Match</span>' + escapeHtml(m.remoteMatch || "(chỉ khớp theo alias)") + "</div>" +
        '<div class="meta-cell"><span class="meta-label">AGY Local Đích</span>' + escapeHtml(m.localProject || "(chưa đặt)") +
        (m.localCascadeId ? '<br><small class="muted">Chat ID: ' + escapeHtml(m.localCascadeId.slice(0, 12)) + "…</small>" : "") + "</div>";

      card.appendChild(top);
      card.appendChild(meta);
      elMappingList.appendChild(card);
    }
  }

  function resetForm() {
    elEditId.value = "";
    elAlias.value = "";
    elRemoteMatch.value = "";
    elLocalSelect.value = "";
    elLocalProject.value = "";
    elLocalCascade.value = "";
    elIsDefault.checked = false;
    elFormTitle.textContent = "➕ Thêm cặp liên kết mới";
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
    elFormTitle.textContent = "✏️ Sửa cặp liên kết: " + (m.alias || m.localProject);
    elBtnSave.textContent = "💾 Cập nhật cặp liên kết";
    elBtnReset.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  async function saveMappingFromForm() {
    const alias = elAlias.value.trim();
    const remoteMatch = elRemoteMatch.value.trim();
    const localProject = elLocalProject.value.trim();
    const localCascadeId = elLocalCascade.value.trim();
    const isDefault = elIsDefault.checked;
    const editId = elEditId.value.trim();

    if (!alias && !remoteMatch) {
      showBanner("Vui lòng nhập ít nhất Alias hoặc Remote Match.", "err");
      return;
    }
    if (!localProject) {
      showBanner("Vui lòng chọn hoặc nhập tên Dự án Local đích.", "err");
      return;
    }

    const next = mappings.map((m) => ({
      ...m,
      isDefault: isDefault ? false : m.isDefault
    }));

    const record = {
      id: editId || ("map_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6)),
      alias: alias || localProject.toLowerCase().replace(/[^a-z0-9/_-]+/g, "-"),
      remoteMatch: remoteMatch,
      localProject: localProject,
      localCascadeId: localCascadeId,
      isDefault: isDefault,
      updatedAt: Date.now()
    };

    const idx = next.findIndex((m) => m.id === record.id);
    if (idx >= 0) {
      next[idx] = record;
    } else {
      next.unshift(record);
    }

    if (await persistMappings(next)) {
      showBanner((idx >= 0 ? "Đã cập nhật" : "Đã thêm") + " liên kết: " + record.alias + " -> " + record.localProject, "ok");
      resetForm();
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

  async function grabActiveRemoteTab() {
    elBtnGrabRemote.disabled = true;
    elBtnGrabRemote.textContent = "Đang dò tab...";
    try {
      const resp = await chrome.runtime.sendMessage({ type: "AGY_GET_ACTIVE_REMOTE_CONTEXT" });
      if (resp && resp.ok && resp.context) {
        const ctx = resp.context;
        const val = ctx.suggestedMatch || ctx.projectId || ctx.workspaceId || ctx.url || ctx.projectLabel || ctx.title;
        if (val) {
          elRemoteMatch.value = val;
          elRemotePreview.textContent = "Đã bắt được từ tab: " + (ctx.title || ctx.url || val);
          if (!elAlias.value.trim() && (ctx.projectLabel || ctx.title)) {
            const guess = (ctx.projectLabel || ctx.title).split(/[/|—-]/)[0].trim();
            if (guess) elAlias.value = guess;
          }
          showBanner("Đã tự điền remoteMatch từ tab Remote!", "ok");
        } else {
          showBanner("Tìm thấy tab Antigravity nhưng chưa trích được URL/Workspace ID.", "err");
        }
      } else {
        showBanner((resp && resp.error) || "Không tìm thấy tab Antigravity Remote nào đang mở.", "err");
      }
    } catch (err) {
      showBanner("Lỗi lấy thông tin tab Remote: " + (err && err.message ? err.message : err), "err");
    } finally {
      elBtnGrabRemote.disabled = false;
      elBtnGrabRemote.textContent = "📍 Lấy từ tab Remote hiện tại";
    }
  }

  function exportJson() {
    const payload = {
      version: "2.0.0",
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
      const combined = [...mappings, ...res.mappings];
      for (let i = 0; i < combined.length; i++) {
        const item = combined[i];
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
      STORAGE_KEYS.jobs
    ]);

    const rawMappings = Array.isArray(stored[STORAGE_KEYS.mappings]) ? stored[STORAGE_KEYS.mappings] : [];
    const validated = CORE.validateMappingsImport(rawMappings);
    mappings = validated.ok ? validated.mappings : [];

    const idxA = Array.isArray(stored[STORAGE_KEYS.searchIndex]) ? stored[STORAGE_KEYS.searchIndex] : [];
    const idxB = Array.isArray(stored[STORAGE_KEYS.localCatalog]) ? stored[STORAGE_KEYS.localCatalog] : [];
    const mergedMap = new Map();
    const all = [...idxA, ...idxB];
    for (let i = 0; i < all.length; i++) {
      const item = all[i];
      if (!item) continue;
      const key = item.cascadeId || ("proj:" + (item.projectLabel || item.title || i));
      if (!mergedMap.has(key)) mergedMap.set(key, item);
    }
    catalogItems = Array.from(mergedMap.values());
    jobs = stored[STORAGE_KEYS.jobs] || {};

    populateCatalogSelect();
    renderMappingList();
    renderCatalogPane();
    renderJobsPane();
  }

  elLocalSelect.addEventListener("change", () => {
    const val = elLocalSelect.value;
    if (!val) return;
    try {
      const parsed = JSON.parse(val);
      if (parsed.project) elLocalProject.value = parsed.project;
      elLocalCascade.value = parsed.cascadeId || "";
      if (!elAlias.value.trim() && parsed.project) {
        elAlias.value = parsed.project.toLowerCase().replace(/[^a-z0-9/_-]+/g, "-").replace(/^-|-$/g, "");
      }
    } catch (_) {}
  });

  elBtnSave.addEventListener("click", saveMappingFromForm);
  elBtnReset.addEventListener("click", resetForm);
  elBtnGrabRemote.addEventListener("click", grabActiveRemoteTab);
  elBtnRefreshCatalog.addEventListener("click", async () => {
    await loadAllData();
    showBanner("Đã làm mới danh sách dự án Local từ Catalog.", "info");
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

  elTabCatalog.addEventListener("click", () => {
    elTabCatalog.classList.add("active");
    elTabJobs.classList.remove("active");
    elPaneCatalog.classList.remove("hidden");
    elPaneJobs.classList.add("hidden");
  });
  elTabJobs.addEventListener("click", () => {
    elTabJobs.classList.add("active");
    elTabCatalog.classList.remove("active");
    elPaneJobs.classList.remove("hidden");
    elPaneCatalog.classList.add("hidden");
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (changes[STORAGE_KEYS.mappings] || changes[STORAGE_KEYS.searchIndex] || changes[STORAGE_KEYS.localCatalog] || changes[STORAGE_KEYS.jobs]) {
      loadAllData();
    }
  });

  loadAllData();
})();
