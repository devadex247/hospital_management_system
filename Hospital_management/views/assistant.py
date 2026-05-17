import streamlit as st
import os, sys

# Ensure the project root is on sys.path so relative imports work
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from services.ai_service import get_ai_response

def render_assistant(hospital):
    st.title("🤖 MedOs AI Assistant")
    st.markdown("Your intelligent Hospital Management companion.")

    username = st.session_state.get('username', 'guest')
    
    # --- Session Management ---
    if 'current_session_id' not in st.session_state:
        st.session_state.current_session_id = None

    # Sidebar for chat history
    st.sidebar.subheader("💬 Conversations")
    
    if st.sidebar.button("➕ New Chat", use_container_width=True):
        st.session_state.current_session_id = None
        st.rerun()

    sessions = hospital.chat_dal.get_sessions_by_user(username)
    
    for sess in sessions:
        col1, col2 = st.sidebar.columns([0.8, 0.2])
        if col1.button(f"📄 {sess['title'][:20]}...", key=f"sess_{sess['id']}", use_container_width=True):
            st.session_state.current_session_id = sess['id']
            st.rerun()
        if col2.button("🗑️", key=f"del_sess_{sess['id']}"):
            hospital.chat_dal.delete_session(sess['id'])
            if st.session_state.current_session_id == sess['id']:
                st.session_state.current_session_id = None
            st.rerun()

    # Load messages for current session
    messages = []
    if st.session_state.current_session_id:
        db_messages = hospital.chat_dal.get_messages(st.session_state.current_session_id)
        messages = [{"role": msg['role'], "content": msg['content']} for msg in db_messages]
    else:
        messages = [{"role": "assistant", "content": "Hello! I am **MedOs AI**, your hospital assistant. How can I help you today?"}]

    # Display chat
    for message in messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # Chat Input
    if prompt := st.chat_input("Ask MedOs AI anything..."):
        # Create session if it doesn't exist
        if not st.session_state.current_session_id:
            title = prompt[:30] + ("..." if len(prompt) > 30 else "")
            st.session_state.current_session_id = hospital.chat_dal.create_session(username, title)
            # Add initial assistant message to DB
            hospital.chat_dal.add_message(st.session_state.current_session_id, "assistant", "Hello! I am **MedOs AI**, your hospital assistant. How can I help you today?")
        
        # Save user message
        hospital.chat_dal.add_message(st.session_state.current_session_id, "user", prompt)
        
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            message_placeholder = st.empty()
            
            # Context building
            doctors = hospital.get_doctors()
            patients = hospital.get_patients()
            doc_info = "\n".join([f"- Dr. {d['name']} ({d['specialization']})" for d in doctors]) if doctors else "None"
            pat_info = "\n".join([f"- {p['name']} (ID: {p['personal_id']})" for p in patients]) if patients else "None"
            
            context = f"""
            CURRENT HOSPITAL STATE:
            Doctors ({len(doctors)}):
            {doc_info}
            
            Patients ({len(patients)}):
            {pat_info}
            """
            
            # Dynamic role-based instructions
            role = st.session_state.get('role', 'patient')
            user_name = st.session_state.get('name', 'User')
            
            role_instruction = ""
            if role == 'admin':
                role_instruction = "The user is an ADMINISTRATOR. Give them full oversight and 'super access' to hospital metrics and database summaries. Be extremely professional and data-driven."
            elif role == 'doctor':
                role_instruction = f"The user is a DOCTOR (Dr. {user_name}). Speak to them as a colleague. Provide detailed medical context and patient summaries. Never treat them like a patient."
            else:
                role_instruction = f"The user is a PATIENT ({user_name}). Use clear, non-technical language. Be empathetic and helpful. Never speak to them using complex medical jargon meant for doctors."

            system_msg = (
                f"You are 'MedOs AI', the expert Medical Assistant for this Hospital. Always identify yourself as MedOs AI. "
                f"{role_instruction} "
                "ARCHITECTURE INFO: You run on a revolutionary serverless architecture (WASM via stlite). Logic is in the browser; backend is a stateless proxy. "
                "CONCISE MODE: Always respond in a concise, informative manner. "
                "REAL DATA ONLY: Use the following hospital data. NEVER hallucinate names or records. "
                "If a person is not listed below, they are not registered in our system. "
                "\n" + context
            )
            
            # Prepare conversation history for the AI (limit to last 10 for performance)
            history = hospital.chat_dal.get_messages(st.session_state.current_session_id)
            ai_messages = [{"role": m['role'], "content": m['content']} for m in history]
            
            response = get_ai_response(ai_messages, system_message=system_msg)
            
            message_placeholder.markdown(response)
            
            # Save AI response
            hospital.chat_dal.add_message(st.session_state.current_session_id, "assistant", response)
