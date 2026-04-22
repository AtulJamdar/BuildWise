# rule_engine.py
# Orchestrates all file checks, isolates failures, deduplicates, fingerprints, and times each rule.

import hashlib
import logging
import time
from core import file_checks

logger = logging.getLogger(__name__)

# ── Rule registry ────────────────────────────────────────────────────────────
# Order matters: security checks run first so high-severity issues appear at top.
# Each entry: (function, rule_id, human_readable_name)
RULES = [
    (file_checks.check_api_keys,          "SEC001", "API key & secret detection"),
    (file_checks.check_entropy_strings,   "SEC002", "High-entropy string detection"),
    (file_checks.check_js_ast_secrets,    "SEC003", "JS AST secret detection"),
    (file_checks.check_readme,            "STR001", "Missing README"),
    (file_checks.check_large_files,       "PRF001", "Large file detection"),
    (file_checks.check_file_naming,       "STY001", "Bad file naming"),
    (file_checks.check_empty_folders,     "STR002", "Empty folder detection"),
    (file_checks.check_empty_files,       "STR003", "Empty file detection"),
    (file_checks.check_duplicate_files,   "RDN001", "Duplicate file detection"),
    (file_checks.check_repeated_code,     "RDN002", "Repeated code detection"),
    (file_checks.check_hardcoded_links,   "DEV001", "Hardcoded deployment links"),
    (file_checks.check_unused_files,      "RDN003", "Unused file detection"),
]

# ── Severity sort order ───────────────────────────────────────────────────────
SEVERITY_ORDER = {"HIGH": 0, "MEDIUM": 1, "LOW": 2, "INFO": 3}


def _make_fingerprint(issue: dict, rule_id: str) -> str:
    """
    Stable fingerprint for an issue — same file + line + rule always produces
    the same ID across scans. Used to track whether an issue was fixed.
    """
    raw = f"{rule_id}::{issue.get('file', '')}::{issue.get('line', '')}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _is_duplicate(issue: dict, seen: set) -> bool:
    """
    Deduplicates across rules: SEC002 (entropy) and SEC003 (JS AST) often flag
    the same line as SEC001 (api_keys). We key on file + line + type to suppress
    lower-confidence rules when a higher-confidence rule already caught it.
    """
    key = (issue.get("file"), issue.get("line"), issue.get("type"))
    if key in seen:
        return True
    seen.add(key)
    return False


def run_all_checks(path: str) -> dict:
    """
    Run every registered rule against `path`.

    Returns:
        {
            "issues":  list[dict],   # all issues, sorted by severity
            "summary": dict,         # counts by severity + per-rule timing
            "errors":  list[dict],   # rules that crashed (never kills the scan)
        }
    """
    all_issues: list[dict] = []
    errors: list[dict] = []
    timings: dict[str, float] = {}
    seen_keys: set = set()

    for fn, rule_id, rule_name in RULES:
        start = time.perf_counter()
        try:
            raw_issues = fn(path)
        except Exception as exc:
            # One bad rule must never stop the rest from running
            elapsed = time.perf_counter() - start
            logger.error("Rule %s (%s) failed after %.2fs: %s", rule_id, rule_name, elapsed, exc, exc_info=True)
            errors.append({
                "rule_id":   rule_id,
                "rule_name": rule_name,
                "error":     str(exc),
            })
            continue

        elapsed = time.perf_counter() - start
        timings[rule_id] = round(elapsed, 4)

        if elapsed > 5.0:
            logger.warning("Rule %s (%s) took %.2fs — consider optimising", rule_id, rule_name, elapsed)

        for issue in raw_issues:
            if _is_duplicate(issue, seen_keys):
                continue
            issue["rule_id"]     = rule_id
            issue["rule_name"]   = rule_name
            issue["fingerprint"] = _make_fingerprint(issue, rule_id)
            all_issues.append(issue)

    # Sort: HIGH first, then MEDIUM, LOW, INFO
    all_issues.sort(key=lambda i: SEVERITY_ORDER.get(i.get("severity", "INFO"), 99))

    summary = {
        "total":  len(all_issues),
        "HIGH":   sum(1 for i in all_issues if i.get("severity") == "HIGH"),
        "MEDIUM": sum(1 for i in all_issues if i.get("severity") == "MEDIUM"),
        "LOW":    sum(1 for i in all_issues if i.get("severity") == "LOW"),
        "by_rule": {
            rule_id: {
                "name":         rule_name,
                "issue_count":  sum(1 for i in all_issues if i.get("rule_id") == rule_id),
                "duration_s":   timings.get(rule_id, 0),
            }
            for _, rule_id, rule_name in RULES
        },
        "errors": len(errors),
    }

    return {
        "issues":  all_issues,
        "summary": summary,
        "errors":  errors,
    }