# 🚀 Deploying HMS to Vercel

This guide explains how to deploy your **Hospital Management System** (Streamlit) to **Vercel**. 

Since Vercel is designed for serverless functions and Streamlit typically requires a persistent server, we use a **Flask wrapper** combined with **stlite** (a WebAssembly-powered Streamlit) to enable seamless deployment.

---

## 🛠️ Step 1: Project Structure
Ensure your project has the following files in the root directory:
- `vercel.json`: Configuration for the Vercel runtime.
- `api/index.py`: The Flask entry point that boots the Streamlit app.
- `requirements.txt`: Python dependencies.
- `Hospital_management/`: Your original source code folder.

---

## ☁️ Step 2: Vercel Project Setup

1.  **Install Vercel CLI**:
    ```bash
    npm i -g vercel
    ```
2.  **Initialize Vercel**:
    Open your terminal in the project root and run:
    ```bash
    vercel
    ```
    - Follow the prompts to log in and link your project.
    - When asked "Want to modify any settings?", select **No** (the `vercel.json` handles everything).

---

## 🔑 Step 3: Configuring Environment Variables

Your app uses `.env` for AI integration. Since `.env` files should not be uploaded to Vercel, you must set these variables in the Vercel Dashboard:

1.  Go to your **Project Settings** on Vercel.
2.  Select **Environment Variables**.
3.  Add the following (based on your `.env.example`):
    - `OLLAMA_BASE_URL`: Your remote Ollama endpoint (e.g., a public URL via Ngrok).
    - `OLLAMA_API_KEY`: Your API key if applicable.
    - *Optional*: Any other keys used by `litellm` (e.g., `OPENAI_API_KEY`, `GROQ_API_KEY`).

> [!IMPORTANT]
> Since this app runs via **stlite** in the browser, ensure your AI provider allows **CORS** from your Vercel domain. If using local Ollama, you must use a proxy or tunnel.

---

## 🚀 Step 4: Final Deployment

To deploy to production, run:
```bash
vercel --prod
```

---

## 🛠️ Troubleshooting Common Issues

### 1. App stuck on "Loading..."
- Check the browser console (F12). 
- If you see `ModuleNotFoundError`, ensure all required packages are listed in the `requirements` array inside `api/index.py`.

### 2. AI Assistant Error
- Vercel's serverless environment cannot reach `localhost`. If you are using Ollama locally, you must provide a public URL (e.g., using [Ngrok](https://ngrok.com/)) and update `OLLAMA_BASE_URL` in Vercel settings.

### 3. Module Imports Not Found
- The `api/index.py` script automatically maps files in `views/`, `services/`, and `utils/`. If you add new directories, update the `for subdir in [...]` loop in `api/index.py`.

---

## 💡 Recommendation
For the best Streamlit experience (especially for complex AI integrations and persistent state), we highly recommend **Streamlit Community Cloud**. However, this Vercel setup provides a powerful way to host your app alongside other Vercel-hosted services.
