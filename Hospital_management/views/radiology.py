import streamlit as st
import pandas as pd
import json

def render_radiology(hospital):
    st.title("🩻 Radiology & Imaging Portal (PACS)")
    
    # Common scan types
    scan_types = ["Chest X-Ray", "Brain MRI", "CT Abdomen", "Ultrasound Pelvis", "Mammogram"]
    body_parts = ["Chest", "Brain", "Abdomen", "Pelvis", "Breast", "Limbs"]

    tab1, tab2 = st.tabs(["PACS Image Archive", "Analyze New Scan"])
    
    with tab1:
        st.subheader("PACS Imaging Records")
        records = hospital.get_all_radiology()
        if records:
            for r in records:
                ai_info = {}
                try:
                    if r['ai_prediction']:
                        ai_info = json.loads(r['ai_prediction'])
                except Exception:
                    pass
                
                header = f"🩻 {r['image_type']} ({r['body_part']}) - {r['patient_name']}"
                with st.expander(header):
                    st.write(f"**Referrer:** {r['doctor_name']}")
                    st.write(f"**PACS File Path:** `{r['file_path']}`")
                    st.write(f"**Timestamp:** {r['created_at']}")
                    
                    if r['doctor_notes']:
                        st.write(f"**Clinical Notes:** {r['doctor_notes']}")
                        
                    if ai_info:
                        st.subheader("🧠 AI Diagnostic Diagnostic Insights")
                        col1, col2 = st.columns(2)
                        with col1:
                            st.metric("Primary Classification", ai_info.get("classification", "Unknown"))
                        with col2:
                            st.metric("Confidence Probability", f"{ai_info.get('confidence', 0.0):.1f}%")
                        st.info(f"💡 **AI Recommendation Assistance:** {ai_info.get('clinical_suggestion', 'No suggestions')}")
        else:
            st.info("No radiology imaging records found. You can simulate an upload and AI scan in the next tab.")
            
    with tab2:
        st.subheader("Simulate PACS Image Analysis")
        patients = hospital.get_patients()
        doctors = hospital.get_doctors()
        
        patient_list = {p['name']: p['personal_id'] for p in patients} if patients else {}
        doctor_list = {f"Dr. {d['name']}": d['id'] for d in doctors} if doctors else {}
        
        if not patient_list or not doctor_list:
            st.warning("Ensure patients and doctors are registered before recording radiology imaging.")
        else:
            with st.form("radiology_simulation_form"):
                p_select = st.selectbox("Select Patient", list(patient_list.keys()))
                d_select = st.selectbox("Referring Doctor", list(doctor_list.keys()))
                img_type = st.selectbox("Modality (Scan Type)", scan_types)
                body_part = st.selectbox("Anatomical Body Part", body_parts)
                mock_file = st.text_input("PACS File Reference URL / Path", value="pacs://images/dcm/scan_ref_098.dcm")
                doc_notes = st.text_area("Initial Clinician Notes (optional)")
                
                # Dynamic AI analysis simulation checkbox
                run_ai = st.checkbox("Execute AI Computer Vision Classifier (Radiological Ihsan Assistance)", value=True)
                submit_scan = st.form_submit_button("Log Scan to PACS Repository")
                
                if submit_scan:
                    patient_db = hospital.patient_dal.get_patient_by_personal_id(patient_list[p_select])
                    doc_id = doctor_list[d_select]
                    
                    # Generate Mock AI analysis if selected
                    ai_payload = "{}"
                    if run_ai:
                        # Simple rule based mock classifications depending on image type
                        if img_type == "Chest X-Ray":
                            pred = {"classification": "Pneumonia Indicators Detected", "confidence": 88.5, "clinical_suggestion": "Consolidation observed in right lower lobe. Correlate with temperature logs and sputum cultures."}
                        elif img_type == "Brain MRI":
                            pred = {"classification": "Normal Structural Brain Tissue", "confidence": 97.2, "clinical_suggestion": "Symmetric cerebral hemispheres, normal ventricles. No acute pathology detected."}
                        elif img_type == "CT Abdomen":
                            pred = {"classification": "Possible Appendicitis", "confidence": 74.0, "clinical_suggestion": "Dilated fluid-filled appendix with wall thickening. Clinical correlation advised."}
                        else:
                            pred = {"classification": "Normal Scan", "confidence": 92.0, "clinical_suggestion": "Standard tissue integrity verified. No immediate annotations."}
                        ai_payload = json.dumps(pred)
                        
                    record_id = hospital.add_radiology_image(
                        patient_db['id'], doc_id, img_type, body_part, mock_file, ai_payload, doc_notes
                    )
                    st.success(f"Imaging record logged successfully! PACS Record ID: {record_id}")
                    if run_ai:
                        st.info("🧠 AI Classification complete. Review results in the PACS Image Archive tab.")
                        
                    hospital.log_audit(
                        st.session_state.get('username', 'system'),
                        "CREATE", "radiology_images", record_id, f"Uploaded radiology scan {img_type} for patient ID {patient_db['id']}"
                    )
                    st.rerun()
