import streamlit as st
from services.ai_service import get_ai_response

def render_appointments(hospital):
    st.title("Manage Appointments")
    
    role = st.session_state.get('role', 'patient')
    user_name = st.session_state.get('name', '')

    if role in ['admin', 'doctor']:
        tab1, tab2, tab3 = st.tabs(["Schedule", "Complete (AI Assisted)", "View All"])
    elif role == 'staff':
         tab1, tab3 = st.tabs(["Schedule", "View All"])
         tab2 = None
    else: # patient
        tab1, tab3 = st.tabs(["Schedule", "My Appointments"])
        tab2 = None
    
    with tab1:
        doctors = hospital.get_doctors()
        patients = hospital.get_patients()
        
        with st.form("schedule_appt_form"):
            doc_names = [f"Dr. {d['name']}" for d in doctors] if doctors else []
            pat_ids = [f"{p['name']} ({p['personal_id']})" for p in patients] if patients else []
            
            sel_doc = st.selectbox("Select Doctor", doc_names) if doc_names else None
            
            if role == 'patient':
                # Patient can only schedule for themselves
                st.write(f"Patient: **{user_name}**")
                sel_pat = user_name
            else:
                sel_pat = st.selectbox("Select Patient", pat_ids) if pat_ids else None
            date = st.date_input("Appointment Date")
            notes = st.text_area("Notes (optional)")
            
            submit = st.form_submit_button("Schedule")
            if submit:
                if sel_doc and sel_pat:
                    doc_name = sel_doc.replace("Dr. ", "")
                    if role == 'patient':
                        # Find the actual patient ID in the database for this name
                        p_match = next((p for p in patients if p['name'] == user_name), None)
                        if p_match:
                            pid = p_match['personal_id']
                        else:
                            st.error("Patient profile not found in system.")
                            return
                    else:
                        pid = sel_pat.split("(")[-1].replace(")", "")
                    success, msg = hospital.schedule_appointment(doc_name, pid, str(date), notes)
                    if success: 
                        st.success(msg)
                    else: 
                        st.error(msg)
                else:
                    st.warning("Ensure both doctors and patients exist.")

    if tab2:
        with tab2:
            st.markdown("### Complete Appointment")
            st.caption("Use Llama AI to suggest recommendations based on diagnosis.")
            
            appointments = hospital.get_appointments()
            pending_appts = [a for a in appointments if a['status'] == "Scheduled"]
            
            if pending_appts:
                appt_options = [f"{a['date']} - Dr. {a['doctor_name']} & Patient {a['patient_name']} ({a['patient_id']})" for a in pending_appts]
                sel_appt_str = st.selectbox("Select Appointment", appt_options)
                
                diagnosis = st.text_area("Diagnosis (Symptoms/Findings)")
                
                col1, col2 = st.columns(2)
                with col1:
                    generate_ai = st.button("🤖 Generate AI Recommendation")
                
                recommendation = st.session_state.get("ai_rec", "")
                
                if generate_ai and diagnosis:
                    with st.spinner("Llama AI is thinking..."):
                        prompt = f"Given the patient diagnosis: '{diagnosis}', provide a brief, professional medical recommendation and next steps (max 3 sentences)."
                        recommendation = get_ai_response(prompt)
                        st.session_state["ai_rec"] = recommendation
                
                rec_input = st.text_area("Recommendation", value=recommendation, height=100)
                
                if st.button("Mark as Completed"):
                    if diagnosis and rec_input:
                        # extract appointment ID from the selected string
                        # Format: "{date} - Dr. {doctor_name} & Patient {patient_name} ({patient_id})"
                        parts = sel_appt_str.split(" - ")
                        date_part = parts[0]
                        patient_part = parts[1].split("Patient ")[1]
                        pid = patient_part.split("(")[-1].replace(")", "")
                        
                        # Find the appointment ID
                        appt_id = None
                        for appt in pending_appts:
                            if appt['date'] == date_part and str(appt['patient_id']) == pid:
                                appt_id = appt['id']
                                break
                        
                        if appt_id:
                            success, msg = hospital.complete_appointment(appt_id, diagnosis, rec_input)
                            if success:
                                st.success(msg)
                                if "ai_rec" in st.session_state: 
                                    del st.session_state["ai_rec"]
                            else:
                                st.error(msg)
                        else:
                            st.error("Could not find appointment ID.")
                    else:
                        st.warning("Please provide both diagnosis and recommendation.")
            else:
                st.info("No pending appointments.")

    with tab3:
        appointments = hospital.get_appointments()
        if role == 'patient':
            # Filter for this specific patient
            appointments = [a for a in appointments if a['patient_name'] == user_name]
            
        if appointments:
            for appt in appointments:
                status_color = "green" if appt['status'] == "Completed" else "orange"
                with st.expander(f"📅 {appt['date']} - Dr. {appt['doctor_name']} & {appt['patient_name']}"):
                    st.markdown(f"**Status:** <span style='color:{status_color}'>{appt['status']}</span>", unsafe_allow_html=True)
                    st.markdown(f"**Appointment ID:** {appt['id']}")
                    st.markdown(f"**Doctor:** Dr. {appt['doctor_name']}")
                    st.markdown(f"**Patient:** {appt['patient_name']} (ID: {appt['patient_id']})")
                    if dict(appt).get('notes'):
                        st.markdown(f"**Notes:** {appt['notes']}")
                    
                    # Action buttons
                    col1, col2, col3 = st.columns(3)
                    
                    with col1:
                        if st.button(f"Edit", key=f"edit_{appt['id']}"):
                            st.session_state[f"edit_mode_{appt['id']}"] = True
                    
                    with col2:
                        if st.button(f"Reschedule", key=f"reschedule_{appt['id']}"):
                            st.session_state[f"reschedule_mode_{appt['id']}"] = True
                    
                    with col3:
                        if appt['status'] != "Completed":
                            if st.button(f"Delete", key=f"delete_{appt['id']}"):
                                success, msg = hospital.delete_appointment(appt['id'])
                                if success:
                                    st.success(msg)
                                    st.rerun()
                                else:
                                    st.error(msg)
                        else:
                            st.write("Cannot delete completed appointments")
                    
                    # Edit mode
                    if st.session_state.get(f"edit_mode_{appt['id']}", False):
                        st.markdown("---")
                        st.markdown("### Edit Appointment")
                        doctors = hospital.get_doctors()
                        patients = hospital.get_patients()
                        
                        doc_names = [f"Dr. {d['name']}" for d in doctors] if doctors else []
                        pat_ids = [f"{p['name']} ({p['personal_id']})" for p in patients] if patients else []
                        
                        current_doc = f"Dr. {appt['doctor_name']}"
                        current_pat = f"{appt['patient_name']} ({appt['patient_id']})"
                        
                        new_doc = st.selectbox("Doctor", doc_names, index=doc_names.index(current_doc) if current_doc in doc_names else 0)
                        new_pat = st.selectbox("Patient", pat_ids, index=pat_ids.index(current_pat) if current_pat in pat_ids else 0)
                        new_notes = st.text_area("Notes", value=dict(appt).get('notes', ''))
                        
                        col_save, col_cancel = st.columns(2)
                        with col_save:
                            if st.button("Save Changes", key=f"save_{appt['id']}"):
                                doc_name = new_doc.replace("Dr. ", "")
                                pid = new_pat.split("(")[-1].replace(")", "")
                                success, msg = hospital.update_appointment(appt['id'], doc_name, pid, None, new_notes)
                                if success:
                                    st.success(msg)
                                    st.session_state[f"edit_mode_{appt['id']}"] = False
                                    st.rerun()
                                else:
                                    st.error(msg)
                        
                        with col_cancel:
                            if st.button("Cancel", key=f"cancel_edit_{appt['id']}"):
                                st.session_state[f"edit_mode_{appt['id']}"] = False
                                st.rerun()
                    
                    # Reschedule mode
                    if st.session_state.get(f"reschedule_mode_{appt['id']}", False):
                        st.markdown("---")
                        st.markdown("### Reschedule Appointment")
                        new_date = st.date_input("New Date", key=f"date_{appt['id']}")
                        
                        col_save, col_cancel = st.columns(2)
                        with col_save:
                            if st.button("Reschedule", key=f"save_reschedule_{appt['id']}"):
                                success, msg = hospital.update_appointment(appt['id'], date=str(new_date))
                                if success:
                                    st.success(msg)
                                    st.session_state[f"reschedule_mode_{appt['id']}"] = False
                                    st.rerun()
                                else:
                                    st.error(msg)
                        
                        with col_cancel:
                            if st.button("Cancel", key=f"cancel_reschedule_{appt['id']}"):
                                st.session_state[f"reschedule_mode_{appt['id']}"] = False
                                st.rerun()
        else:
            st.info("No appointments scheduled.")
