import streamlit as st
import pandas as pd

def render_laboratory(hospital):
    st.title("🔬 Laboratory & Diagnostics Portal")
    
    # Static list of common LOINC codes for lookup helper
    loinc_codes = {
        "Lipid Panel (HDL, LDL, Triglycerides)": "24331-1",
        "Complete Blood Count (CBC) with differential": "58410-2",
        "Hemoglobin A1c / Total Hemoglobin": "4548-4",
        "Basic Metabolic Panel (BMP)": "24320-4",
        "Thyroid Stimulating Hormone (TSH)": "11579-0",
        "Urinalysis Complete": "24357-6",
        "Renal Function Panel": "24362-6",
        "Liver Panel (Hepatic Function)": "24325-3"
    }

    tab1, tab2, tab3 = st.tabs(["Lab Orders & History", "Create Lab Order", "Record Lab Results"])
    
    with tab1:
        st.subheader("Lab Diagnostics Log")
        orders = hospital.get_all_lab_orders()
        if orders:
            # Map into a clean dataframe
            data = []
            for o in orders:
                data.append({
                    "Order ID": o["id"],
                    "Patient": o["patient_name"],
                    "Doctor": o["doctor_name"],
                    "Test Name": o["test_name"],
                    "LOINC Code": o["loinc_code"],
                    "Status": o["status"],
                    "Result Note": o["result"] if o["result"] else "N/A",
                    "Ordered On": o["created_at"]
                })
            df = pd.DataFrame(data)
            st.dataframe(df, use_container_width=True)
        else:
            st.info("No laboratory records found in the database. You can order a new test in the next tab.")
            
    with tab2:
        st.subheader("Request Diagnostic Test")
        patients = hospital.get_patients()
        doctors = hospital.get_doctors()
        
        patient_list = {p['name']: p['personal_id'] for p in patients} if patients else {}
        doctor_list = {f"Dr. {d['name']}": d['id'] for d in doctors} if doctors else {}
        
        if not patient_list or not doctor_list:
            st.warning("Ensure patients and doctors are registered before creating lab orders.")
        else:
            with st.form("create_lab_order_form"):
                p_select = st.selectbox("Select Patient", list(patient_list.keys()))
                d_select = st.selectbox("Ordering Physician", list(doctor_list.keys()))
                
                # Test selection helper
                test_option = st.selectbox("Common Diagnostic Panels", list(loinc_codes.keys()) + ["Custom Test"])
                if test_option == "Custom Test":
                    test_name = st.text_input("Custom Test Name (e.g. Vitamin D)")
                    loinc_code = st.text_input("LOINC Code (e.g. 62238-1)")
                else:
                    test_name = test_option
                    loinc_code = loinc_codes[test_option]
                    st.write(f"Selected LOINC: **{loinc_code}**")
                    
                submit_order = st.form_submit_button("Submit Lab Request")
                
                if submit_order:
                    if test_name and loinc_code:
                        patient_db = hospital.patient_dal.get_patient_by_personal_id(patient_list[p_select])
                        doc_id = doctor_list[d_select]
                        
                        order_id = hospital.add_lab_order(patient_db['id'], doc_id, test_name, loinc_code)
                        st.success(f"Lab order created successfully! Order ID: {order_id}")
                        hospital.log_audit(
                            st.session_state.get('username', 'system'),
                            "CREATE", "lab_orders", order_id, f"Ordered {test_name} for patient ID {patient_db['id']}"
                        )
                        st.rerun()
                    else:
                        st.error("Please specify a test name and LOINC code.")
                        
    with tab3:
        st.subheader("Process Lab Results")
        pending_orders = [o for o in hospital.get_all_lab_orders() if o['status'] == 'Pending']
        
        if pending_orders:
            order_options = {f"Order #{o['id']} - {o['test_name']} for {o['patient_name']}": o['id'] for o in pending_orders}
            selected_desc = st.selectbox("Select Pending Lab Request", list(order_options.keys()))
            selected_id = order_options[selected_desc]
            
            with st.form("complete_lab_order_form"):
                results_text = st.text_area("Lab Test Observations & Values (e.g. Cholesterol: 180 mg/dL, HDL: 50 mg/dL)")
                submit_results = st.form_submit_button("Record Results & Complete Order")
                
                if submit_results:
                    if results_text:
                        hospital.complete_lab_order(selected_id, results_text)
                        st.success(f"Results recorded. Lab order #{selected_id} completed.")
                        hospital.log_audit(
                            st.session_state.get('username', 'system'),
                            "UPDATE", "lab_orders", selected_id, f"Completed test results: {results_text[:100]}"
                        )
                        st.rerun()
                    else:
                        st.error("Please enter the lab result values.")
        else:
            st.info("No pending lab orders. All requests are completed!")
