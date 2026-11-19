// Shared pure logic for AGY Auto-Approve v2.0.0:
// Handoff parser, target resolution, Smart Search engine, and mapping import validator.
// Works in browser content scripts, extension pages, and Node.js unit tests.

(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (root && typeof root === "object") {
    root.AGY_HANDOFF_CORE = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const HANDOFF_START_MARKER = "===AGY_HANDOFF_START===";
  const HANDOFF_END_MARKER = "===AGY_HANDOFF_END===";
  const RESULT_START_MARKER = "===AGY_RESULT_START===";
  const RESULT_END_MARKER = "===AGY_RESULT_END===";

  function normalizeSearchText(str) {
    return String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u0111\u0110]/g, "d")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function extractRemoteContextFromUrl(url, title) {
    const rawUrl = String(url || "").trim();
    const rawTitle = String(title || "").trim();
    let workspaceId = "";
    let projectId = "";
    let cascadeId = "";
    let isRemote = false;
    let isUnifiedShell = false;

    function parseNestedPParam(rawP) {
      if (!rawP) return;
      let decoded = String(rawP);
      try {
        decoded = decodeURIComponent(decoded);
      } catch (_) {}
      const pChatMatch = decoded.match(/(?:^|\/)c\/([a-zA-Z0-9_-]{8,})/i);
      if (pChatMatch && !cascadeId) {
        cascadeId = pChatMatch[1];
      }
      const pProjMatch = decoded.match(/[?&]project=([^&#]+)/i);
      if (pProjMatch && !projectId) {
        try {
          projectId = decodeURIComponent(pProjMatch[1]);
        } catch (_) {
          projectId = pProjMatch[1];
        }
      }
    }

    if (rawUrl) {
      try {
        const parsed = new URL(rawUrl);
        const path = parsed.pathname || "";
        const remoteMatch = path.match(/\/remote\/([a-zA-Z0-9_-]{8,})/i);
        const shellMatch = path.match(/\/r\/([a-zA-Z0-9_-]{8,})/i);
        const chatMatch = path.match(/\/(?:c|chat)\/([a-zA-Z0-9_-]{8,})/i);
        if (remoteMatch) {
          workspaceId = remoteMatch[1];
          isRemote = true;
        } else if (shellMatch) {
          workspaceId = shellMatch[1];
          isUnifiedShell = true;
        }
        if (chatMatch) {
          cascadeId = chatMatch[1];
        }
        projectId = parsed.searchParams.get("project") || "";
        const pParam = parsed.searchParams.get("p") || "";
        parseNestedPParam(pParam);
        if (!isRemote && /\/remote\//i.test(path)) {
          isRemote = true;
        }
        if (!isUnifiedShell && /\/r\//i.test(path)) {
          isUnifiedShell = true;
        }
      } catch (_) {
        const remoteMatch = rawUrl.match(/\/remote\/([a-zA-Z0-9_-]{8,})/i);
        const shellMatch = rawUrl.match(/\/r\/([a-zA-Z0-9_-]{8,})/i);
        if (remoteMatch) {
          workspaceId = remoteMatch[1];
          isRemote = true;
        } else if (shellMatch) {
          workspaceId = shellMatch[1];
          isUnifiedShell = true;
        }
        const chatMatch = rawUrl.match(/\/(?:c|chat)\/([a-zA-Z0-9_-]{8,})/i);
        if (chatMatch) {
          cascadeId = chatMatch[1];
        }
        const projMatch = rawUrl.match(/[?&]project=([^&#]+)/i);
        if (projMatch) {
          try {
            projectId = decodeURIComponent(projMatch[1]);
          } catch (e) {
            projectId = projMatch[1];
          }
        }
        const rawPMatch = rawUrl.match(/[?&]p=([^&#]+)/i);
        if (rawPMatch) {
          parseNestedPParam(rawPMatch[1]);
        }
      }
    }

    return {
      url: rawUrl,
      title: rawTitle,
      workspaceId: workspaceId,
      projectId: projectId,
      cascadeId: cascadeId,
      isRemote: isRemote,
      isUnifiedShell: isUnifiedShell,
      suggestedMatch: projectId || workspaceId || cascadeId || rawUrl
    };
  }

  function parseHandoffBlock(rawText) {
    const text = String(rawText || "");
    const startIdx = text.indexOf(HANDOFF_START_MARKER);
    if (startIdx === -1) {
      return { found: false, complete: false };
    }

    const afterStart = text.slice(startIdx + HANDOFF_START_MARKER.length);
    const endRelIdx = afterStart.indexOf(HANDOFF_END_MARKER);
    const complete = endRelIdx !== -1;
    const inner = complete ? afterStart.slice(0, endRelIdx) : afterStart;
    const rawBlock = complete
      ? text.slice(startIdx, startIdx + HANDOFF_START_MARKER.length + endRelIdx + HANDOFF_END_MARKER.length)
      : text.slice(startIdx);

    const lines = inner.replace(/\r\n/g, "\n").split("\n");
    let section = "header";
    let id = "";
    let targetProject = "";
    let actionSummary = "";
    const promptLines = [];
    const returnSpecLines = [];
    const extraMeta = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed === "---PROMPT---") {
        section = "prompt";
        continue;
      }
      if (trimmed === "---RETURN_SPEC---") {
        section = "return_spec";
        continue;
      }

      if (section === "header") {
        if (!trimmed) continue;
        const kvMatch = line.match(/^\s*([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
        if (kvMatch) {
          const key = kvMatch[1].toLowerCase();
          const val = kvMatch[2].trim();
          if (key === "id") {
            id = val;
          } else if (key === "target_project" || key === "target") {
            targetProject = val;
          } else if (key === "action_summary" || key === "summary") {
            actionSummary = val;
          } else {
            extraMeta[key] = val;
          }
        }
      } else if (section === "prompt") {
        promptLines.push(line);
      } else if (section === "return_spec") {
        returnSpecLines.push(line);
      }
    }

    const prompt = promptLines.join("\n").trim();
    const returnSpec = returnSpecLines.join("\n").trim();

    return {
      found: true,
      complete: complete,
      id: id,
      targetProject: targetProject || "current",
      actionSummary: actionSummary,
      prompt: prompt,
      returnSpec: returnSpec,
      extraMeta: extraMeta,
      rawBlock: rawBlock.trim()
    };
  }

  function parseResultBlock(rawText) {
    const text = String(rawText || "");
    const startIdx = text.indexOf(RESULT_START_MARKER);
    if (startIdx === -1) {
      return { found: false, complete: false };
    }

    const afterStart = text.slice(startIdx + RESULT_START_MARKER.length);
    const endRelIdx = afterStart.indexOf(RESULT_END_MARKER);
    const complete = endRelIdx !== -1;
    const inner = complete ? afterStart.slice(0, endRelIdx) : afterStart;
    const rawBlock = complete
      ? text.slice(startIdx, startIdx + RESULT_START_MARKER.length + endRelIdx + RESULT_END_MARKER.length)
      : text.slice(startIdx);

    const lines = inner.replace(/\r\n/g, "\n").split("\n");
    let section = "header";
    let id = "";
    let status = "";
    let summary = "";
    const bodyLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (section === "header" && (trimmed === "---RESULT---" || trimmed === "---BODY---" || trimmed === "---OUTPUT---")) {
        section = "body";
        continue;
      }

      if (section === "header") {
        if (!trimmed) {
          if (id || status || summary) {
            section = "body";
          }
          continue;
        }
        const kvMatch = line.match(/^\s*([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
        if (kvMatch) {
          const key = kvMatch[1].toLowerCase();
          const val = kvMatch[2].trim();
          if (key === "id") {
            id = val;
            continue;
          }
          if (key === "status") {
            status = val;
            continue;
          }
          if (key === "summary" || key === "action_summary") {
            summary = val;
            continue;
          }
          if (key === "result" || key === "body" || key === "output") {
            section = "body";
            if (val) bodyLines.push(val);
            continue;
          }
        }
        section = "body";
        bodyLines.push(line);
      } else {
        bodyLines.push(line);
      }
    }

    return {
      found: true,
      complete: complete,
      id: id,
      status: status || "done",
      summary: summary,
      body: bodyLines.join("\n").trim(),
      rawBlock: rawBlock.trim()
    };
  }

  function isGenericTargetProject(targetProject) {
    const norm = normalizeSearchText(targetProject);
    return !norm || norm === "current" || norm === "any" || norm === "auto" || norm === "default";
  }

  function buildTargetResult(matchedBy, mapping) {
    if (!mapping) {
      return {
        matchedBy: matchedBy,
        mapping: null,
        targetLocalProject: "",
        targetCascadeId: ""
      };
    }
    return {
      matchedBy: matchedBy,
      mapping: mapping,
      targetLocalProject: String(mapping.localProject || "").trim(),
      targetCascadeId: String(mapping.localCascadeId || "").trim()
    };
  }

  function resolveTargetMapping(handoffMeta, remoteCtx, mappings, catalog) {
    const list = Array.isArray(mappings) ? mappings.filter(Boolean) : [];
    const targetRaw = typeof handoffMeta === "string"
      ? handoffMeta
      : (handoffMeta && handoffMeta.targetProject) || "";
    const targetNorm = normalizeSearchText(targetRaw);

    // Priority 1: Explicit non-generic target_project matches alias in Setting
    if (!isGenericTargetProject(targetRaw)) {
      const exactAlias = list.find((m) => String(m.alias || "").trim().toLowerCase() === String(targetRaw).trim().toLowerCase());
      if (exactAlias) {
        return buildTargetResult("alias", exactAlias);
      }
      const normAlias = list.find((m) => normalizeSearchText(m.alias) === targetNorm);
      if (normAlias) {
        return buildTargetResult("alias", normAlias);
      }
    }

    // Priority 2: Match remoteMatch against active Web Remote tab context
    const ctx = remoteCtx || {};
    const urlStr = String(ctx.url || "").toLowerCase();
    const urlInfo = extractRemoteContextFromUrl(ctx.url || "", ctx.title || "");
    const titleNorm = normalizeSearchText(ctx.title || "");
    const projectLabelNorm = normalizeSearchText(ctx.projectLabel || "");
    const workspaceIdLower = String(ctx.workspaceId || urlInfo.workspaceId || "").toLowerCase();
    const projectIdLower = String(ctx.projectId || urlInfo.projectId || "").toLowerCase();

    let bestRemoteMatch = null;
    let bestScore = 0;

    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      const needleRaw = String(m.remoteMatch || "").trim();
      if (!needleRaw) continue;

      const needleLower = needleRaw.toLowerCase();
      const needleNorm = normalizeSearchText(needleRaw);
      let score = 0;

      if (workspaceIdLower && needleLower === workspaceIdLower) {
        score = 1000 + needleLower.length;
      } else if (projectIdLower && needleLower === projectIdLower) {
        score = 950 + needleLower.length;
      } else if (urlStr && needleLower.length >= 4 && urlStr.indexOf(needleLower) !== -1) {
        score = 800 + needleLower.length;
      } else if (projectLabelNorm && needleNorm && (projectLabelNorm === needleNorm || projectLabelNorm.indexOf(needleNorm) !== -1)) {
        score = 600 + needleNorm.length + (projectLabelNorm === needleNorm ? 100 : 0);
      } else if (titleNorm && needleNorm && titleNorm.indexOf(needleNorm) !== -1) {
        score = 400 + needleNorm.length;
      }

      if (score > 0 && m.isDefault) {
        score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestRemoteMatch = m;
      }
    }

    if (bestRemoteMatch) {
      return buildTargetResult("remote_match", bestRemoteMatch);
    }

    // Priority 3: Fallback to isDefault mapping
    const defaultMapping = list.find((m) => Boolean(m.isDefault));
    if (defaultMapping) {
      return buildTargetResult("default", defaultMapping);
    }

    // Optional hint from local catalog if alias matches a known project directly (still marked unmatched in settings)
    const result = buildTargetResult("unmatched", null);
    if (!isGenericTargetProject(targetRaw) && Array.isArray(catalog)) {
      const directProj = catalog.find((c) => normalizeSearchText(c.projectLabel || c.title) === targetNorm);
      if (directProj) {
        result.suggestedLocalProject = directProj.projectLabel || directProj.title || "";
      }
    }
    return result;
  }

  function formatOutgoingHandoffPrompt(handoff, options) {
    const h = handoff || {};
    const opts = options || {};
    const id = String(h.id || opts.id || "").trim() || ("handoff-" + Date.now());
    const summary = String(h.actionSummary || "").trim();
    const promptBody = String(h.prompt || "").trim();
    const returnSpec = String(h.returnSpec || "").trim();

    const parts = [];
    parts.push("[AGY HANDOFF #" + id + "]" + (summary ? " " + summary : ""));
    if (promptBody) {
      parts.push("");
      parts.push(promptBody);
    }
    if (returnSpec) {
      parts.push("");
      parts.push("---RETURN_SPEC---");
      parts.push(returnSpec);
    }
    parts.push("");
    parts.push("Khi hoan tat, hay dat phan tra loi trong dung block sau (giu nguyen id):");
    parts.push(RESULT_START_MARKER);
    parts.push("id: " + id);
    parts.push("status: done");
    parts.push("---RESULT---");
    parts.push(returnSpec ? "<ket qua theo dung RETURN_SPEC>" : "<ket qua tom tat>");
    parts.push(RESULT_END_MARKER);
    return parts.join("\n");
  }

  function parseRegexQuery(rawQuery, forceRegex) {
    const trimmed = String(rawQuery || "").trim();
    if (!trimmed) return { isRegex: false, regex: null, error: null };

    const slashMatch = trimmed.match(/^\/(.+)\/([gimsuy]*)$/);
    if (slashMatch) {
      try {
        const flags = slashMatch[2].indexOf("i") !== -1 ? slashMatch[2] : slashMatch[2] + "i";
        return { isRegex: true, regex: new RegExp(slashMatch[1], flags.replace(/g/g, "")), error: null };
      } catch (err) {
        return { isRegex: true, regex: null, error: err.message || "Regex khong hop le" };
      }
    }

    if (forceRegex) {
      try {
        return { isRegex: true, regex: new RegExp(trimmed, "i"), error: null };
      } catch (err) {
        return { isRegex: true, regex: null, error: err.message || "Regex khong hop le" };
      }
    }

    return { isRegex: false, regex: null, error: null };
  }

  function searchCatalogItems(items, query, options) {
    const list = Array.isArray(items) ? items : [];
    const opts = options || {};
    const scope = opts.scope || "all"; // "all" | "projects" | "conversations" | "active"
    const projectFilterNorm = normalizeSearchText(opts.projectFilter || "");
    const rawQuery = String(query || "").trim();
    const regexState = parseRegexQuery(rawQuery, Boolean(opts.useRegex));

    if (regexState.error) {
      return { items: [], regexError: regexState.error, isRegex: true };
    }

    const queryNorm = normalizeSearchText(rawQuery);
    const tokens = !regexState.isRegex && queryNorm ? queryNorm.split(" ").filter(Boolean) : [];
    const scored = [];

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (!item) continue;

      const isProject = Boolean(item.isProjectHeader || item.kind === "project");
      const isActive = Boolean(item.isRunning || item.isAttention || item.hasStopBtn || item.hasLoadingSpinner);

      if (scope === "projects" && !isProject) continue;
      if (scope === "conversations" && isProject) continue;
      if (scope === "active" && !isActive) continue;

      const projStr = String(item.projectLabel || item.subtext || (isProject ? item.title : "") || "");
      const titleStr = String(item.title || "");
      const cascadeStr = String(item.cascadeId || "");

      if (projectFilterNorm && normalizeSearchText(projStr) !== projectFilterNorm) {
        continue;
      }

      let score = 0;
      if (regexState.isRegex && regexState.regex) {
        const rx = regexState.regex;
        const matchedTitle = rx.test(titleStr);
        const matchedProj = rx.test(projStr);
        const matchedId = cascadeStr ? rx.test(cascadeStr) : false;
        if (!matchedTitle && !matchedProj && !matchedId) continue;
        score = (matchedTitle ? 120 : 0) + (matchedProj ? 95 : 0) + (matchedId ? 40 : 0);
        if (isProject) score += 35;
      } else if (tokens.length > 0) {
        const titleNorm = normalizeSearchText(titleStr);
        const projNorm = normalizeSearchText(projStr);
        const idNorm = normalizeSearchText(cascadeStr);
        const combined = (projNorm + " " + titleNorm + " " + idNorm).trim();

        let allTokensMatch = true;
        for (let t = 0; t < tokens.length; t++) {
          if (combined.indexOf(tokens[t]) === -1) {
            allTokensMatch = false;
            break;
          }
        }
        if (!allTokensMatch) continue;

        const wordBoundaryMatch = (text, q) => {
          if (!text || !q) return false;
          const parts = text.split(/[\s_\-/.,:()]+/).filter(Boolean);
          return parts.some((w) => w === q || w.indexOf(q) === 0);
        };

        if (titleNorm === queryNorm || projNorm === queryNorm) {
          score += 320;
        } else if (titleNorm.indexOf(queryNorm) === 0 || projNorm.indexOf(queryNorm) === 0) {
          score += 240;
        } else if (wordBoundaryMatch(projNorm, queryNorm) || wordBoundaryMatch(titleNorm, queryNorm)) {
          score += 210;
        } else if (titleNorm.indexOf(queryNorm) !== -1 || projNorm.indexOf(queryNorm) !== -1) {
          score += 120;
        } else {
          score += 65;
        }

        if (isProject && projNorm.indexOf(queryNorm) !== -1) {
          score += 55;
        } else if (isProject) {
          score += 20;
        }
      } else {
        score = isProject ? 80 : 50;
      }

      if (item.isAttention) score += 45;
      if (item.isRunning) score += 35;
      if (item.isSelected) score += 20;

      scored.push({
        item: item,
        score: score,
        updatedAt: Number(item.updatedAt || 0)
      });
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.updatedAt - a.updatedAt;
    });

    const limit = Number(opts.limit || 0);
    const out = scored.map((entry) => entry.item);
    return {
      items: limit > 0 ? out.slice(0, limit) : out,
      regexError: null,
      isRegex: regexState.isRegex
    };
  }

  function validateMappingsImport(rawInput) {
    let parsed = rawInput;
    if (typeof rawInput === "string") {
      try {
        parsed = JSON.parse(rawInput);
      } catch (err) {
        return { ok: false, error: "JSON khong hop le: " + (err.message || err), mappings: [] };
      }
    }

    let rawList = null;
    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.mappings)) {
      rawList = parsed.mappings;
    } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.agy_project_mappings)) {
      rawList = parsed.agy_project_mappings;
    }

    if (!Array.isArray(rawList)) {
      return { ok: false, error: "Cau truc JSON phai la mang [] hoac { mappings: [] }.", mappings: [] };
    }

    const clean = [];
    let defaultAssigned = false;

    for (let i = 0; i < rawList.length; i++) {
      const row = rawList[i];
      if (!row || typeof row !== "object") continue;

      const alias = String(row.alias || "").trim();
      const remoteMatch = String(row.remoteMatch || "").trim();
      const localProject = String(row.localProject || "").trim();
      const localCascadeId = String(row.localCascadeId || "").trim();

      if (!alias && !remoteMatch && !localProject) {
        continue;
      }

      let isDefault = Boolean(row.isDefault);
      if (isDefault && defaultAssigned) {
        isDefault = false;
      } else if (isDefault) {
        defaultAssigned = true;
      }

      // Strictly whitelist schema keys (never retain tokens/passwords/secrets)
      clean.push({
        id: String(row.id || ("map_" + (i + 1) + "_" + Math.random().toString(36).slice(2, 7))),
        alias: alias,
        remoteMatch: remoteMatch,
        localProject: localProject,
        localCascadeId: localCascadeId,
        isDefault: isDefault,
        updatedAt: Number(row.updatedAt || Date.now())
      });
    }

    return { ok: true, error: null, mappings: clean };
  }

  return {
    HANDOFF_START_MARKER: HANDOFF_START_MARKER,
    HANDOFF_END_MARKER: HANDOFF_END_MARKER,
    RESULT_START_MARKER: RESULT_START_MARKER,
    RESULT_END_MARKER: RESULT_END_MARKER,
    normalizeSearchText: normalizeSearchText,
    extractRemoteContextFromUrl: extractRemoteContextFromUrl,
    parseHandoffBlock: parseHandoffBlock,
    parseResultBlock: parseResultBlock,
    isGenericTargetProject: isGenericTargetProject,
    resolveTargetMapping: resolveTargetMapping,
    formatOutgoingHandoffPrompt: formatOutgoingHandoffPrompt,
    searchCatalogItems: searchCatalogItems,
    validateMappingsImport: validateMappingsImport
  };
});
