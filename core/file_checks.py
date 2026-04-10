import os
import re
import math
import hashlib
import esprima
from core.constants import SAFE_FILES, ENTRY_FILES, LOGIC_EXTENSIONS

# Standard folders to ignore across all rules
IGNORE_FOLDERS = {'.git', 'node_modules', '__pycache__', 'venv', '.vscode'}

# Rule 1: README check
def check_readme(path):
    issues = []
    if "README.md" not in os.listdir(path):
        issues.append({
            "type": "STRUCTURE",
            "severity": "HIGH",
            "file": "ROOT",
            "line": None,
            "title": "Missing README.md",
            "why": "Project lacks documentation",
            "fix": "Add a README.md file explaining setup and usage"
        })
    return issues

# Rule 2: Large file check (>1MB)
def check_large_files(path):
    issues = []
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]
        for file in files:
            full_path = os.path.join(root, file)
            size = os.path.getsize(full_path)
            if size > 1 * 1024 * 1024:
                issues.append({
                    "type": "PERFORMANCE",
                    "severity": "MEDIUM",
                    "file": file,
                    "line": None,
                    "title": "Large file detected",
                    "why": f"Large files ({size / (1024*1024):.2f} MB) slow down builds and performance",
                    "fix": "Split file into smaller modules or use Git LFS"
                })
    return issues

# Rule 3: File naming check
def check_file_naming(path):
    issues = []
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]
        for file in files:
            if " " in file:
                issues.append({
                    "type": "STYLE",
                    "severity": "LOW",
                    "file": os.path.relpath(os.path.join(root, file), path),
                    "line": None,
                    "title": "Bad file naming",
                    "why": "Spaces in filenames cause issues in imports and CLI commands",
                    "fix": "Use camelCase, snake_case, or kebab-case"
                })
    return issues

# Rule 4: Empty folder check
def check_empty_folders(path):
    issues = []
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]
        if not dirs and not files:
            issues.append({
                "type": "STRUCTURE",
                "severity": "LOW",
                "file": os.path.relpath(root, path),
                "line": None,
                "title": "Empty folder found",
                "why": "Empty folders clutter the project structure and are often ignored by Git",
                "fix": "Remove the folder or add a .gitkeep file"
            })
    return issues

# Rule 5: Empty file check
def check_empty_files(path):
    issues = []
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]
        for file in files:
            full_path = os.path.join(root, file)
            if os.path.getsize(full_path) == 0:
                issues.append({
                    "type": "STRUCTURE",
                    "severity": "LOW",
                    "file": os.path.relpath(full_path, path),
                    "line": None,
                    "title": "Empty file found",
                    "why": "This file contains no content and may be an accidental placeholder",
                    "fix": "Remove the empty file or add meaningful content"
                })
    return issues

def get_file_hash(filepath):
    hasher = hashlib.md5()
    with open(filepath, 'rb') as f:
        while chunk := f.read(4096):
            hasher.update(chunk)
    return hasher.hexdigest()

# Secret detection helpers
def shannon_entropy(value):
    if not value:
        return 0.0
    counts = {}
    for ch in value:
        counts[ch] = counts.get(ch, 0) + 1
    entropy = 0.0
    length = len(value)
    for count in counts.values():
        p = count / length
        entropy -= p * math.log2(p)
    return entropy


def is_likely_secret_string(value):
    if len(value) < 20:
        return False
    if re.search(r'\s', value):
        return False
    entropy = shannon_entropy(value)
    categories = 0
    if re.search(r'[a-z]', value):
        categories += 1
    if re.search(r'[A-Z]', value):
        categories += 1
    if re.search(r'[0-9]', value):
        categories += 1
    if re.search(r'[^A-Za-z0-9]', value):
        categories += 1
    return entropy >= 4.2 and categories >= 3


def is_sensitive_name(name):
    if not name:
        return False
    lowered = name.lower()
    return any(token in lowered for token in [
        'key', 'secret', 'token', 'password', 'auth', 'credential', 'api', 'passwd'
    ])


