from core import file_checks

def run_all_checks(path):
    results = []

    results.extend(file_checks.check_readme(path))
    results.extend(file_checks.check_large_files(path))
    results.extend(file_checks.check_file_naming(path))
    results.extend(file_checks.check_empty_folders(path))
    results.extend(file_checks.check_duplicate_files(path))
    results.extend(file_checks.check_unused_files(path))

    return results