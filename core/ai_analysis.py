import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Replace with your actual key or use an environment variable
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

client = Groq(api_key=GROQ_API_KEY)

def analyze_project(file_structure):
    prompt = f"""
    You are a Senior Software Architect. Analyze this project structure:
    {file_structure}

    Provide a concise report focusing on:
    1. Folder Structure improvements.
    2. Missing best practices (e.g., .env, .gitignore).
    3. Suggested modularization.
    
    Keep the response professional and formatted for a terminal.
    """

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful coding assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=1024,
        )
        return completion.choices[0].message.content
    except Exception as e:
        return f"❌ AI Analysis Error: {str(e)}"