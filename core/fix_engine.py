# import os
# import re
# import ast
# import esprima
# import difflib


# def generate_fix(issue):
#     title = (issue.get("title") or "").lower()
#     code_raw = issue.get("code") or ""

#     if "api key" in title or "api key" in code_raw.lower():
#         return "const API_KEY = process.env.API_KEY"

#     if "console.log" in code_raw:
#         if "console.log" not in code_raw:
#             return code_raw

#     return code_raw

# ############################################################# I have chage here in appy_fix function I added 2 lines to check if the issue has code and if not it will raise an exception because we need the code to generate the fix. I also added a check to see if the lines variable is a list before trying to modify it. If it's not a list, we simply return it unchanged. This is to prevent errors in case the input is not in the expected format.

# def apply_fix(lines, line_no, new_code):
#     if not isinstance(lines, list):
#         return lines

#     if 1 <= line_no <= len(lines):
#         original_line = lines[line_no - 1]
#         indent = len(original_line) - len(original_line.lstrip())

#         lines[line_no - 1] = " " * indent + new_code.strip()

#     return lines


# def generate_diff(old_lines, new_lines):
#     diff = difflib.unified_diff(old_lines, new_lines, lineterm="")
#     return "\n".join(diff)


# def validate_code(content, path=None):
#     if not path:
#         return True

#     ext = os.path.splitext(path)[1].lower()
#     if ext == ".py":
#         try:
#             ast.parse(content)
#             return True
#         except SyntaxError:
#             return False

#     if ext in {".js", ".jsx"}:
#         try:
#             esprima.parseModule(content, tolerant=True)
#             return True
#         except Exception:
#             try:
#                 esprima.parseScript(content, tolerant=True)
#                 return True
#             except Exception:
#                 return False

#     # For other file types we do not validate syntax here.
#     return True




import os
import re
import ast
import difflib
import textwrap
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)

# ── Language detection ────────────────────────────────────────────────────────

class Language(str, Enum):
    PYTHON     = "python"
    JAVASCRIPT = "javascript"
    JSX        = "jsx"
    TYPESCRIPT = "typescript"
    TSX        = "tsx"
    GO         = "go"
    RUBY       = "ruby"
    JAVA       = "java"
    UNKNOWN    = "unknown"

EXT_TO_LANGUAGE: dict[str, Language] = {
    ".py":   Language.PYTHON,
    ".js":   Language.JAVASCRIPT,
    ".jsx":  Language.JSX,
    ".ts":   Language.TYPESCRIPT,
    ".tsx":  Language.TSX,
    ".go":   Language.GO,
    ".rb":   Language.RUBY,
    ".java": Language.JAVA,
}

def detect_language(path: str) -> Language:
    """Detect language from file extension. Returns UNKNOWN for unrecognized types."""
    ext = os.path.splitext(path)[1].lower()
    return EXT_TO_LANGUAGE.get(ext, Language.UNKNOWN)


# ── Result types ──────────────────────────────────────────────────────────────

@dataclass
class FixResult:
    """
    Structured result from the fix pipeline.

    success=True  → fix was applied and passed validation.
    success=False → validation failed; fixed_code is still returned so the caller
                    can present a "preview with warning" UX instead of a hard error.
    """
    success:        bool
    fixed_code:     str                    # The patched file content (always present)
    diff:           str                    # Unified diff (always present)
    language:       Language               # Detected language
    validation_ok:  bool                   # Explicit validation flag separate from success
    warning:        Optional[str] = None   # Human-readable explanation when success=False
    fix_preview:    Optional[str] = None   # The single replacement line, for UI display


# ── Fix templates per language ────────────────────────────────────────────────
#
# Why a dispatch table instead of if/elif chains?
# Adding a new language = one dict entry. No risk of accidentally falling through
# to a wrong branch. The caller (generate_fix) stays clean.

def _env_fix_python(var: str) -> str:
    return f'os.environ.get("{var}")'

