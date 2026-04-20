import os
import re
import math
import hashlib
import esprima
from core.constants import SAFE_FILES, ENTRY_FILES, LOGIC_EXTENSIONS
from collections import defaultdict

# Standard folders to ignore across all rules
IGNORE_FOLDERS = {'.git', 'node_modules', '__pycache__', '.venv', 'venv', 'dist', 'build'}


# Placeholder / test value patterns — if a captured value matches these, skip it
PLACEHOLDER_PATTERNS = re.compile(
    r'^(?:'
    r'your[-_]?.*key|'           # "your_api_key", "your-secret"
    r'replace[-_]?.*|'           # "replace_me", "replace-this"
    r'enter[-_]?.*|'             # "enter_your_key"
    r'insert[-_]?.*|'            # "insert_key_here"
    r'changeme|'                 # literal "changeme"
    r'placeholder|'              # literal "placeholder"
    r'xxx+|'                     # "xxx", "xxxx"
    r'<[^>]+>|'                  # <YOUR_KEY>, <API_KEY>
    r'\$\{[^}]+\}|'             # ${ENV_VAR} — env var reference, not a real value
    r'%\([^)]+\)s|'             # %(VAR)s — Python string template
    r'example|'                  # "example"
    r'test|'                     # "test"
    r'dummy|'                    # "dummy"
    r'fake|'                     # "fake"
    r'sample|'                   # "sample"
    r'todo'                      # "todo"
    r').*$',
    re.IGNORECASE
)


BINARY_FILE_EXTENSIONS = {
    '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
    '.zip', '.tar', '.gz', '.7z', '.woff', '.woff2', '.eot', '.ttf',
    '.otf', '.mp3', '.mp4', '.mov', '.avi', '.exe', '.dll'
}

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
    results = []
    for match in pattern.finditer(content):
        value = match.group('value')
        line_no = content.count('\n', 0, match.start()) + 1
        results.append((value, line_no))
    return results


def is_binary_path(file_path):
    _, ext = os.path.splitext(file_path.lower())
    return ext in BINARY_FILE_EXTENSIONS


