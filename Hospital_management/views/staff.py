import streamlit as st
import pandas as pd
from datetime import datetime

def render_staff(hospital):
    st.title("👥 Staff Scheduling & Security Audit Logs")
    
    # Fetch Data
    schedules = hospital.get_all_staff_schedules()
    audit_logs = hospital.get_all_audit_logs()
    
    tab1, tab2, tab3 = st.tabs(["Duty Roster", "Schedule Shifts", "Security Compliance Audit"])
    
    with tab1:
        st.subheader("Active Shift Schedules")
        if schedules:
            data = []
            for s in schedules:
                data.append({
                    "Schedule ID": s['id'],
                    "Staff Name": s['staff_name'],
                    "Role/Designation": s['role'],
                    "Department": s['department_name'] if s['department_name'] else "General Allocation",
                    "Shift Starts": s['shift_start'],
                    "Shift Ends": s['shift_end'],
                    "Performance": f"⭐ {s['performance_rating']:.1f}"
                })
            df = pd.DataFrame(data)
            st.dataframe(df, use_container_width=True)
        else:
            st.info("No shift rosters mapped. Schedule shifts in the next tab.")
            
    with tab2:
        st.subheader("Roster Staff Duty Shift")
        departments = hospital.get_departments()
        dept_list = {d['name']: d['id'] for d in departments} if departments else {}
        
        with st.form("create_schedule_form"):
            staff_name = st.text_input("Staff Name (e.g. Nurse Bisi)")
            role = st.selectbox("Staff Role", ["Nurse", "Technician", "Administrative Assistant", "Pharmacist", "Security Officer"])
            dept_select = st.selectbox("Assign to Department", list(dept_list.keys()) + ["None"])
            
            # Simple Date/Time inputs
            shift_day = st.date_input("Shift Date", value=datetime.now().date())
            start_hour = st.slider("Start Hour (24h)", 0, 23, 8)
            end_hour = st.slider("End Hour (24h)", 0, 23, 16)
            rating = st.slider("Initial Performance Rating", 1.0, 5.0, 5.0, step=0.5)
            
            submit_shift = st.form_submit_button("Generate Roster Shift")
            
            if submit_shift:
                if staff_name:
                    dept_id = dept_list.get(dept_select) if dept_select != "None" else None
                    start_str = f"{shift_day} {start_hour:02d}:00:00"
                    end_str = f"{shift_day} {end_hour:02d}:00:00"
                    
                    sched_id = hospital.add_staff_schedule(staff_name, role, dept_id, start_str, end_str, rating)
                    st.success(f"Shift generated successfully! Roster ID: {sched_id}")
                    hospital.log_audit(
                        st.session_state.get('username', 'system'),
                        "CREATE", "staff_schedules", sched_id, f"Scheduled shift for {staff_name} in {dept_select}"
                    )
                    st.rerun()
                else:
                    st.error("Please enter a staff name.")
                    
    with tab3:
        st.subheader("🔒 Immutable Security Audit Trail")
        st.write("HIPAA & GDPR Compliance Verification: All additions, modifications, and updates are logged in real-time.")
        
        if audit_logs:
            data_logs = []
            for a in audit_logs:
                data_logs.append({
                    "Timestamp": a['created_at'],
                    "Operator (User)": a['username'],
                    "Operation": a['action'],
                    "Table Impacted": a['table_name'],
                    "Record Reference ID": a['record_id'] if a['record_id'] else "N/A",
                    "Details": a['details']
                })
            df_logs = pd.DataFrame(data_logs)
            st.dataframe(df_logs, use_container_width=True)
        else:
            st.info("Audit log is currently empty.")