def _env_fix_js(var: str) -> str:
    return f"process.env.{var}"

def _env_fix_go(var: str) -> str:
    return f'os.Getenv("{var}")'

def _env_fix_ruby(var: str) -> str:
    return f'ENV["{var}"]'

def _env_fix_java(var: str) -> str:
    return f'System.getenv("{var}")'

ENV_FIX_BY_LANGUAGE: dict[Language, callable] = {
    Language.PYTHON:     _env_fix_python,
    Language.JAVASCRIPT: _env_fix_js,
    Language.JSX:        _env_fix_js,
    Language.TYPESCRIPT: _env_fix_js,
    Language.TSX:        _env_fix_js,
    Language.GO:         _env_fix_go,
    Language.RUBY:       _env_fix_ruby,
    Language.JAVA:       _env_fix_java,
}

# Pattern to extract the variable name from a line like:
#   API_KEY = "abc123"   →  API_KEY
#   const apiKey = "..."  →  apiKey / API_KEY (normalised)
_ASSIGNMENT_VAR_RE = re.compile(
    r'(?:const|let|var|val)?\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:[:=]|:=)',
    re.IGNORECASE
)

def _extract_var_name(line: str) -> str:
    """Pull the LHS variable name from an assignment line, or fall back to API_KEY."""
    m = _ASSIGNMENT_VAR_RE.search(line)
    if m:
        name = m.group(1).strip()
        # Normalise to upper_snake for env var names
        name = re.sub(r'([a-z])([A-Z])', r'\1_\2', name).upper()
        return name
    return "API_KEY"


def generate_fix(issue: dict, file_path: str) -> str:
    """
    Generate a language-appropriate fix snippet for a single issue.

    Args:
        issue:     The issue dict (must contain at least 'title' and 'code').
        file_path: Full or relative path to the file being fixed.
                   Used for language detection — this is what was missing before.

    Returns:
        A replacement code string (one logical line/statement).
        Returns the original code unchanged when no fix template applies,
        rather than returning garbage.
    """
    title    = (issue.get("title") or "").lower()
    code_raw = (issue.get("code")  or "").strip()
    lang     = detect_language(file_path)

    # ── Fix: API key / secret exposed ────────────────────────────────────────
    if "api key" in title or "secret" in title or "api_key" in code_raw.lower():
        var_name   = _extract_var_name(code_raw)
        env_getter = ENV_FIX_BY_LANGUAGE.get(lang)

        if env_getter:
            return env_getter(var_name)
        else:
            # Unknown language: emit a comment directing the developer rather than
            # injecting wrong-language syntax that will fail validation.
            return f"# TODO: replace hardcoded value with environment variable {var_name}"

    # ── Fix: debug logging left in production ────────────────────────────────
    # Previously this branch had a tautological condition (always False).
    # Correct logic: if the line IS a console.log, replace it with nothing (remove it).
    if lang in (Language.JAVASCRIPT, Language.JSX, Language.TYPESCRIPT, Language.TSX):
        if "console.log" in code_raw:
            return ""   # Empty string = the apply_fix caller will delete the line

    if lang == Language.PYTHON:
        if re.search(r'\bprint\s*\(', code_raw):
            return ""   # Remove bare debug prints

    # ── No fix template available: return original unchanged ─────────────────
    # This is better than returning broken code. The caller will see that
    # fix_preview == original and can skip applying anything.
    return code_raw


# ── Indentation helpers ───────────────────────────────────────────────────────

def _detect_indent_char(lines: list[str]) -> str:
    """
    Detect whether the file uses tabs or spaces for indentation.
    Checks the first 50 non-empty lines; majority wins, default to 4 spaces.
    """
    tab_count   = 0
    space_count = 0
    for line in lines[:50]:
        if line.startswith("\t"):
            tab_count += 1
        elif line.startswith("    ") or line.startswith("  "):
            space_count += 1
    return "\t" if tab_count > space_count else "    "

