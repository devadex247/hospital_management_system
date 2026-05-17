import streamlit as st

def render_patients(hospital):
    st.title("Manage Patients")
    
    tab1, tab2 = st.tabs(["View Patients", "Add Patient"])
    
    with tab1:
        patients = hospital.get_patients()
        if patients:
            for p in patients:
                with st.expander(f"Patient: {p['name']} (ID: {p['personal_id']})"):
                    if dict(p).get('email'):
                        st.write(f"**Email:** {p['email']}")
                    if dict(p).get('phone'):
                        st.write(f"**Phone:** {p['phone']}")
                    if dict(p).get('date_of_birth'):
                        st.write(f"**Date of Birth:** {p['date_of_birth']}")
                    if dict(p).get('address'):
                        st.write(f"**Address:** {p['address']}")
                    
                    # Get medical records
                    medical_records = hospital.get_patient_medical_records(p['personal_id'])
                    if medical_records:
                        st.markdown("**Medical Records:**")
                        for idx, rec in enumerate(medical_records, 1):
                            st.markdown(f"**Record {idx}:**")
                            st.write(f"- **Diagnosis:** {rec['diagnosis']}")
                            st.write(f"- **Recommendation:** {rec['recommendation']}")
                            if dict(rec).get('appointment_date'):
                                st.write(f"- **Date:** {rec['appointment_date']}")
                    else:
                        st.write("No medical records found.")
                    
                    if st.session_state.get('role') in ['admin', 'staff']:
                        if st.button(f"Delete Patient {p['name']}", key=f"del_pat_{p['id']}"):
                            success, msg = hospital.delete_patient(p['id'])
                            if success:
                                st.success(msg)
                                st.rerun()
                            else:
                                st.error(msg)
        else:
            st.info("No patients available.")
            
    with tab2:
        if st.session_state.get('role') == 'patient':
            st.warning("Patients cannot add other patients.")
        else:
            with st.form("add_pat_form"):
                name = st.text_input("Patient Name")
                pid = st.text_input("Personal ID")
                email = st.text_input("Email (optional)")
                phone = st.text_input("Phone (optional)")
                dob = st.date_input("Date of Birth (optional)")
                address = st.text_area("Address (optional)")
                submit = st.form_submit_button("Add Patient")
                
                if submit:
                    if name and pid:
                        # check if exists
                        patients = hospital.get_patients()
                        if any(pat['personal_id'] == pid for pat in patients):
                            st.error("Patient ID already exists!")
                        else:
                            success, msg = hospital.add_patient(name, pid, email, phone, str(dob) if dob else None, address)
                            if success:
                                st.success(msg)
                            else:
                                st.error(msg)
                    else:
                        st.warning("Please fill all required fields.")