def extract_string_literals(content):
    pattern = re.compile(r'(["\'])(?P<value>[^"\']{20,}?)\1')
    return [match.group('value') for match in pattern.finditer(content)]


def check_entropy_strings(path):
    issues = []
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, path)
            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
            except Exception:
                continue
            for candidate in extract_string_literals(content):
                if is_likely_secret_string(candidate):
                    issues.append({
                        'type': 'SECURITY',
                        'severity': 'HIGH',
                        'file': rel_path,
                        'line': None,
                        'title': 'High entropy string detected',
                        'why': 'This quoted string has high randomness and may be a secret or API key.',
                        'fix': 'Move secrets into environment variables and rotate any exposed keys.'
                    })
                    break
    return issues


def check_hardcoded_links(path):
    issues = []
    url_pattern = re.compile(r'https?://[^\s"\']*(?:render\.com|railway\.app|herokuapp\.com|vercel\.app|netlify\.app|fly\.dev|azurewebsites\.net|appspot\.com)')
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, path)
            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
            except Exception:
                continue
            matches = url_pattern.findall(content)
            for link in matches:
                issues.append({
                    'type': 'DEVOPS',
                    'severity': 'MEDIUM',
                    'file': rel_path,
                    'line': None,
                    'title': 'Hardcoded deployment link',
                    'why': f'Found a hardcoded backend link: {link}',
                    'fix': 'Move this URL to an environment variable so it can change between environments.'
                })
    return issues


def parse_js_ast(content):
    try:
        return esprima.parseModule(content, tolerant=True)
    except Exception:
        try:
            return esprima.parseScript(content, tolerant=True)
        except Exception:
            return None


def check_js_ast_secrets(path):
    issues = []

    def inspect_node(node, rel_path):
        if node is None:
            return

        node_type = getattr(node, 'type', None)
        if node_type == 'VariableDeclarator':
            id_node = getattr(node, 'id', None)
            init_node = getattr(node, 'init', None)
            if init_node and getattr(init_node, 'type', None) == 'Literal' and isinstance(getattr(init_node, 'value', None), str):
                name = getattr(id_node, 'name', None)
                if is_sensitive_name(name) or is_likely_secret_string(getattr(init_node, 'value', '')):
                    issues.append({
                        'type': 'SECURITY',
                        'severity': 'HIGH',
                        'file': rel_path,
                        'line': None,
                        'title': 'Secret-like string assigned in AST',
                        'why': f"Found string assigned to '{name}' that looks like a secret.",
                        'fix': 'Move secrets out of source code and into environment variables.'
                    })
        elif node_type == 'AssignmentExpression':
            left = getattr(node, 'left', None)
            right = getattr(node, 'right', None)
            if right and getattr(right, 'type', None) == 'Literal' and isinstance(getattr(right, 'value', None), str):
                if left and getattr(left, 'type', None) == 'MemberExpression':
                    object_node = getattr(left, 'object', None)
                    if object_node and getattr(object_node, 'type', None) == 'MemberExpression':
                        outer = getattr(object_node, 'object', None)
                        env_prop = getattr(object_node, 'property', None)
                        if getattr(outer, 'type', None) == 'Identifier' and getattr(outer, 'name', None) == 'process' and getattr(env_prop, 'name', None) == 'env':
                            issues.append({
                                'type': 'SECURITY',
                                'severity': 'HIGH',
                                'file': rel_path,
                                'line': None,
                                'title': 'process.env assignment detected',
                                'why': 'Assigning to process.env at runtime can expose secrets and cause environment leakage.',
                                'fix': 'Do not assign secrets to process.env from source code; load them from environment variables instead.'
                            })
                if left and getattr(left, 'type', None) == 'Identifier':
                    name = getattr(left, 'name', None)
                    if is_sensitive_name(name) or is_likely_secret_string(getattr(right, 'value', '')):
                        issues.append({
                            'type': 'SECURITY',
                            'severity': 'HIGH',
                            'file': rel_path,
                            'line': None,
                            'title': 'Sensitive assignment found in AST',
                            'why': f"Found assignment to '{name}' with a secret-like string.",
                            'fix': 'Store secrets in environment variables rather than hardcoding them.'
                        })
        elif node_type == 'Property':
            key = getattr(node, 'key', None)
            value = getattr(node, 'value', None)
            key_name = None
            if getattr(key, 'type', None) == 'Identifier':
                key_name = getattr(key, 'name', None)
            if value and getattr(value, 'type', None) == 'Literal' and isinstance(getattr(value, 'value', None), str):
                if is_sensitive_name(key_name) or is_likely_secret_string(getattr(value, 'value', '')):
                    issues.append({
                        'type': 'SECURITY',
                        'severity': 'HIGH',
                        'file': rel_path,
                        'line': None,
                        'title': 'Sensitive object property detected',
                        'why': f"Found object property '{key_name}' assigned a secret-like string.",
                        'fix': 'Remove secrets from code and use environment variables.'
                    })

        if hasattr(node, '__dict__'):
            for child in vars(node).values():
                if isinstance(child, list):
                    for item in child:
                        if hasattr(item, 'type') or isinstance(item, dict):
                            inspect_node(item, rel_path)
                elif hasattr(child, 'type') or isinstance(child, dict):
                    inspect_node(child, rel_path)
        elif isinstance(node, dict):
            for child in node.values():
                if isinstance(child, list):
                    for item in child:
                        if hasattr(item, 'type') or isinstance(item, dict):
                            inspect_node(item, rel_path)
                elif hasattr(child, 'type') or isinstance(child, dict):
                    inspect_node(child, rel_path)

    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext not in {'.js', '.jsx', '.ts', '.tsx'}:
                continue
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, path)
            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
            except Exception:
                continue
            tree = parse_js_ast(content)
            if tree is None:
                continue
            inspect_node(tree, rel_path)
    return issues