def _extract_indent(line: str) -> str:
    """
    Extract the raw leading whitespace from a line (preserves tabs vs spaces).
    Unlike the original (which only counted spaces), this keeps whatever
    character the file actually uses.
    """
    return line[: len(line) - len(line.lstrip())]


def apply_fix(lines: list[str], line_no: int, new_code: str) -> list[str]:
    """
    Apply a single-line replacement to a file represented as a list of strings.

    Improvements over the original:
    - Explicit ValueError on out-of-bounds instead of silent no-op.
    - Preserves raw indent (tabs or spaces) from the original line.
    - Handles empty new_code (line deletion) explicitly.
    - Handles multi-line new_code (e.g. a multi-line JSX replacement) by
      splitting on newlines and inserting all lines at the right position.
    - Uses textwrap.dedent on the new code before re-indenting, so a fix
      snippet that arrives with its own leading whitespace doesn't double-indent.
    """
    if not isinstance(lines, list):
        raise TypeError(f"apply_fix: expected list[str], got {type(lines).__name__}")

    if not (1 <= line_no <= len(lines)):
        raise ValueError(
            f"apply_fix: line_no {line_no} is out of range for file with {len(lines)} lines"
        )

    original_line = lines[line_no - 1]
    raw_indent    = _extract_indent(original_line)

    # Deletion: empty new_code means remove the line entirely
    if new_code == "":
        return lines[: line_no - 1] + lines[line_no :]

    # Strip any pre-existing indentation from the fix snippet, then re-apply
    # the indent from the original line. This prevents double-indentation when
    # the AI returns a snippet that already has leading whitespace.
    clean_new = textwrap.dedent(new_code)
    new_lines  = clean_new.splitlines()

    # First replacement line gets the original indentation
    # Additional lines (multi-line fix) get the same base indent
    indented = [raw_indent + new_lines[0].strip()] + [
        raw_indent + ln for ln in new_lines[1:]
    ]

    # Splice: replace the one original line with potentially multiple new lines
    return lines[: line_no - 1] + indented + lines[line_no :]


# ── Diff generation ───────────────────────────────────────────────────────────

def generate_diff(old_lines: list[str], new_lines: list[str], filename: str = "") -> str:
    """
    Generate a unified diff between old and new line lists.
    Adding filename makes the diff actually usable (patch-compatible).
    """
    diff = difflib.unified_diff(
        old_lines,
        new_lines,
        fromfile=f"a/{filename}" if filename else "original",
        tofile=f"b/{filename}"   if filename else "fixed",
        lineterm="",
    )
    return "\n".join(diff)


# ── Validation ────────────────────────────────────────────────────────────────

def validate_code(content: str, path: Optional[str] = None) -> tuple[bool, Optional[str]]:
    """
    Validate syntax of content for the file type detected from path.

    Returns:
        (True, None)           → valid
        (False, error_message) → invalid, with a human-readable reason

    Why return a tuple instead of bool?
    The original returned bool. The caller had no idea *why* validation failed,
    so it could only say "fix failed" — not "fix failed because: unexpected token
    on line 3". The error message lets the UI show a useful diagnostic.
    """
    if not path:
        return True, None

    lang = detect_language(path)

    if lang == Language.PYTHON:
        try:
            ast.parse(content)
            return True, None
        except SyntaxError as e:
            return False, f"Python syntax error: {e.msg} (line {e.lineno})"

    if lang in (Language.JAVASCRIPT, Language.JSX, Language.TYPESCRIPT, Language.TSX):
        try:
            import esprima
        except ImportError:
            # esprima not installed: skip validation rather than crashing.
            # Log a warning so ops knows validation is degraded.
            logger.warning("esprima not installed — skipping JS/TS syntax validation")
            return True, None

        try:
            esprima.parseModule(content, tolerant=True)
            return True, None
        except Exception:
            try:
                esprima.parseScript(content, tolerant=True)
                return True, None
            except Exception as e:
                return False, f"JavaScript syntax error: {e}"

    # For Go, Ruby, Java, and unknown types we don't have a lightweight in-process
    # validator. Return True (optimistic) rather than blocking all fixes for these
    # languages. You can add subprocess-based validators here later.
    return True, None


