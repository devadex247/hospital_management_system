import streamlit as st
import pandas as pd

def render_finance(hospital):
    st.title("💸 Financial Management & Insurance Claims")
    
    # Fetch Data
    bills = hospital.get_all_bills()
    claims = hospital.get_all_claims()
    
    # Calculate Metrics
    total_billed = sum(b['amount'] for b in bills)
    total_paid = sum(b['amount'] for b in bills if b['status'] == 'Paid')
    total_pending = sum(b['amount'] for b in bills if b['status'] == 'Unpaid')
    
    # 1. Summary Metrics
    col1, col2, col3 = st.columns(3)
    col1.metric("Total Revenue Billed", f"₦{total_billed:,.2f}")
    col2.metric("Total Collections", f"₦{total_paid:,.2f}")
    col3.metric("Pending Invoices", f"₦{total_pending:,.2f}", delta=f"-₦{total_pending:,.2f}", delta_color="inverse")
    
    tab1, tab2, tab3 = st.tabs(["Billing Ledger", "Issue Invoice", "Insurance Claims"])
    
    with tab1:
        st.subheader("Invoice & Payment Ledger")
        if bills:
            data = []
            for b in bills:
                data.append({
                    "Invoice ID": b['id'],
                    "Patient Name": b['patient_name'],
                    "Billed Amount": f"₦{b['amount']:,.2f}",
                    "Status": b['status'],
                    "Issued Date": b['billing_date']
                })
            df = pd.DataFrame(data)
            st.dataframe(df, use_container_width=True)
            
            # Action to pay bills
            st.markdown("### Process Payment")
            unpaid_bills = [b for b in bills if b['status'] == 'Unpaid']
            if unpaid_bills:
                bill_options = {f"Inv #{b['id']} - ₦{b['amount']:,.2f} for {b['patient_name']}": b['id'] for b in unpaid_bills}
                selected_bill = st.selectbox("Select Outstanding Invoice", list(bill_options.keys()))
                if st.button("Confirm Payment"):
                    bill_id = bill_options[selected_bill]
                    hospital.pay_bill(bill_id)
                    st.success("Invoice status updated to Paid!")
                    hospital.log_audit(
                        st.session_state.get('username', 'system'),
                        "PAYMENT", "bills", bill_id, f"Received payment for invoice {bill_id}"
                    )
                    st.rerun()
            else:
                st.info("All invoices are settled.")
        else:
            st.info("No bills recorded in the system yet.")
            
    with tab2:
        st.subheader("Create New Patient Invoice")
        patients = hospital.get_patients()
        appointments = hospital.get_appointments()
        
        patient_list = {p['name']: p['personal_id'] for p in patients} if patients else {}
        
        if not patient_list:
            st.warning("Register patients before issuing invoices.")
        else:
            with st.form("create_invoice_form"):
                p_select = st.selectbox("Bill To (Patient)", list(patient_list.keys()))
                amount = st.number_input("Billing Amount (₦)", min_value=1.0, value=5000.0, step=500.0)
                
                # Check for associated appointments
                app_options = ["None"]
                patient_db = hospital.patient_dal.get_patient_by_personal_id(patient_list[p_select])
                p_apps = [a for a in appointments if a['patient_id'] == patient_db['id']]
                if p_apps:
                    app_options += [f"Appt #{a['id']} - {a['date']}" for a in p_apps]
                    
                appt_select = st.selectbox("Link to Appointment (optional)", app_options)
                submit_bill = st.form_submit_button("Generate Invoice")
                
                if submit_bill:
                    appt_id = None
                    if appt_select != "None":
                        # Extract ID
                        appt_id = int(appt_select.split("#")[1].split(" ")[0])
                        
                    bill_id = hospital.add_bill(patient_db['id'], appt_id, amount)
                    st.success(f"Invoice generated! Invoice ID: {bill_id}")
                    hospital.log_audit(
                        st.session_state.get('username', 'system'),
                        "CREATE", "bills", bill_id, f"Invoiced ₦{amount} for patient ID {patient_db['id']}"
                    )
                    st.rerun()
                    
    with tab3:
        st.subheader("Insurance & Claims Registry")
        
        col_c1, col_c2 = st.columns(2)
        with col_c1:
            st.markdown("### Log New Claim")
            # Claims can only be filed against existing bills
            if bills:
                bill_options = {f"Inv #{b['id']} - {b['patient_name']} (₦{b['amount']})": b['id'] for b in bills}
                claim_bill = st.selectbox("Select Invoice for Claim", list(bill_options.keys()))
                claim_bill_id = bill_options[claim_bill]
                
                # Find bill details
                linked_bill = next(b for b in bills if b['id'] == claim_bill_id)
                
                with st.form("create_claim_form"):
                    provider = st.text_input("Insurance Provider (e.g. NHIS, AXA Mansard)")
                    policy_no = st.text_input("Policy / Coverage Number")
                    claimed_amt = st.number_input("Claimed Coverage Amount (₦)", min_value=1.0, max_value=float(linked_bill['amount']), value=float(linked_bill['amount']))
                    submit_claim = st.form_submit_button("Submit Claim to Provider")
                    
                    if submit_claim:
                        if provider and policy_no:
                            claim_id = hospital.add_insurance_claim(claim_bill_id, provider, policy_no, claimed_amt)
                            st.success(f"Claim lodged successfully! ID: {claim_id}")
                            hospital.log_audit(
                                st.session_state.get('username', 'system'),
                                "CREATE", "insurance_claims", claim_id, f"Insurance claim of ₦{claimed_amt} submitted to {provider}"
                            )
                            st.rerun()
                        else:
                            st.error("Please fill in provider name and policy number.")
            else:
                st.info("Please create invoices first.")
                
        with col_c2:
            st.markdown("### Current Insurance Claims")
            if claims:
                for c in claims:
                    status_col = "orange" if c['status'] == 'Submitted' else ("green" if c['status'] == 'Approved' else "red")
                    with st.expander(f"📋 Claim #{c['id']} - {c['provider_name']} ({c['status']})"):
                        st.write(f"**Patient:** {c['patient_name']}")
                        st.write(f"**Invoice Total:** ₦{c['bill_amount']:,.2f}")
                        st.write(f"**Claimed Value:** ₦{c['claimed_amount']:,.2f}")
                        st.write(f"**Policy ID:** `{c['policy_number']}`")
                        st.write(f"**Submitted On:** {c['submitted_at']}")
                        
                        if c['status'] == 'Submitted':
                            col_s1, col_s2 = st.columns(2)
                            if col_s1.button("Approve Claim", key=f"app_c_{c['id']}"):
                                hospital.update_claim_status(c['id'], 'Approved')
                                # Auto-mark bill as paid if approved for full amount
                                if c['claimed_amount'] >= c['bill_amount']:
                                    hospital.pay_bill(c['bill_id'])
                                st.success("Claim approved!")
                                hospital.log_audit(
                                    st.session_state.get('username', 'system'),
                                    "UPDATE", "insurance_claims", c['id'], "Claim status: Approved"
                                )
                                st.rerun()
                            if col_s2.button("Reject Claim", key=f"rej_c_{c['id']}"):
                                hospital.update_claim_status(c['id'], 'Rejected')
                                st.error("Claim marked as rejected.")
                                hospital.log_audit(
                                    st.session_state.get('username', 'system'),
                                    "UPDATE", "insurance_claims", c['id'], "Claim status: Rejected"
                                )
                                st.rerun()
            else:
                st.info("No active claims found.")
