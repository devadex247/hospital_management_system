import os
from dotenv import load_dotenv
load_dotenv()
import glob
from openai import OpenAI
from flask import Flask, render_template_string, request, jsonify

app = Flask(__name__)

# Hugging Face inference router client (OpenAI-compatible)
hf_client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=os.environ.get("HF_TOKEN", ""),
)

@app.route("/api/chat", methods=["POST", "OPTIONS"])
def chat_api():
    if request.method == "OPTIONS":
        response = jsonify({})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "POST")
        return response, 200
        
    data = request.json
    prompt = data.get("prompt")
    system_message = data.get("system_message", "You are a helpful hospital management assistant.")
    
    try:
        # Qwen2.5-72B via novita — no license approval needed, proper chat model
        completion = hf_client.chat.completions.create(
            model="Qwen/Qwen2.5-72B-Instruct:novita",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
        )
        resp = jsonify({"response": completion.choices[0].message.content})
        resp.headers.add("Access-Control-Allow-Origin", "*")
        return resp
    except Exception as e:
        resp = jsonify({"error": str(e)})
        resp.headers.add("Access-Control-Allow-Origin", "*")
        return resp, 500

# Base directory for the hospital management app
BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "Hospital_management")

def get_file_content(path):
    full_path = os.path.join(BASE_DIR, path)
    if os.path.exists(full_path):
        with open(full_path, "r", encoding="utf-8") as f:
            return f.read()
    return ""

@app.route("/")
def index():
    # Gather all python files in the project to mount them in stlite
    files = {}
    
    # Add root files
    for f in ["app.py", "models.py", "hospital_manager.py"]:
        content = get_file_content(f)
        if content:
            files[f] = content
        
    # Add files from subdirectories
    for subdir in ["views", "services", "utils"]:
        subdir_path = os.path.join(BASE_DIR, subdir)
        if os.path.exists(subdir_path):
            for f in glob.glob(os.path.join(subdir_path, "*.py")):
                rel_path = os.path.relpath(f, BASE_DIR)
                normalized_path = rel_path.replace("\\", "/")
                content = get_file_content(rel_path)
                if content:
                    files[normalized_path] = content

    # Pre-process content for JS Template Literals
    escaped_files = {}
    for name, content in files.items():
        # Escape backslashes, backticks, and dollar signs for JS template literals
        escaped = content.replace("\\", "\\\\").replace("`", "\\`").replace("$", "\\$")
        escaped_files[name] = escaped

    # HTML Template for stlite
    template = """
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, shrink-to-fit=no"
    />
    <title>Hospital Management System - AI Powered</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@stlite/mountable@0.58.1/build/stlite.css"
    />
  </head>
  <body>
    <div id="root"></div>
    <script src="https://cdn.jsdelivr.net/npm/@stlite/mountable@0.58.1/build/stlite.js"></script>
    <script>
      stlite.mount(
        {
          requirements: ["python-dotenv", "pyodide-http", "requests"],
          entrypoint: "app.py",
          files: {
            {% for filename, content in files.items() %}
            "{{ filename }}": `{{ content | safe }}`{% if not loop.last %},{% endif %}
            {% endfor %}
          },
          streamlitConfig: {
            "server.address": "0.0.0.0",
            "server.port": "8501",
          },
        },
        document.getElementById("root")
      );
    </script>
  </body>
</html>
    """
    return render_template_string(template, files=escaped_files)

if __name__ == "__main__":
    app.run(debug=True)
