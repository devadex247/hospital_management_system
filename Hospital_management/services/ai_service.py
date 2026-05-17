import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_ai_response(messages, system_message="You are a helpful hospital management assistant."):
    """
    Centralized function to handle AI inference. 
    Now accepts a list of messages to support conversation memory.
    """
    # Detect if we are running in the browser (stlite/pyodide)
    import sys
    is_browser = sys.platform == "emscripten"

    if is_browser:
        try:
            import pyodide_http
            pyodide_http.patch_all()
        except Exception:
            pass
        # Call the Flask API bridge we created in api/index.py
        import js
        try:
            base_url = js.window.location.origin
        except AttributeError:
            base_url = js.self.location.origin
        
        api_url = f"{base_url}/api/chat"
        try:
            # Send the full message list to the backend
            response = requests.post(api_url, json={"messages": messages, "system_message": system_message})
        except Exception as e:
            return f"Browser request error: {str(e)}"
        if response.status_code == 200:
            return response.json().get("response")
        else:
            return f"API Error: {response.text}"
    else:
        # Server side (Native Streamlit)
        try:
            from openai import OpenAI
        except ImportError:
            return "Server AI Error: 'openai' library not installed. Please run 'pip install openai'."
        
        hf_token = os.environ.get("HF_TOKEN")
        if not hf_token:
            return "Server AI Error: HF_TOKEN not found in .env file."

        try:
            client = OpenAI(
                base_url="https://router.huggingface.co/v1",
                api_key=hf_token,
            )
            
            # Combine system message with the conversation history
            full_messages = [{"role": "system", "content": system_message}] + messages
            
            completion = client.chat.completions.create(
                model="meta-llama/Llama-3.1-8B-Instruct",
                messages=full_messages,
            )
            return completion.choices[0].message.content
        except Exception as e:
            return f"Server AI Error: {str(e)}"
