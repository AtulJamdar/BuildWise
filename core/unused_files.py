"""
unused_files.py — multi-language unused file detector

Supported languages:
  Python  (.py)              — stdlib ast module, full import form coverage
  Java    (.java)            — import-line regex + same-package resolution  
  JS/JSX  (.js, .jsx)       — ES module imports + require() + React.lazy()
  TS/TSX  (.ts, .tsx)       — same as JS plus type-only import filtering

Algorithm:
  1. Walk the directory tree once, reading each file into memory.
  2. Parse imports per language into a directed graph (file → files it imports).
  3. BFS from every known entry point.
  4. Files not reachable from any entry = candidates for unused.
  5. Confidence score each result before reporting.
"""

import os
import re
import ast
from collections import deque
from dataclasses import dataclass, field
from typing import Optional
from unused_files import check_unused_files as advanced_unused_check
# ── Configuration — define these in your project ──────────────────────────────
# ENTRY_FILES    : list[str]  e.g. ["main.py", "index.jsx", "App.tsx", "Main.java"]
# SAFE_FILES     : set[str]   never flagged e.g. {"__init__.py", "setup.py", "vite.config.js"}
# IGNORE_FOLDERS : set[str]   e.g. {".git", "node_modules", "__pycache__", "dist", "build", ".next"}

ENTRY_FILES: list[str] = ["index.jsx", "index.tsx", "index.js", "main.py", "App.jsx", "App.tsx"]
SAFE_FILES: set[str] = {
    "__init__.py", "setup.py", "conftest.py",
    "vite.config.js", "vite.config.ts",
    "webpack.config.js", "babel.config.js",
    "jest.config.js", "jest.config.ts",
    "tailwind.config.js", "postcss.config.js",
    ".eslintrc.js", "next.config.js",
}
IGNORE_FOLDERS: set[str] = {
    ".git", "node_modules", "__pycache__", "dist", "build",
    ".next", ".nuxt", "coverage", ".venv", "venv", ".cache",
}

SUPPORTED_EXTENSIONS = {".py", ".java", ".js", ".jsx", ".ts", ".tsx"}

# Extensions treated as JS/TS family for import parsing
JS_FAMILY = {".js", ".jsx", ".ts", ".tsx"}


# ── Data model ────────────────────────────────────────────────────────────────

@dataclass
class FileNode:
    full_path:  str
    rel_path:   str
    base_name:  str           # filename without extension, e.g. "Navbar"
    ext:        str           # ".jsx"
    content:    str = ""
    package:    str = ""      # Java package name only
    imports:    set  = field(default_factory=set)   # set[str] of full_paths


# ── Step 1: Collect ───────────────────────────────────────────────────────────

def _collect_files(path: str) -> dict[str, FileNode]:
    """
    Walk the tree once, read every candidate file into memory.
    Returns dict[full_path → FileNode].
    Reading all files up front (O(N) reads total) eliminates the
    O(N²) re-read problem in the original code.
    """
    nodes: dict[str, FileNode] = {}

    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]

        for file in files:
            if file in SAFE_FILES:
                continue
            ext = os.path.splitext(file)[1].lower()
            if ext not in SUPPORTED_EXTENSIONS:
                continue

            full_path = os.path.join(root, file)
            rel_path  = os.path.relpath(full_path, path)
            base_name = os.path.splitext(file)[0]

            try:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
            except OSError:
                continue

            node = FileNode(
                full_path=full_path,
                rel_path=rel_path,
                base_name=base_name,
                ext=ext,
                content=content,
            )
            if ext == ".java":
                node.package = _extract_java_package(content)

            nodes[full_path] = node

    return nodes


# ── Step 2a: Python import parsing ───────────────────────────────────────────

def _extract_python_imports(
    node: FileNode,
    nodes_by_base: dict[str, "FileNode"],
) -> set[str]:
    """
    Use Python's stdlib ast module to parse every import form:
      import utils
      from utils import helper
      from .utils import helper       (relative)
      from utils.sub import fn        (sub-module, resolved to top-level)
      importlib.import_module("utils") (dynamic)
    """
    referenced: set[str] = set()

    try:
        tree = ast.parse(node.content, filename=node.full_path)
    except SyntaxError:
        return _python_import_fallback(node, nodes_by_base)

    for stmt in ast.walk(tree):
        if isinstance(stmt, ast.Import):
            for alias in stmt.names:
                top = alias.name.split(".")[0]
                if top in nodes_by_base:
                    referenced.add(nodes_by_base[top].full_path)

        elif isinstance(stmt, ast.ImportFrom):
            if stmt.module is None:
                for alias in stmt.names:
                    if alias.name in nodes_by_base:
                        referenced.add(nodes_by_base[alias.name].full_path)
                continue
            top      = stmt.module.split(".")[0]
            base_mod = stmt.module.split(".")[-1]
            for name in (top, base_mod):
                if name in nodes_by_base:
                    referenced.add(nodes_by_base[name].full_path)

    # Dynamic: importlib.import_module("name")
    for m in re.finditer(r'import_module\s*\(\s*["\']([A-Za-z0-9_.]+)["\']', node.content):
        mod = m.group(1).split(".")[-1]
        if mod in nodes_by_base:
            referenced.add(nodes_by_base[mod].full_path)

    return referenced


