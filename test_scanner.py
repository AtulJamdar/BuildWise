from core.scanner import scan_project
result = scan_project('.', 'test', 1)
print('Issues found:', len(result['issues_found']))
if 'results' in result:
    for issue in result['results']:
        if 'Unused' in issue['title']:
            print(f"{issue['file']}: {issue['title']}")
else:
    print('No results key')