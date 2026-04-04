import os
import hashlib

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
                    "file": file,
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
                "file": root,
                "line": None,
                "title": "Empty folder found",
                "why": "Empty folders clutter the project structure and are often ignored by Git",
                "fix": "Remove the folder or add a .gitkeep file"
            })
    return issues

def get_file_hash(filepath):
    hasher = hashlib.md5()
    with open(filepath, 'rb') as f:
        while chunk := f.read(4096):
            hasher.update(chunk)
    return hasher.hexdigest()

# Rule 6: Check Duplicate Files
def check_duplicate_files(path):
    issues = []
    hashes = {}
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]
        for file in files:
            full_path = os.path.join(root, file)
            file_hash = get_file_hash(full_path)
            if file_hash in hashes:
                issues.append({
                    "type": "REDUNDANCY",
                    "severity": "MEDIUM",
                    "file": file,
                    "line": None,
                    "title": "Duplicate file found",
                    "why": f"This file is an exact copy of {os.path.basename(hashes[file_hash])}",
                    "fix": "Remove the duplicate file and reference the original"
                })
            else:
                hashes[file_hash] = full_path
    return issues

# Rule 7: Unused File Detection
def check_unused_files(path):
    issues = []
    all_files = []
    referenced_files = set()

    # Gather all potential files
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]
        for file in files:
            all_files.append(file)

    # Check for references
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]
        for file in files:
            try:
                with open(os.path.join(root, file), 'r', errors='ignore') as f:
                    content = f.read()
                    for other_file in all_files:
                        if other_file != file and other_file in content:
                            referenced_files.add(other_file)
            except:
                continue

    for file in all_files:
        # Don't mark main script files or documentation as unused
        if file not in referenced_files and not file.endswith(('.py', '.md')):
            issues.append({
                "type": "REDUNDANCY",
                "severity": "LOW",
                "file": file,
                "line": None,
                "title": "Possibly unused file",
                "why": "This file is not explicitly referenced in any other file contents",
                "fix": "Delete the file if it is no longer needed"
            })

    return issues