def _python_import_fallback(
    node: FileNode,
    nodes_by_base: dict[str, "FileNode"],
) -> set[str]:
    referenced: set[str] = set()
    pattern = re.compile(
        r'^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w., ]+))',
        re.MULTILINE,
    )
    for m in pattern.finditer(node.content):
        for group in m.groups():
            if not group:
                continue
            for name in group.split(","):
                top = name.strip().split(".")[0]
                if top in nodes_by_base:
                    referenced.add(nodes_by_base[top].full_path)
    return referenced


# ── Step 2b: Java import parsing ──────────────────────────────────────────────

def _extract_java_package(content: str) -> str:
    m = re.search(r'^\s*package\s+([\w.]+)\s*;', content, re.MULTILINE)
    return m.group(1) if m else ""


def _extract_java_imports(
    node: FileNode,
    nodes_by_fqcn: dict[str, "FileNode"],
    nodes_by_base: dict[str, "FileNode"],
) -> set[str]:
    """
    Parse only import statement lines — never scan body text.
    Handles: exact imports, wildcard imports, static imports, same-package references.
    """
    referenced: set[str] = set()
    import_re = re.compile(
        r'^\s*import\s+(?:static\s+)?([\w.]+?)(\.\*)?;',
        re.MULTILINE,
    )

    for m in import_re.finditer(node.content):
        fqcn     = m.group(1)
        wildcard = m.group(2)

        if wildcard:
            # import com.example.util.*  → mark all files in that package
            for fp, n in nodes_by_fqcn.items():
                if n.package == fqcn:
                    referenced.add(fp)
        else:
            if fqcn in nodes_by_fqcn:
                referenced.add(nodes_by_fqcn[fqcn].full_path)
            else:
                simple = fqcn.split(".")[-1]
                if simple in nodes_by_base:
                    referenced.add(nodes_by_base[simple].full_path)

    # Same-package: Java files in the same package reference each other without import
    if node.package:
        for fp, other in nodes_by_fqcn.items():
            if fp != node.full_path and other.package == node.package:
                referenced.add(fp)

    return referenced


# ── Step 2c: JavaScript / JSX / TypeScript / TSX import parsing ──────────────
#
# This is the most complex parser because React has 5 distinct reference patterns,
# none of which map cleanly to a single regex.

# ES module static import:  import X from './X'  or  import { X } from '../X'
_ES_IMPORT_RE = re.compile(
    r'''import\s+(?:type\s+)?           # import [type]
        (?:
            [\w*{},\s'"]+               # default, namespace, or named specifiers
            \s+from\s+                  # from keyword
        )?
        ['"]([^'"]+)['"]               # the module specifier string
    ''',
    re.VERBOSE,
)

# require():  require('./utils')  or  require('../components/Navbar')
_REQUIRE_RE = re.compile(r'''require\s*\(\s*['"]([^'"]+)['"]\s*\)''')

# React.lazy():  React.lazy(() => import('./Modal'))
# Also catches:  lazy(() => import('./Modal'))
_LAZY_RE = re.compile(
    r'''(?:React\.)?lazy\s*\(\s*\(\s*\)\s*=>\s*import\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\)'''
)

# Dynamic import():  import('./Dashboard')  used standalone (not inside lazy())
_DYNAMIC_IMPORT_RE = re.compile(r'''(?<!lazy\s{0,20}\(\s{0,20}\(\s{0,20}\)\s{0,20}=>\s{0,20})import\s*\(\s*['"]([^'"]+)['"]\s*\)''')

# export { X } from './X'  (barrel re-export — source file must be tracked)
_REEXPORT_RE = re.compile(r'''export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]''')

# React Router v6: element={<ComponentName />} or component={ComponentName}
_ROUTER_ELEMENT_RE = re.compile(r'''element\s*=\s*\{?\s*<\s*([A-Z][A-Za-z0-9]*)\s*/?>''')
_ROUTER_COMPONENT_RE = re.compile(r'''component\s*=\s*\{?\s*([A-Z][A-Za-z0-9]*)\s*\}?''')

# JSX tag usage: <Navbar  or <MyModal.  (capitalized = component, lowercase = DOM element)
_JSX_TAG_RE = re.compile(r'<([A-Z][A-Za-z0-9]*)')


