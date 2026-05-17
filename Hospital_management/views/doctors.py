import streamlit as st

def render_doctors(hospital):
    st.title("Manage Doctors")
    
    tab1, tab2 = st.tabs(["View Doctors", "Add Doctor"])
    
    with tab1:
        doctors = hospital.get_doctors()
        if doctors:
            for doc in doctors:
                with st.expander(f"Dr. {doc['name']} - {doc['specialization']}"):
                    dept_name = dict(doc).get('department_name', 'No Department')
                    st.write(f"**Department:** {dept_name}")
                    if dict(doc).get('email'):
                        st.write(f"**Email:** {doc['email']}")
                    if dict(doc).get('phone'):
                        st.write(f"**Phone:** {doc['phone']}")
                    
                    if st.session_state.get('role') == 'admin':
                        if st.button(f"Delete Dr. {doc['name']}", key=f"del_doc_{doc['id']}"):
                            success, msg = hospital.delete_doctor(doc['id'])
                            if success:
                                st.success(msg)
                                st.rerun()
                            else:
                                st.error(msg)
        else:
            st.info("No doctors available. Add one in the next tab.")
            
    with tab2:
        if st.session_state.get('role') != 'admin':
            st.warning("Only administrators can add new doctors.")
        else:
            departments = hospital.get_departments()
            dept_names = [d['name'] for d in departments] if departments else []
            
            with st.form("add_doc_form"):
                name = st.text_input("Doctor's Name")
                spec = st.text_input("Specialization")
                dept = st.selectbox("Department", dept_names) if dept_names else st.text_input("Department Name")
                email = st.text_input("Email (optional)")
                phone = st.text_input("Phone (optional)")
                submit = st.form_submit_button("Add Doctor")
                
                if submit:
                    if name and spec and dept:
                        success, msg = hospital.add_doctor(name, spec, dept, email, phone)
                        if success: 
                            st.success(msg)
                        else: 
                            st.error(msg)
                    else:
                        st.warning("Please fill all required fields.")
