import streamlit as st
st.set_page_config(page_title="Hospital Management System", page_icon="🏥", layout="wide")

from hospital_manager import get_initial_hospital
from utils.styles import apply_custom_styles
from views.dashboard import render_dashboard
from views.doctors import render_doctors
from views.patients import render_patients
from views.appointments import render_appointments
from views.assistant import render_assistant
from dotenv import load_dotenv
import yaml
import os, sys

# Load environment variables (like API keys)
load_dotenv()

# --- WASM Detection ---
IS_WASM = sys.platform == "emscripten"

# --- Authentication Setup ---
@st.cache_resource
def load_auth_config():
    try:
        with open('config.yaml') as file:
            config = yaml.safe_load(file)
        return config
    except Exception:
        # Fallback if config.yaml is missing
        return {
            'credentials': {
                'usernames': {
                    'admin': {'name': 'Administrator', 'password': 'admin123', 'role': 'admin'},
                    'doctor': {'name': 'Dr. Smith', 'password': 'doctor123', 'role': 'doctor'},
                    'staff': {'name': 'Staff Member', 'password': 'staff123', 'role': 'staff'},
                    'patient': {'name': 'Patient User', 'password': 'patient123', 'role': 'patient'}
                }
            }
        }

config = load_auth_config()

def simple_login():
    """A simple login form for WASM/stlite to avoid bcrypt issues"""
    st.markdown("""
        <style>
        .login-container {
            max-width: 400px;
            margin: 0 auto;
            padding: 2rem;
            background: rgba(30, 41, 59, 0.7);
            border-radius: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        </style>
    """, unsafe_allow_html=True)
    
    with st.form("login_form"):
        st.subheader("🏥 MedOS Login")
        user = st.text_input("Username")
        pw = st.text_input("Password", type="password")
        submit = st.form_submit_button("Sign In", use_container_width=True)
        
        if submit:
            usernames = config['credentials']['usernames']
            if user in usernames and usernames[user]['password'] == pw:
                st.session_state['authentication_status'] = True
                st.session_state['username'] = user
                st.session_state['name'] = usernames[user]['name']
                st.rerun()
            else:
                st.error("Invalid username or password")

# --- Configuration & Styling ---
apply_custom_styles()

# --- Authentication Logic ---
if 'authentication_status' not in st.session_state:
    st.session_state['authentication_status'] = None

if IS_WASM:
    # Check for URL parameters for auto-login (from custom login page)
    # Support for both new and experimental query params API
    try:
        params = st.query_params if hasattr(st, "query_params") else st.experimental_get_query_params()
    except Exception:
        params = {}
        
    if not st.session_state.get('authentication_status'):
        if "username" in params and "password" in params:
            # Handle list-style params from experimental API
            user = params["username"][0] if isinstance(params["username"], list) else params["username"]
            pw = params["password"][0] if isinstance(params["password"], list) else params["password"]
            
            usernames = config['credentials']['usernames']
            if user in usernames and usernames[user]['password'] == pw:
                st.session_state['authentication_status'] = True
                st.session_state['username'] = user
                st.session_state['name'] = usernames[user]['name']
                # Clear params
                if hasattr(st, "query_params"):
                    try:
                        st.query_params.clear()
                    except Exception:
                        pass
                st.rerun()
        
        if not st.session_state.get('authentication_status'):
            simple_login()
else:
    # Use standard authenticator for local development
    try:
        from streamlit_authenticator import Authenticate
        authenticator = Authenticate(
            config['credentials'],
            config['cookie']['name'],
            config['cookie']['key'],
            config['cookie']['expiry_days']
        )
        authenticator.login(location='main')
    except ImportError:
        simple_login()

authentication_status = st.session_state.get('authentication_status')
username = st.session_state.get('username')
name = st.session_state.get('name')

try:
    if authentication_status:
        role = config['credentials']['usernames'].get(username, {}).get('role', 'patient') if username else 'patient'
        st.session_state['role'] = role

        # --- State Management ---
        if 'hospital' not in st.session_state:
            st.session_state['hospital'] = get_initial_hospital()
        hospital = st.session_state['hospital']

        # --- Navigation ---
        st.sidebar.title(f"🏥 HMS Navigation")
        
        if st.sidebar.button("Logout"):
            st.session_state['authentication_status'] = None
            st.session_state['username'] = None
            st.rerun()

        st.sidebar.markdown(f"Welcome, **{name}**!")
        st.sidebar.markdown("---")
        
        # --- RBAC Menu Filtering ---
        if role == 'admin':
            menu = ["📊 Dashboard", "👨‍⚕️ Doctors", "🩺 Patients", "📅 Appointments", "🤖 AI Assistant"]
        elif role == 'doctor':
            menu = ["📊 Dashboard", "👨‍⚕️ Doctors", "🩺 Patients", "📅 Appointments", "🤖 AI Assistant"]
        elif role == 'staff':
            menu = ["📊 Dashboard", "🩺 Patients", "📅 Appointments"]
        elif role == 'patient':
            menu = ["📅 Appointments", "🤖 AI Assistant"]
        else:
            menu = ["🤖 AI Assistant"]

        choice = st.sidebar.radio("Go to", menu)

        st.sidebar.markdown("---")
        
        if role == 'admin':
            if st.sidebar.button("🗑️ Reset Database", type="secondary"):
                # Second confirmation to avoid accidental resets
                if st.sidebar.checkbox("I understand this will delete all data"):
                    success, msg = hospital.reset_database()
                    if success:
                        st.sidebar.success(msg)
                        st.rerun()
                    else:
                        st.sidebar.error(msg)

        st.sidebar.info(f"Access Level: **{role.capitalize()}**")

        # --- Page Routing ---
        if choice == "📊 Dashboard":
            render_dashboard(hospital)
        elif choice == "👨‍⚕️ Doctors":
            render_doctors(hospital)
        elif choice == "🩺 Patients":
            render_patients(hospital)
        elif choice == "📅 Appointments":
            render_appointments(hospital)
        elif choice == "🤖 AI Assistant":
            render_assistant(hospital)

    elif authentication_status == False:
        st.error('Username/password is incorrect')
except Exception as e:
    st.error(f"⚠️ Application Error: {str(e)}")
    import traceback
    st.code(traceback.format_exc())