def _resolve_js_specifier(
    specifier: str,
    source_dir: str,
    nodes_by_full: dict[str, "FileNode"],
    nodes_by_base: dict[str, "FileNode"],
) -> Optional[str]:
    """
    Given a module specifier string (e.g. './Navbar', '../utils', 'lodash'),
    resolve it to a FileNode full_path if it maps to a file in our project.

    Resolution order:
      1. Exact path match with each JS/TS extension appended
      2. Index file inside a directory (e.g. './components' → './components/index.jsx')
      3. Base-name match (last resort, catches aliased imports like '@/components/Navbar')

    Non-relative specifiers that don't resolve (e.g. 'react', 'lodash') are
    silently ignored — they're npm packages, not project files.
    """
    if not specifier.startswith(".") and not specifier.startswith("/"):
        # Check alias patterns like '@/components/Navbar' → base name 'Navbar'
        base = specifier.split("/")[-1]
        if base in nodes_by_base:
            return nodes_by_base[base].full_path
        return None  # npm package, not our file

    # Resolve relative to the source file's directory
    abs_base = os.path.normpath(os.path.join(source_dir, specifier))

    # Try: ./Navbar.jsx, ./Navbar.js, ./Navbar.tsx, ./Navbar.ts, ./Navbar/index.jsx ...
    candidates = []
    for ext in (".jsx", ".tsx", ".js", ".ts"):
        candidates.append(abs_base + ext)
        candidates.append(os.path.join(abs_base, f"index{ext}"))

    for candidate in candidates:
        if candidate in nodes_by_full:
            return candidate

    # Base-name fallback
    base = os.path.basename(abs_base)
    if base in nodes_by_base:
        return nodes_by_base[base].full_path

    return None


def _extract_js_imports(
    node: FileNode,
    nodes_by_full: dict[str, "FileNode"],
    nodes_by_base: dict[str, "FileNode"],
    nodes_by_component: dict[str, "FileNode"],
) -> set[str]:
    """
    Extract all references from a JS/JSX/TS/TSX file.

    Five reference patterns handled:
      1. ES module static imports      import X from './X'
      2. CommonJS require()            require('./X')
      3. React.lazy() / lazy()         lazy(() => import('./X'))
      4. Dynamic import()              import('./X')
      5. Barrel re-exports             export { X } from './X'
      6. JSX component tags            <Navbar /> resolved via imports already parsed

    For JSX tags (pattern 6), we rely on the fact that any component used as
    <Navbar /> MUST be imported somewhere in the same file first. Since we
    already collect all imports, the JSX tag scan is used only to catch
    components passed via React Router's element={<X />} syntax where the
    component name is used as a prop value rather than a direct JSX child.
    """
    referenced: set[str] = set()
    source_dir = os.path.dirname(node.full_path)

    def _add(specifier: str) -> None:
        resolved = _resolve_js_specifier(
            specifier, source_dir, nodes_by_full, nodes_by_base
        )
        if resolved:
            referenced.add(resolved)

    # Pattern 1: ES static imports
    for m in _ES_IMPORT_RE.finditer(node.content):
        _add(m.group(1))

    # Pattern 2: require()
    for m in _REQUIRE_RE.finditer(node.content):
        _add(m.group(1))

    # Pattern 3: React.lazy()
    for m in _LAZY_RE.finditer(node.content):
        _add(m.group(1))

    # Pattern 4: bare dynamic import() (not already captured by lazy)
    for m in _DYNAMIC_IMPORT_RE.finditer(node.content):
        _add(m.group(1))

    # Pattern 5: barrel re-exports
    for m in _REEXPORT_RE.finditer(node.content):
        _add(m.group(1))

    # Pattern 6: React Router component names used as prop values
    # These reference a component NAME, not a path — resolve via component index
    for m in _ROUTER_ELEMENT_RE.finditer(node.content):
        name = m.group(1)
        if name in nodes_by_component:
            referenced.add(nodes_by_component[name].full_path)

    for m in _ROUTER_COMPONENT_RE.finditer(node.content):
        name = m.group(1)
        if name in nodes_by_component:
            referenced.add(nodes_by_component[name].full_path)

    return referenced


# ── Step 3: Build the graph ───────────────────────────────────────────────────

