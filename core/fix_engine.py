import os
import re
import ast
import esprima
import difflib


def generate_fix(issue):
    title = (issue.get("title") or "").lower()
    code_raw = issue.get("code") or ""

    if "api key" in title or "api key" in code_raw.lower():
        return "const API_KEY = process.env.API_KEY"

    if "console.log" in code_raw:
        return re.sub(r"console\.log\([^)]*\);?", "// removed console.log", code_raw)

    return code_raw


def apply_fix(lines, line_no, new_code):
    if not isinstance(lines, list):
        return lines
    if 1 <= line_no <= len(lines):
        lines[line_no - 1] = new_code
    return lines


def generate_diff(old_lines, new_lines):
    diff = difflib.unified_diff(old_lines, new_lines, lineterm="")
    return "\n".join(diff)


def validate_code(content, path=None):
    if not path:
        return True

    ext = os.path.splitext(path)[1].lower()
    if ext == ".py":
        try:
            ast.parse(content)
            return True
        except SyntaxError:
            return False

    if ext in {".js", ".jsx"}:
        try:
            esprima.parseModule(content, tolerant=True)
            return True
        except Exception:
            try:
                esprima.parseScript(content, tolerant=True)
                return True
            except Exception:
                return False

    # For other file types we do not validate syntax here.
    return True
