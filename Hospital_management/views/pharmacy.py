import streamlit as st
import pandas as pd

def render_pharmacy(hospital):
    st.title("💊 Pharmacy & Inventory Management")
    
    # 1. Low Stock Alert Banner
    low_stock = hospital.get_low_stock_items()
    if low_stock:
        st.warning(f"⚠️ Warning: {len(low_stock)} items are below the minimum threshold. Please restock immediately.")
        
    tab1, tab2, tab3 = st.tabs(["Stock Inventory", "Dispense & Prescribe", "Restock Medicine"])
    
    with tab1:
        st.subheader("Current Stock Levels")
        inventory = hospital.get_all_inventory()
        if inventory:
            # Map database list of dicts to a clean table
            df = pd.DataFrame(inventory)
            df.columns = ["ID", "Item Name", "Quantity Available", "Unit", "Min Threshold", "Last Restocked"]
            
            # Format row highlighting or indicators
            st.dataframe(df, use_container_width=True)
            
            # Show a detailed look of low stock items
            if low_stock:
                st.subheader("⚠️ Low Stock Items")
                for item in low_stock:
                    st.error(f"**{item['item_name']}**: Only {item['quantity']} {item['unit']} left (Threshold: {item['min_threshold']})")
        else:
            st.info("No items in pharmacy inventory yet. Add stock in the 'Restock Medicine' tab.")
            
    with tab2:
        st.subheader("Prescriptions & Dispensing")
        
        col1, col2 = st.columns(2)
        with col1:
            st.markdown("### Write New Prescription")
            patients = hospital.get_patients()
            doctors = hospital.get_doctors()
            
            patient_list = {p['name']: p['personal_id'] for p in patients} if patients else {}
            doctor_list = {f"Dr. {d['name']}": d['id'] for d in doctors} if doctors else {}
            
            with st.form("write_prescription_form"):
                p_name = st.selectbox("Select Patient", list(patient_list.keys())) if patient_list else st.text_input("Patient ID")
                d_name = st.selectbox("Prescribing Doctor", list(doctor_list.keys())) if doctor_list else st.text_input("Doctor Name")
                med_name = st.text_input("Medicine & Strength (e.g. Paracetamol 500mg)")
                dosage = st.text_input("Dosage Instructions (e.g. 1 tablet)")
                freq = st.text_input("Frequency (e.g. Twice Daily)")
                duration = st.text_input("Duration (e.g. 7 Days)")
                submit_presc = st.form_submit_button("Log & Write Prescription")
                
                if submit_presc:
                    if p_name and d_name and med_name:
                        patient_db = hospital.patient_dal.get_patient_by_personal_id(patient_list[p_name])
                        doc_id = doctor_list[d_name]
                        
                        presc_id = hospital.add_prescription(
                            patient_db['id'], doc_id, med_name, dosage, freq, duration
                        )
                        st.success(f"Prescription recorded successfully! ID: {presc_id}")
                        hospital.log_audit(
                            st.session_state.get('username', 'system'),
                            "CREATE", "prescriptions", presc_id, f"Prescribed {med_name} to {p_name}"
                        )
                    else:
                        st.error("Please fill in all details.")
                        
        with col2:
            st.markdown("### Dispense Medicine")
            if patients:
                dispense_patient = st.selectbox("Select Patient to View Prescriptions", list(patient_list.keys()), key="disp_p")
                p_id = patient_list[dispense_patient]
                patient_db = hospital.patient_dal.get_patient_by_personal_id(p_id)
                prescriptions = hospital.get_patient_prescriptions(patient_db['id'])
                
                if prescriptions:
                    for p in prescriptions:
                        status_color = "green" if p['status'] == 'Dispensed' else "orange"
                        with st.expander(f"💊 {p['medicine_name']} ({p['status']}) - Prescribed by {p['doctor_name']}"):
                            st.write(f"**Instructions:** {p['dosage']} | {p['frequency']} | {p['duration']}")
                            st.write(f"**Date:** {p['created_at']}")
                            
                            if p['status'] == 'Active':
                                if st.button(f"Dispense {p['medicine_name']}", key=f"disp_btn_{p['id']}"):
                                    # Deduct from inventory
                                    # Locate matching stock item
                                    success, msg = hospital.update_inventory_stock(p['medicine_name'], -1)
                                    if success:
                                        hospital.update_prescription_status(p['id'], 'Dispensed')
                                        st.success(f"Successfully dispensed 1 unit of {p['medicine_name']}.")
                                        hospital.log_audit(
                                            st.session_state.get('username', 'system'),
                                            "UPDATE", "prescriptions", p['id'], f"Dispensed {p['medicine_name']}"
                                        )
                                        st.rerun()
                                    else:
                                        st.error(f"Cannot dispense: {msg}")
                else:
                    st.info("No active prescriptions found for this patient.")
            else:
                st.info("Please register patients first.")
                
    with tab3:
        st.subheader("Manage Inventory & Restock")
        
        with st.form("restock_form"):
            item_name = st.text_input("Medicine/Item Name (e.g., Paracetamol 500mg)")
            qty = st.number_input("Quantity to Add", min_value=1, value=100)
            unit = st.text_input("Unit (e.g., tablets, vials, capsules)", value="tablets")
            threshold = st.number_input("Low Stock Threshold Warning", min_value=1, value=10)
            submit_stock = st.form_submit_button("Process Restock")
            
            if submit_stock:
                if item_name and unit:
                    item_id = hospital.add_inventory_item(item_name, qty, unit, threshold)
                    st.success(f"Inventory restocked! Stock ID: {item_id}")
                    hospital.log_audit(
                        st.session_state.get('username', 'system'),
                        "RESTOCK", "inventories", item_id, f"Added {qty} {unit} of {item_name}"
                    )
                    st.rerun()
                else:
                    st.error("Please provide name and unit.")
