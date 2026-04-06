import esprima
import os


def extract_imports(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            code = f.read()

        tree = esprima.parseModule(code)

        imports = []

        for node in tree.body:
            if node.type == "ImportDeclaration":
                imports.append(node.source.value)

        return imports

    except Exception:
        return []
    
def build_dependency_graph(project_path):
    graph = {}
    all_files = []

    for root, _, files in os.walk(project_path):
        for file in files:
            if file.endswith(".js") or file.endswith(".jsx"):
                full_path = os.path.join(root, file)
                all_files.append(full_path)

                imports = extract_imports(full_path)
                graph[full_path] = imports

    return graph, all_files


def find_used_files(graph):
    used = set()

    for file, imports in graph.items():
        for imp in imports:
            used.add(imp)

    return used