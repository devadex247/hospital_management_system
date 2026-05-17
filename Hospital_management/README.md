# Hospital Management System (AI-Powered)

An advanced, AI-powered Hospital Management System built with Python, Streamlit, and Flask, designed for deployment on Vercel. The application features a serverless backend and a fully browser-native frontend via `stlite`, making it highly accessible, lightweight, and easy to deploy.

## 🏗 Architecture Overview

The system is split into two primary paradigms: an API-driven Flask backend and a responsive Streamlit frontend powered by WebAssembly (`stlite`). 

### 1. Frontend: Streamlit & stlite (WebAssembly)
Located in `Hospital_management/`, the frontend provides a comprehensive UI for hospital administration:
- **Streamlit**: Used to build interactive and data-rich user interfaces.
- **stlite Integration**: The Streamlit app is mounted directly into the browser using `@stlite/mountable`. This allows the Python frontend code to run entirely client-side using WebAssembly (Pyodide), drastically reducing server overhead and enabling a seamless, App-like experience.
- **Views & Routing**: Modular UI components are separated into `views/` (Dashboard, Doctors, Patients, Appointments, AI Assistant).
- **Authentication**: Secure login and session management powered by `streamlit-authenticator` (configured via `config.yaml`).

### 2. Backend: Flask (Serverless API)
Located in `api/index.py`, the backend serves two critical roles:
- **Frontend Serving**: Dynamically loads the Python source files from the `Hospital_management/` directory, injects them into an HTML template, and serves the `stlite` WebAssembly environment.
- **AI Chat Endpoint**: Exposes a `/api/chat` route to facilitate AI assistance. It acts as a proxy, safely calling a Hugging Face router model (`Qwen/Qwen2.5-72B-Instruct:novita` via an OpenAI-compatible client) without exposing API keys to the client-side WebAssembly environment.

### 3. Database: SQLite & Data Access Layer (DAL)
- **Data Persistence**: Uses a local `SQLite` database (`hospital_management.db`).
- **DAL Pattern**: Database operations are abstracted into specific Data Access Layers (`DepartmentDAL`, `DoctorDAL`, `PatientDAL`, `AppointmentDAL`, `MedicalRecordDAL`) located in `database/dal.py`.
- **Hospital Manager API**: The `hospital_manager.py` file acts as the primary service layer, orchestrating the DAL operations to provide high-level methods (e.g., `schedule_appointment`, `add_patient`).

## 🛠 Tech Stack & Tools

- **Core Frameworks**: [Streamlit](https://streamlit.io/) (Frontend), [Flask](https://flask.palletsprojects.com/) (Backend / API).
- **WebAssembly Runtime**: [stlite](https://github.com/whitphx/stlite) (Serverless Streamlit via Pyodide).
- **AI Integration**: [Hugging Face Router](https://huggingface.co/) (Model hosting), [Qwen 2.5](https://qwenlm.github.io/) (LLM), [LiteLLM](https://docs.litellm.ai/) / OpenAI client.
- **Database**: SQLite3, raw SQL with Python `sqlite3`.
- **Authentication**: `streamlit-authenticator`, `yaml` configuration.
- **Environment Management**: `python-dotenv`.
- **Deployment**: [Vercel](https://vercel.com/) Serverless Functions (`vercel.json`).

## 📂 Project Structure

```text
Hospital_Management_System/
├── api/
│   └── index.py                 # Flask serverless API & stlite HTML renderer
├── Hospital_management/
│   ├── app.py                   # Main Streamlit application entry point
│   ├── hospital_manager.py      # Core service layer / DAL orchestrator
│   ├── models.py                # Data models / dataclasses
│   ├── config.yaml              # Streamlit authenticator configurations
│   ├── requirements.txt         # Python dependencies
│   ├── database/                # SQLite DB and DAL classes
│   │   ├── dal.py               # Data Access Layer implementations
│   │   ├── connection.py        # SQLite connection management
│   │   ├── schema.sql           # Database schema definition
│   │   └── hospital_management.db
│   ├── views/                   # Streamlit UI pages (Dashboard, Patients, etc.)
│   ├── services/                # Background services / utilities
│   └── utils/                   # Helper functions and custom styles
├── vercel.json                  # Vercel deployment configuration
└── requirements.txt             # Project root dependencies
```

## 🚀 Getting Started (Local Development)

### Prerequisites
- Python 3.9+
- pip (Python package installer)

### Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Hospital_Management_System
   ```

2. **Set up a Virtual Environment:**
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables:**
   Create a `.env` file in the root directory (and inside `Hospital_management/`) and add your API keys:
   ```env
   HF_TOKEN=your_huggingface_router_token
   ```

### Running the Application

You can run the application in two ways:

**Method 1: Hybrid Flask Server (Production-Ready with Landing Page)**
This is the recommended way to run the full experience. It serves the **MedOS Landing Page** at the root and the AI application in WASM.
```bash
# From the project root
python api/index.py
```
*Access the **Landing Page** at: http://127.0.0.1:5000*  
*Access the **AI Application** at: http://127.0.0.1:5000/app*

**Method 2: Standard Streamlit (Standard Development)**
Run the Streamlit app conventionally for quick UI debugging and persistent local database access.
```bash
cd Hospital_management
streamlit run app.py
```
*Access the app at: http://localhost:8501*

## 🌐 Landing Page
The project now includes a premium, high-fidelity landing page served at the root route (`/`). It features:
- **Interactive Architecture Flow**: A real-time visualizer showing how the WASM client securely communicates with the AI proxy layer.
- **Modern Medical Aesthetic**: Dark mode, glassmorphism, and smooth animations powered by Tailwind CSS.
- **Technical Specifications**: Integrated documentation tabs for Frontend (stlite), Backend (Flask), and Database (DAL).
- **Direct App Integration**: Seamless navigation to the `/app` route for launching the WASM client.


## ☁️ Deployment

This project is optimized for deployment on Vercel using Serverless Functions.

1. Install the Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. Link and deploy:
   ```bash
   vercel
   ```
   *Note: Ensure your `HF_TOKEN` and other required environment variables are added to your Vercel project settings.*

The `vercel.json` file configures the routing, directing all traffic to the `api/index.py` serverless function.

## 🔐 Security Features
- **Stateless Authentication**: Session state handling securely backed by hashed YAML credentials.
- **Proxy AI Requests**: The LLM API requests are routed through the Flask backend (`/api/chat`), preventing API keys from being exposed to the client's browser in the Pyodide/stlite environment.