# Rule 6: Check Duplicate Files
def check_duplicate_files(path):
    issues = []
    hashes = {}
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]
        for file in files:
            if file in SAFE_FILES:
                continue
            full_path = os.path.join(root, file)
            file_hash = get_file_hash(full_path)
            if file_hash in hashes:
                issues.append({
                    "type": "REDUNDANCY",
                    "severity": "MEDIUM",
                    "file": os.path.relpath(full_path, path),
                    "line": None,
                    "title": "Duplicate file found",
                    "why": f"This file is an exact copy of {os.path.relpath(hashes[file_hash], path)}",
                    "fix": "Remove the duplicate file and reference the original"
                })
            else:
                hashes[file_hash] = full_path
    return issues

# Rule 7: Repeated Code Detection

def check_repeated_code(path):
    issues = []
    file_lines = []
    candidates = []

    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]
        for file in files:
            file_path = os.path.join(root, file)
            if file in SAFE_FILES:
                continue
            ext = os.path.splitext(file)[1].lower()
            if ext not in LOGIC_EXTENSIONS and ext != '.java':
                continue
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = [line.strip() for line in f if line.strip()]
            except Exception:
                continue
            if len(lines) < 15:
                continue
            file_lines.append((file_path, lines))

    seen_pairs = set()
    for i, (a_path, a_lines) in enumerate(file_lines):
        a_set = set(a_lines)
        for j in range(i + 1, len(file_lines)):
            b_path, b_lines = file_lines[j]
            if (a_path, b_path) in seen_pairs or (b_path, a_path) in seen_pairs:
                continue
            b_set = set(b_lines)
            common = a_set.intersection(b_set)
            if len(common) >= 20 and len(common) / min(len(a_set), len(b_set)) >= 0.25:
                seen_pairs.add((a_path, b_path))
                issues.append({
                    "type": "REDUNDANCY",
                    "severity": "MEDIUM",
                    "file": os.path.relpath(a_path, path),
                    "line": None,
                    "title": "Repeated code detected",
                    "why": f"{os.path.relpath(a_path, path)} and {os.path.relpath(b_path, path)} share a large block of code.",
                    "fix": "Refactor shared code into a common utility or module"
                })
    return issues

