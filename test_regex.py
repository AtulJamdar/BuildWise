import sys
sys.path.append('.')
from core.js_analyzer import extract_imports

result = extract_imports('buildwise-frontend/src/App.jsx')
print('Result:', result)