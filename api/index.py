import traceback
import sys

try:
    import os
    from dotenv import load_dotenv
    load_dotenv()
    import glob
    from openai import OpenAI
    from flask import Flask, render_template_string, request, jsonify, send_from_directory

    app = Flask(__name__)

    # Hugging Face inference router client (OpenAI-compatible) - Lazy Initialized
    def get_hf_client():
        token = os.environ.get("HF_TOKEN", "")
        if not token:
            raise ValueError("HF_TOKEN environment variable is missing. Please set your Hugging Face Token in the Vercel Dashboard Settings.")
        return OpenAI(
            base_url="https://router.huggingface.co/v1",
            api_key=token,
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
        messages = data.get("messages", [])
        system_message = data.get("system_message", "You are a helpful hospital management assistant.")
        
        try:
            # Build message history with the system message
            full_messages = [{"role": "system", "content": system_message}] + messages
            
            # Initialize client lazily to prevent startup errors
            client = get_hf_client()
            
            # Qwen 2.5 7B - Corrected ID
            completion = client.chat.completions.create(
                model="Qwen/Qwen2.5-7B-Instruct",
                messages=full_messages,
            )
            resp = jsonify({"response": completion.choices[0].message.content})
            resp.headers.add("Access-Control-Allow-Origin", "*")
            return resp
        except Exception as e:
            resp = jsonify({"error": str(e)})
            resp.headers.add("Access-Control-Allow-Origin", "*")
            return resp, 500

    # Base directory for the hospital management app
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Hospital_management"))

    def get_file_content(path):
        full_path = os.path.join(BASE_DIR, path)
        if os.path.exists(full_path):
            with open(full_path, "r", encoding="utf-8") as f:
                return f.read()
        return ""

    @app.route("/")
    def landing():
        """Serve the landing page"""
        content = get_file_content("index.html")
        if not content:
            return "Landing page not found", 404
        return render_template_string(content)

    @app.route("/login")
    def login():
        """Serve the custom login page"""
        content = get_file_content("login.html")
        if not content:
            return "Login page not found", 404
        
        return render_template_string(content)

    @app.route("/app")
    def streamlit_app():
        """Serve the stlite (Streamlit in WASM) application"""
        files = {}
        
        # Add root files
        for f in ["app.py", "models.py", "hospital_manager.py", "config.yaml"]:
            content = get_file_content(f)
            if content:
                files[f] = content
            
        # Add files from subdirectories (including .py and .sql)
        for subdir in ["views", "services", "utils", "database"]:
            subdir_path = os.path.join(BASE_DIR, subdir)
            if os.path.exists(subdir_path):
                # Find all files in the subdirectory
                for root, dirs, filenames in os.walk(subdir_path):
                    for filename in filenames:
                        if filename.endswith(".py") or filename.endswith(".sql"):
                            f_path = os.path.join(root, filename)
                            rel_path = os.path.relpath(f_path, BASE_DIR)
                            normalized_path = rel_path.replace("\\", "/")
                            with open(f_path, "r", encoding="utf-8") as f:
                                content = f.read()
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
      href="https://cdn.jsdelivr.net/npm/@stlite/mountable@0.72.0/build/stlite.css"
    />
    <style>
        body { margin: 0; padding: 0; background: #0F172A; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script src="https://cdn.jsdelivr.net/npm/@stlite/mountable@0.72.0/build/stlite.js"></script>
    <script>
      stlite.mount(
        {
          requirements: ["python-dotenv", "pyodide-http", "requests", "PyYAML", "sqlite3"],
          entrypoint: "app.py",
          files: {
            {% for filename, content in files.items() %}
            "{{ filename }}": `{{ content | safe }}`{% if not loop.last %},{% endif %}
            {% endfor %}
          },
          streamlitConfig: {
            "server.address": "0.0.0.0",
            "server.port": "8501",
            "theme.base": "dark",
            "theme.primaryColor": "#0EA5E9",
            "theme.backgroundColor": "#0F172A",
            "theme.secondaryBackgroundColor": "#1E293B",
            "theme.textColor": "#F8FAFC"
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

except Exception as startup_error:
    from flask import Flask
    app = Flask(__name__)
    
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def catch_all(path):
        error_tb = traceback.format_exc()
        return f"""
        <html>
        <head><title>HMS Startup Debugger</title></head>
        <body style="font-family: monospace; padding: 20px; background: #0f172a; color: #f8fafc;">
            <h1 style="color: #ef4444;">Hospital Management System Startup Error</h1>
            <p>The serverless function failed to initialize. Here is the exact Python traceback:</p>
            <pre style="background: #1e293b; padding: 15px; border-radius: 5px; border: 1px solid #334155; overflow-x: auto; font-size: 14px; color: #f8fafc; white-space: pre-wrap;">{error_tb}</pre>
            <p><strong>Steps to fix:</strong> Check if a module is missing from your requirements.txt or if an environment variable is invalid.</p>
        </body>
        </html>
        """, 500