# Rule 8: Secret / API Key Detection
def check_api_keys(path):
    issues = []
    patterns = [
        (re.compile(r'AKIA[0-9A-Z]{16}'), "AWS access key"),
        (re.compile(r'AIza[0-9A-Za-z_-]{35}'), "Google API key"),
        (re.compile(r'(?i)api[_-]?key\s*[:=]\s*["\']?([A-Za-z0-9_\-]{16,})["\']?'), "API key"),
        (re.compile(r'(?i)secret[_-]?key\s*[:=]\s*["\']?([^"\']+)["\']?'), "Secret key"),
        (re.compile(r'(?i)client[_-]?secret\s*[:=]\s*["\']?([^"\']+)["\']?'), "Client secret"),
        (re.compile(r'(?i)password\s*[:=]\s*["\']?([^"\']+)["\']?'), "Password"),
        (re.compile(r'-----BEGIN (RSA )?PRIVATE KEY-----'), "Private key"),
        (re.compile(r'(?i)mongodb(?:\+srv)?:\/\/[^\s"\']+'), "MongoDB connection string"),
    ]
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]
        for file in files:
            full_path = os.path.join(root, file)
            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
            except Exception:
                continue
            for regex, label in patterns:
                if regex.search(content):
                    issues.append({
                        "type": "SECURITY",
                        "severity": "HIGH",
                        "file": os.path.relpath(full_path, path),
                        "line": None,
                        "title": "Potential secret/API key exposed",
                        "why": f"Detected a possible {label} in {file}.",
                        "fix": "Remove the secret from source control, move it to environment variables, and rotate the key immediately."
                    })
                    break
    return issues

# Rule 9: Unused File Detection

def check_unused_files(path):
    issues = []
    candidate_files = []
    used_files = set()
    entry_basenames = {os.path.splitext(ef)[0] for ef in ENTRY_FILES}

    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]
        for file in files:
            if file in SAFE_FILES:
                continue
            ext = os.path.splitext(file)[1].lower()
            if ext not in {'.py', '.java'}:
                continue
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, path)
            base_name = os.path.splitext(file)[0]
            candidate_files.append({
                'path': full_path,
                'rel_path': rel_path,
                'base_name': base_name,
                'ext': ext
            })

    for file_info in candidate_files:
        base_name = file_info['base_name']
        source_path = file_info['path']
        try:
            with open(source_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except Exception:
            continue

        for other in candidate_files:
            if other['path'] == source_path:
                continue
            other_base = other['base_name']
            if re.search(rf'\b{re.escape(other_base)}\b', content):
                used_files.add(other['path'])
            elif other['ext'] == '.py' and re.search(rf'\bfrom\s+.*\b{re.escape(other_base)}\b|\bimport\s+{re.escape(other_base)}\b', content):
                used_files.add(other['path'])
            elif other['ext'] == '.java' and re.search(rf'\bnew\s+{re.escape(other_base)}\b|\bimport\s+.*\.{re.escape(other_base)}\b|\b{re.escape(other_base)}\.', content):
                used_files.add(other['path'])

    for file_info in candidate_files:
        rel_path = file_info['rel_path']
        base_name = file_info['base_name']
        if base_name in entry_basenames:
            continue
        if file_info['path'] not in used_files:
            issues.append({
                "type": "REDUNDANCY",
                "severity": "LOW",
                "file": rel_path,
                "line": None,
                "title": "Possibly unused file",
                "why": "This file is not referenced by other source files.",
                "fix": "Verify whether this file is still required and remove it if not."
            })

    return issues