# ── Orchestration — the full pipeline ────────────────────────────────────────

def run_fix_pipeline(issue: dict, file_path: str, lines: list[str]) -> FixResult:
    """
    Orchestrate the full fix cycle: generate → apply → validate → return FixResult.

    This is the function your HTTP handler should call. It NEVER raises an exception
    for validation failures. Instead it returns a FixResult with success=False and
    a populated warning, so the caller can choose between:

        if result.success:
            apply to disk, return 200
        else:
            return 200 with warning (show preview, let user decide)

    A 400 from this layer would mean "you called the API wrong" (missing fields,
    wrong types) — not "the generated fix has a syntax error". Those are different
    problems and deserve different HTTP semantics.
    """
    lang = detect_language(file_path)

    # Step 1 — generate the fix snippet
    new_code = generate_fix(issue, file_path)
    fix_preview = new_code if new_code != (issue.get("code") or "").strip() else None

    # Step 2 — find the target line
    exact_line = issue.get("line")
    if not exact_line or not isinstance(exact_line, int):
        return FixResult(
            success=False,
            fixed_code="\n".join(lines),
            diff="",
            language=lang,
            validation_ok=False,
            warning="Issue did not include a valid line number — cannot apply fix automatically.",
            fix_preview=fix_preview,
        )

    # Step 3 — apply the fix
    try:
        new_lines = apply_fix(list(lines), exact_line, new_code)
    except (TypeError, ValueError) as e:
        return FixResult(
            success=False,
            fixed_code="\n".join(lines),
            diff="",
            language=lang,
            validation_ok=False,
            warning=f"Could not apply fix: {e}",
            fix_preview=fix_preview,
        )

    # Step 4 — build the patched file content
    combined = "\n".join(new_lines)

    # Step 5 — validate
    valid, validation_error = validate_code(combined, file_path)

    # Step 6 — build diff (always, so the user can see what changed even on failure)
    diff = generate_diff(
        [l.rstrip("\n") for l in lines],
        [l.rstrip("\n") for l in new_lines],
        filename=os.path.basename(file_path),
    )

    if valid:
        return FixResult(
            success=True,
            fixed_code=combined,
            diff=diff,
            language=lang,
            validation_ok=True,
            fix_preview=fix_preview,
        )
    else:
        # Validation failed: return the attempted fix anyway with a warning.
        # The HTTP handler returns 200 with a "warning" field, NOT 400.
        logger.warning(
            "Fix for %s passed generation but failed validation: %s",
            file_path, validation_error
        )
        return FixResult(
            success=False,
            fixed_code=combined,          # Still return it — UI can show a diff preview
            diff=diff,
            language=lang,
            validation_ok=False,
            warning=(
                f"Generated fix may be unsafe ({validation_error}). "
                "Review the diff below before applying."
            ),
            fix_preview=fix_preview,
        )


# ── HTTP handler (FastAPI example) ───────────────────────────────────────────

# from fastapi import APIRouter
# router = APIRouter()
#
# @router.post("/fix")
# async def fix_issue(payload: FixRequest):
#     lines = payload.source_code.splitlines(keepends=True)
#     result = run_fix_pipeline(payload.issue, payload.file_path, lines)
#
#     if result.success:
#         return {"status": "ok", "fixed_code": result.fixed_code, "diff": result.diff}
#     else:
#         # 200 with a warning — NOT 400
#         return {
#             "status": "warning",
#             "warning": result.warning,
#             "fixed_code": result.fixed_code,   # show the attempted fix in the UI
#             "diff": result.diff,
#             "validation_ok": result.validation_ok,
#             "fix_preview": result.fix_preview,
#         }

