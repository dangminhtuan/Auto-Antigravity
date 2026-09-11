/**
 * rules.js — Shared ruleset for classifying AGY approval prompts.
 * Exposed as window.AGY_RULES so content.js can use it.
 *
 * Classification priority (highest to lowest):
 *   1. DANGEROUS_PATTERNS  → "dangerous"
 *   2. SAFE_PATTERNS       → "safe"
 *   3. (no match)          → "dangerous" (fail-safe default)
 */

window.AGY_RULES = (() => {
  // ──────────────────────────────────────────────
  // DANGEROUS: keywords/patterns that indicate
  // destructive, irreversible, or production-level actions.
  // ──────────────────────────────────────────────
  const DANGEROUS_KEYWORDS = [
    // File destruction
    "rm -rf", "rm -r", "del /f", "del /s", "rmdir /s",
    "shred", "truncate", "format",
    // Database
    "drop table", "drop database", "delete from", "truncate table",
    // Git risky ops
    "git push", "git reset --hard", "git clean -fd", "git force",
    "force-push", "--force",
    // Deployment / publish
    "npm publish", "yarn publish", "pnpm publish",
    "wrangler pages deploy", "wrangler deploy",
    "firebase deploy", "vercel deploy", "netlify deploy",
    "kubectl apply", "kubectl delete", "helm upgrade", "helm install",
    "terraform apply", "terraform destroy",
    // Sensitive write ops
    "write_to_file", "replace_file_content", "overwrite",
    // Network / secrets
    "curl -X DELETE", "curl -X PUT", "fetch.*DELETE",
    "password", "secret", "api_key", "token",
  ];

  // ──────────────────────────────────────────────
  // SAFE: keywords that strongly indicate read-only
  // or low-risk operations.
  // ──────────────────────────────────────────────
  const SAFE_KEYWORDS = [
    "view_file", "read_file", "list_dir", "list_files",
    "grep_search", "find_by_name", "search_web", "read_url_content",
    "cargo check", "cargo test", "npm test", "jest", "pytest",
    "git status", "git log", "git diff", "git show",
    "echo ", "print(", "console.log",
    "ls ", "dir ", "cat ", "head ", "tail ", "less ", "more ",
    "which ", "where ", "type ",
    "select-string", "get-childitem", "get-content", "get-command",
    "allow searching",
    "ping ", "curl -G", "curl --get",
  ];

  /**
   * Classify a prompt text.
   * @param {string} text - The full text of the approval prompt
   * @returns {"safe"|"dangerous"}
   */
  function classify(text) {
    const lower = text.toLowerCase();

    // Check dangerous first (higher priority)
    for (const kw of DANGEROUS_KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) {
        return "dangerous";
      }
    }

    // Check safe
    for (const kw of SAFE_KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) {
        return "safe";
      }
    }

    // Default: treat unknown as dangerous (fail-safe)
    return "dangerous";
  }

  return { classify, DANGEROUS_KEYWORDS, SAFE_KEYWORDS };
})();