def check_entropy_strings(path):
    issues = []
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, path)
            if is_binary_path(full_path):
                continue
            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
            except Exception:
                continue
            for candidate, line_no in extract_string_literals(content):
                if is_likely_secret_string(candidate):
                    issues.append({
                        'type': 'SECURITY',
                        'severity': 'HIGH',
                        'file': rel_path,
                        'line': line_no,
                        'code': candidate,
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
def is_placeholder(value: str) -> bool:
    """Return True if the captured value looks like a placeholder, not a real secret."""
    if not value or len(value) < 8:
        return True
    return bool(PLACEHOLDER_PATTERNS.match(value.strip()))

def shannon_entropy(data: str) -> float:
    """Calculate Shannon entropy of a string. High entropy (>3.5) = likely real secret."""
    if not data:
        return 0.0
    freq = defaultdict(int)
    for ch in data:
        freq[ch] += 1
    length = len(data)
    return -sum((count / length) * math.log2(count / length) for count in freq.values())


# Each entry: (regex, label, severity, check_entropy, min_entropy)
# check_entropy=True means we validate entropy on the captured group (group 1 if present)
# Format-anchored patterns (vendor-specific prefixes) don't need entropy checks — the prefix IS the signal
SECRET_PATTERNS = [
    # ── Format-anchored: vendor-specific prefixes ────────────────────────────
    # These patterns are high-confidence because the prefix itself is a known format
    (re.compile(r'AKIA[0-9A-Z]{16}'), "AWS access key ID", "HIGH", False, 0),
    (re.compile(r'(?:A3T[A-Z0-9]|AGPA|AIDA|AROA|ASCA|ASIA)[A-Z0-9]{16}'), "AWS IAM key", "HIGH", False, 0),
    (re.compile(r'sk_live_[0-9a-zA-Z]{24,}'), "Stripe live secret key", "HIGH", False, 0),
    (re.compile(r'pk_live_[0-9a-zA-Z]{24,}'), "Stripe live publishable key", "MEDIUM", False, 0),
    (re.compile(r'sk_test_[0-9a-zA-Z]{24,}'), "Stripe test secret key", "LOW", False, 0),
    (re.compile(r'ghp_[0-9a-zA-Z]{36}'), "GitHub personal access token", "HIGH", False, 0),
    (re.compile(r'gho_[0-9a-zA-Z]{36}'), "GitHub OAuth token", "HIGH", False, 0),
    (re.compile(r'ghs_[0-9a-zA-Z]{36}'), "GitHub Actions secret", "HIGH", False, 0),
    (re.compile(r'glpat-[0-9a-zA-Z\-]{20}'), "GitLab personal access token", "HIGH", False, 0),
    (re.compile(r'AIza[0-9A-Za-z_-]{35}'), "Google API key", "HIGH", False, 0),
    (re.compile(r'ya29\.[0-9A-Za-z\-_]{40,}'), "Google OAuth access token", "HIGH", False, 0),
    (re.compile(r'xox[baprs]-[0-9a-zA-Z\-]{10,}'), "Slack token", "HIGH", False, 0),
    (re.compile(r'SG\.[0-9A-Za-z\-_]{22}\.[0-9A-Za-z\-_]{43}'), "SendGrid API key", "HIGH", False, 0),
    (re.compile(r'EAACEdEose0cBA[0-9A-Za-z]+'), "Facebook access token", "HIGH", False, 0),
    (re.compile(r'AC[a-z0-9]{32}'), "Twilio account SID", "MEDIUM", False, 0),
    (re.compile(r'SK[a-z0-9]{32}'), "Twilio auth token", "HIGH", False, 0),
    (re.compile(r'npm_[A-Za-z0-9]{36}'), "npm access token", "HIGH", False, 0),
    (re.compile(r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'), "JWT token", "MEDIUM", False, 0),
    (re.compile(r'-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----'), "Private key", "HIGH", False, 0),

    # ── Connection strings: must contain actual credentials (@ separator) ────
    (re.compile(r'mongodb(?:\+srv)?://[^:]+:[^@]{8,}@[^\s"\'<>]+'), "MongoDB connection string with credentials", "HIGH", False, 0),
    (re.compile(r'postgres(?:ql)?://[^:]+:[^@]{8,}@[^\s"\'<>]+'), "PostgreSQL connection string with credentials", "HIGH", False, 0),
    (re.compile(r'mysql://[^:]+:[^@]{8,}@[^\s"\'<>]+'), "MySQL connection string with credentials", "HIGH", False, 0),
    (re.compile(r'redis://:[^@]{8,}@[^\s"\'<>]+'), "Redis connection string with credentials", "HIGH", False, 0),
    (re.compile(r'amqps?://[^:]+:[^@]{8,}@[^\s"\'<>]+'), "AMQP connection string with credentials", "HIGH", False, 0),

    # ── Generic patterns: require entropy validation to reduce false positives ─
    # These match keyword + value, but we gate them with entropy + placeholder checks
    # Captures group 1 = the value portion
    (
        re.compile(r'(?i)(?:api[_-]?key|apikey)\s*[:=]\s*["\']?([A-Za-z0-9_\-]{20,})["\']?'),
        "Generic API key", "HIGH", True, 3.5
    ),
    (
        re.compile(r'(?i)(?:secret[_-]?key|secretkey)\s*[:=]\s*["\']?([A-Za-z0-9_\-+/=]{20,})["\']?'),
        "Secret key", "HIGH", True, 3.5
    ),
    (
        re.compile(r'(?i)(?:access[_-]?token|accesstoken)\s*[:=]\s*["\']?([A-Za-z0-9_\-\.]{20,})["\']?'),
        "Access token", "HIGH", True, 3.5
    ),
    (
        re.compile(r'(?i)(?:client[_-]?secret|clientsecret)\s*[:=]\s*["\']?([A-Za-z0-9_\-]{20,})["\']?'),
        "OAuth client secret", "HIGH", True, 3.5
    ),
    (
        re.compile(r'(?i)(?:auth[_-]?token|authtoken)\s*[:=]\s*["\']?([A-Za-z0-9_\-\.]{20,})["\']?'),
        "Auth token", "MEDIUM", True, 3.5
    ),
    # Password: higher entropy threshold + longer minimum to cut test/config noise
    (
        re.compile(r'(?i)password\s*[:=]\s*["\']([^"\']{12,})["\']'),
        "Hardcoded password", "HIGH", True, 4.0
    ),
]


# Extensions to skip entirely (binary / compiled / lock files with no secrets to scan)
SKIP_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
    '.pdf', '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z',
    '.exe', '.dll', '.so', '.dylib', '.bin', '.wasm',
    '.pyc', '.pyo', '.class', '.o', '.a',
    '.lock',                       # package-lock.json, yarn.lock etc.
    '.min.js', '.min.css',         # minified — high entropy everywhere, useless
}


# Files whose names suggest they're test/example/fixture files — lower severity
TEST_FILE_PATTERNS = re.compile(
    r'(?i)(?:test|spec|mock|fixture|example|sample|demo|fake|stub)',
    re.IGNORECASE
)

def check_api_keys(path: str) -> list[dict]:
    issues = []

    for root, dirs, files in os.walk(path):
        # Prune ignored directories in-place
        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]

        for file in files:
            # Skip binary and generated files by extension
            _, ext = os.path.splitext(file)
            if ext.lower() in SKIP_EXTENSIONS or file.endswith(('.min.js', '.min.css')):
                continue

            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, path)
            in_test_file = bool(TEST_FILE_PATTERNS.search(file))

            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()
            except Exception:
                continue

            seen_labels_in_file = set()  # deduplicate: one report per secret type per file

            for line_no, line in enumerate(lines, start=1):
                # Skip comment lines — the #1 source of false positives
                stripped = line.lstrip()
                if stripped.startswith(('#', '//', '--', '/*', '*')):
                    continue

                for regex, label, severity, check_entropy, min_entropy in SECRET_PATTERNS:
                    match = regex.search(line)
                    if not match:
                        continue

                    # Extract the value to validate (group 1 if captured, else full match)
                    value = match.group(1) if match.lastindex and match.lastindex >= 1 else match.group(0)

                    # Gate 1: Placeholder check
                    if is_placeholder(value):
                        continue

                    # Gate 2: Entropy check (only for generic keyword patterns)
                    if check_entropy and shannon_entropy(value) < min_entropy:
                        continue

                    # Gate 3: Downgrade severity for test files
                    effective_severity = "LOW" if in_test_file and severity == "HIGH" else severity

                    # Gate 4: Deduplicate — only report the same label once per file
                    dedup_key = (rel_path, label)
                    if dedup_key in seen_labels_in_file:
                        continue
                    seen_labels_in_file.add(dedup_key)

                    issues.append({
                        "type": "SECURITY",
                        "severity": effective_severity,
                        "file": rel_path,
                        "line": line_no,
                        "label": label,
                        "title": f"Potential {label} exposed",
                        "matched_value_preview": f"{value[:6]}{'*' * max(0, len(value) - 6)}",  # partial redaction
                        "why": (
                            f"Detected a possible {label} on line {line_no} of {file}. "
                            f"Value has Shannon entropy {shannon_entropy(value):.2f}."
                            if check_entropy else
                            f"Detected a {label} matching a known vendor format on line {line_no} of {file}."
                        ),
                        "fix": (
                            "Remove the secret from source control immediately. "
                            "Move it to environment variables or a secrets manager (e.g. AWS Secrets Manager, HashiCorp Vault, Doppler). "
                            "Rotate the key — treat it as compromised regardless of repository visibility."
                        )
                    })

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
