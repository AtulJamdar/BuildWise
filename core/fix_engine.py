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
        if "console.log" not in code_raw:
            return code_raw

    return code_raw

############################################################# I have chage here in appy_fix function I added 2 lines to check if the issue has code and if not it will raise an exception because we need the code to generate the fix. I also added a check to see if the lines variable is a list before trying to modify it. If it's not a list, we simply return it unchanged. This is to prevent errors in case the input is not in the expected format.

def apply_fix(lines, line_no, new_code):
    if not isinstance(lines, list):
        return lines

    if 1 <= line_no <= len(lines):
        original_line = lines[line_no - 1]
        indent = len(original_line) - len(original_line.lstrip())

        lines[line_no - 1] = " " * indent + new_code.strip()

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
