# core/constants.py

# 🛡️ Whitelist: Files that are critical for configuration/documentation
SAFE_FILES = {
    # Frontend / Node.js
    "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "vite.config.js", "vite.config.ts", "webpack.config.js", "tailwind.config.js",
    "postcss.config.js", "eslint.config.js", ".eslintrc.js", "index.html",
    ".gitignore", ".env", "README.md", "docker-compose.yml", "Dockerfile",
    
    # Python
    "requirements.txt", "manage.py", "wsgi.py", "asgi.py", "setup.py",
    "pytest.ini", "tox.ini", "Pipfile", "Pipfile.lock",
    
    # Java
    "pom.xml", "build.gradle", "settings.gradle", "gradlew", "mvnw",
    "application.properties", "application.yml"
}

# 🚀 Entry Points: The starting files of an app (nothing imports these)
ENTRY_FILES = {
    "main.jsx", "main.js", "index.js", "index.jsx", "App.jsx", "App.js",
    "main.py", "app.py", "application.java", "Main.java"
}

# 🔍 Allowed Logic Extensions
LOGIC_EXTENSIONS = {'.js', '.jsx', '.ts', '.tsx', '.py', '.java'}