def _build_graph(nodes: dict[str, FileNode]) -> None:
    """
    Populate node.imports for every node by calling the appropriate
    language parser. Builds all lookup indexes first.
    """
    # Index: base filename → node  (e.g. "Navbar" → Navbar.jsx's node)
    nodes_by_base: dict[str, FileNode] = {
        n.base_name: n for n in nodes.values()
    }

    # Index: full_path → node (for JS path resolution)
    nodes_by_full: dict[str, FileNode] = dict(nodes)

    # Index: Java FQCN → node  (e.g. "com.example.Helper" → Helper.java's node)
    nodes_by_fqcn: dict[str, FileNode] = {}
    for n in nodes.values():
        if n.ext == ".java" and n.package:
            nodes_by_fqcn[f"{n.package}.{n.base_name}"] = n

    # Index: React component name → node
    # Components are PascalCase files. "Navbar" → Navbar.jsx node.
    # This is used to resolve JSX prop references like element={<Navbar />}
    # where we have the name but not the import path.
    nodes_by_component: dict[str, FileNode] = {
        n.base_name: n
        for n in nodes.values()
        if n.ext in JS_FAMILY and n.base_name[0:1].isupper()
    }

    for node in nodes.values():
        if node.ext == ".py":
            node.imports = _extract_python_imports(node, nodes_by_base)

        elif node.ext == ".java":
            node.imports = _extract_java_imports(node, nodes_by_fqcn, nodes_by_base)

        elif node.ext in JS_FAMILY:
            node.imports = _extract_js_imports(
                node, nodes_by_full, nodes_by_base, nodes_by_component
            )


# ── Step 4: Reachability via BFS ─────────────────────────────────────────────

def _reachable_from_entries(
    nodes: dict[str, FileNode],
    entry_basenames: set[str],
) -> set[str]:
    """
    BFS from all entry-point files through the import graph.
    Returns the set of full_paths that are reachable.

    React-specific entry point expansion:
    - Any file whose directory is named 'pages/' is treated as an entry point
      (Next.js file-based routing convention).
    - Any file matching common framework auto-discovery patterns is also seeded.
    """
    visited: set[str] = set()
    queue:   deque    = deque()

    for node in nodes.values():
        # Explicit entry points by name
        if node.base_name in entry_basenames:
            queue.append(node)
            continue

        # Next.js / file-based router: every file under pages/ or app/ is an entry
        parts = node.rel_path.replace("\\", "/").split("/")
        if parts[0] in ("pages", "app", "routes", "views"):
            queue.append(node)
            continue

        # Test files are effectively entry points (they import the modules under test)
        if any(p in node.base_name for p in ("test", "spec", "Test", "Spec")):
            queue.append(node)
            continue

    while queue:
        current = queue.popleft()
        if current.full_path in visited:
            continue
        visited.add(current.full_path)

        for dep_path in current.imports:
            if dep_path in nodes and dep_path not in visited:
                queue.append(nodes[dep_path])

    return visited


# ── Step 5: Confidence scoring ────────────────────────────────────────────────

# Patterns in a filename that suggest framework auto-discovery
# (not import-detectable but highly unlikely to be truly unused)
_FRAMEWORK_PATTERNS = re.compile(
    r'(?i)(middleware|plugin|config|setup|seed|migration|'
    r'schema|model|resolver|hook|store|slice|saga|epic|'
    r'worker|service|decorator|guard|interceptor|pipe|filter)',
)

def _score_confidence(node: FileNode, nodes: dict[str, FileNode]) -> tuple[str, str]:
    """
    Return (severity, explanation) for an unreachable file.

    MEDIUM  → zero imports from anywhere; high confidence it's dead code.
    LOW     → someone imports it but it's still not reachable from an entry;
              could be a test fixture, plugin, or framework-loaded module.
    """
    # Is anything in the graph importing this node at all?
    referenced_anywhere = any(
        node.full_path in other.imports
        for other in nodes.values()
        if other.full_path != node.full_path
    )

    # Does the filename suggest framework auto-discovery?
    is_framework_file = bool(_FRAMEWORK_PATTERNS.search(node.base_name))

    if is_framework_file:
        return (
            "LOW",
            f"Filename '{node.base_name}' suggests framework auto-loading "
            "(middleware, plugin, config, etc.). Cannot confirm via static analysis alone."
        )

    if not referenced_anywhere:
        return (
            "MEDIUM",
            "No other file in this project imports or references this file. "
            "High confidence it is unused."
        )

    return (
        "LOW",
        "This file is imported somewhere but is not reachable from any known "
        "entry point. It may be loaded via dynamic import, a plugin system, "
        "or a framework convention not detectable by static analysis."
    )


# ── Public API ────────────────────────────────────────────────────────────────

def check_unused_files(path):
    try:
        return advanced_unused_check(path)
    except Exception as e:
        return [{
            "type": "SYSTEM",
            "severity": "LOW",
            "file": "UNKNOWN",
            "line": None,
            "title": "Unused file detection failed",
            "why": f"Error occurred while running advanced unused file detection: {str(e)}",
            "fix": "Check logs and ensure unused_files.py is correctly configured"
        }]