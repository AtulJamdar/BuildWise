import esprima
import os
import re


def extract_imports(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            code = f.read()

        tree = esprima.parseModule(code)
        imports = []

        for node in tree.body:
            if node.type == "ImportDeclaration":
                imp = node.source.value  # e.g., "./components/Navbar"

                # Skip package imports (no relative path prefix)
                if not imp.startswith('.'):
                    continue

                imports.append(imp)
        return imports
    except Exception:
        # JSX/TSX files may not be parseable by the current esprima mode.
        # Fall back to a lightweight regex-based import extractor.
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                code = f.read()
        except Exception:
            return []

        imports = []
        import_pattern = re.compile(r'^\s*import\s+(?:[^"\']+\s+from\s+)?["\']([^"\']+)["\']', re.MULTILINE)
        require_pattern = re.compile(r'require\(\s*["\']([^"\']+)["\']\s*\)')

        for match in import_pattern.finditer(code):
            imp = match.group(1)
            if imp.startswith('.'):
                imports.append(imp)

        for match in require_pattern.finditer(code):
            imp = match.group(1)
            if imp.startswith('.'):
                imports.append(imp)

        return imports


def normalize_graph_key(abs_path, project_root):
    rel_with_ext = os.path.relpath(abs_path, project_root)
    rel_no_ext = os.path.splitext(rel_with_ext)[0]
    return rel_no_ext.replace(os.sep, '/')


def resolve_import(import_str, file_dir, project_root):
    """
    Resolve a relative import string to a forward-slash relative path
    from project_root, WITHOUT an extension.

    e.g. import_str  = './components/Home'
         file_dir    = '/abs/path/to/src'
         project_root= '/abs/path/to'
    Returns: 'src/components/Home'  (no extension, forward slashes)
    Returns None if the file cannot be found on disk.
    """
    extensions = ['.jsx', '.js', '.ts', '.tsx']
    abs_candidate = os.path.normpath(os.path.join(file_dir, import_str))

    # If the import already includes an extension, resolve directly.
    candidate_ext = os.path.splitext(abs_candidate)[1]
    if candidate_ext in extensions and os.path.exists(abs_candidate):
        rel = os.path.relpath(abs_candidate, project_root)
        rel_no_ext = os.path.splitext(rel)[0]
        return rel_no_ext.replace(os.sep, '/')

    # If the import maps to a directory, resolve its index file.
    if os.path.isdir(abs_candidate):
        for ext in extensions:
            abs_index = os.path.join(abs_candidate, 'index' + ext)
            if os.path.exists(abs_index):
                rel = os.path.relpath(abs_index, project_root)
                rel_no_ext = os.path.splitext(rel)[0]
                return rel_no_ext.replace(os.sep, '/')

    # Try adding each common extension to find the real file.
    for ext in extensions:
        abs_full = abs_candidate + ext
        if os.path.exists(abs_full):
            rel = os.path.relpath(abs_full, project_root)
            rel_no_ext = os.path.splitext(rel)[0]
            return rel_no_ext.replace(os.sep, '/')

    return None


def build_dependency_graph(project_path):
    """
    Builds a map of:
      key  : forward-slash relative path WITHOUT extension  (e.g. 'src/components/Home')
      value: list of forward-slash relative paths WITHOUT extension that this file imports

    Using extension-free, forward-slash relative paths as the single source of truth
    eliminates every OS/extension mismatch between js_analyzer and scanner.
    """
    graph = {}
    all_files = []
    ignore_dirs = {'node_modules', '__pycache__', 'venv', 'dist', 'build', '.git', '.vscode'}

    abs_project_path = os.path.abspath(project_path)

    for root, dirs, files in os.walk(project_path):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]

        for file in files:
            if not file.endswith(('.js', '.jsx', '.ts', '.tsx')):
                continue

            full_path = os.path.abspath(os.path.join(root, file))
            all_files.append(full_path)

            # --- Graph key: forward-slash relative path, NO extension ---
            # e.g. 'src/components/Home'
            graph_key = normalize_graph_key(full_path, abs_project_path)

            # Extract raw import strings, then resolve each one
            raw_imports = extract_imports(full_path)
            resolved_imports = []

            file_dir = os.path.dirname(full_path)
            for imp in raw_imports:
                resolved = resolve_import(imp, file_dir, abs_project_path)
                if resolved:
                    resolved_imports.append(resolved)

            graph[graph_key] = resolved_imports

    print(f"🕸️  Dependency Graph built for {len(all_files)} files.")
    return graph, all_files


def find_used_files(graph):
    """
    Returns a set of graph keys (forward-slash relative paths, no extension)
    that are imported by at least one other file, plus all entry-point keys.

    e.g. {'src/App', 'src/main', 'src/components/Home', ...}
    """
    from core.constants import ENTRY_FILES

    # Seed with entry-point keys by matching bare filename (no ext) against graph keys
    entry_basenames = {os.path.splitext(ef)[0] for ef in ENTRY_FILES}  # {'App', 'main', ...}
    used = set()

    for key in graph:
        # key looks like 'src/App' or 'App'
        if key.split('/')[-1] in entry_basenames:
            used.add(key)

    # Add every file that appears as an import target in ANY other file
    for imported_list in graph.values():
        for imp in imported_list:
            used.add(imp)

    return used