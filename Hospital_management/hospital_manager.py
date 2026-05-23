from database import (
    DepartmentDAL, DoctorDAL, PatientDAL, AppointmentDAL, MedicalRecordDAL,
    AdmissionDAL, InventoryDAL, PrescriptionDAL, StaffScheduleDAL,
    BillingDAL, LabOrderDAL, RadiologyDAL, AuditLogDAL, ChatSessionDAL
)

class Hospital:
    def __init__(self, name):
        self.name = name
        # Use database DAL instead of in-memory lists
        self.department_dal = DepartmentDAL()
        self.doctor_dal = DoctorDAL()
        self.patient_dal = PatientDAL()
        self.appointment_dal = AppointmentDAL()
        self.medical_record_dal = MedicalRecordDAL()
        self.chat_dal = ChatSessionDAL()
        self.admission_dal = AdmissionDAL()
        self.inventory_dal = InventoryDAL()
        self.prescription_dal = PrescriptionDAL()
        self.staff_dal = StaffScheduleDAL()
        self.billing_dal = BillingDAL()
        self.lab_dal = LabOrderDAL()
        self.radiology_dal = RadiologyDAL()
        self.audit_dal = AuditLogDAL()

    def add_department(self, name, description=None):
        """Add a department to the database"""
        dept_id = self.department_dal.create_department(name, description)
        return True, f"Department '{name}' added successfully with ID: {dept_id}"

    def add_doctor(self, name, specialization, department_name=None, email=None, phone=None):
        """Add a doctor to the database"""
        # Find department ID if department name is provided
        department_id = None
        if department_name:
            departments = self.department_dal.get_all_departments()
            for dept in departments:
                if dept['name'].lower() == department_name.lower():
                    department_id = dept['id']
                    break
        
        doctor_id = self.doctor_dal.create_doctor(name, specialization, department_id, email, phone)
        return True, f"Dr. {name} added successfully with ID: {doctor_id}"

    def delete_doctor(self, doctor_id):
        """Delete a doctor from the database"""
        try:
            self.doctor_dal.delete_doctor(doctor_id)
            return True, "Doctor deleted successfully."
        except Exception as e:
            return False, f"Error deleting doctor: {str(e)}"

    def add_patient(self, name, personal_id, email=None, phone=None, date_of_birth=None, address=None):
        """Add a patient to the database"""
        try:
            patient_id = self.patient_dal.create_patient(name, personal_id, email, phone, date_of_birth, address)
            return True, f"Patient {name} added successfully with ID: {patient_id}"
        except Exception as e:
            return False, f"Error adding patient: {str(e)}"

    def delete_patient(self, patient_id):
        """Delete a patient from the database"""
        try:
            self.patient_dal.delete_patient(patient_id)
            return True, "Patient deleted successfully."
        except Exception as e:
            return False, f"Error deleting patient: {str(e)}"

    def schedule_appointment(self, doctor_name, patient_id, date, notes=None):
        """Schedule an appointment in the database.
        """
        # Normalise inputs
        doctor_name = doctor_name.strip().lower()
        patient_id = patient_id.strip()

        # Find doctor by name (case‑insensitive)
        doctors = self.doctor_dal.get_all_doctors()
        doctor = None
        for d in doctors:
            if d['name'].strip().lower() == doctor_name:
                doctor = d
                break

        # Find patient by personal ID (exact match after stripping)
        patient = self.patient_dal.get_patient_by_personal_id(patient_id)

        if not doctor:
            print(f"[Schedule] Doctor not found: '{doctor_name}'")
        if not patient:
            print(f"[Schedule] Patient not found: '{patient_id}'")

        if doctor and patient:
            appointment_id = self.appointment_dal.create_appointment(
                doctor['id'], patient['id'], date, notes
            )
            return True, f"Appointment scheduled successfully with ID: {appointment_id}"
        else:
            return False, "Doctor or patient not found."

    def complete_appointment(self, appointment_id, diagnosis, recommendation):
        """Complete appointment and create medical record"""
        success = self.appointment_dal.complete_appointment(appointment_id, diagnosis, recommendation)
        if success:
            return True, f"Appointment {appointment_id} completed successfully."
        else:
            return False, "Appointment not found."

    def update_appointment(self, appointment_id, doctor_name=None, patient_id=None, date=None, notes=None):
        """Update appointment details"""
        doctor_id = None
        if doctor_name:
            doctors = self.doctor_dal.get_all_doctors()
            for d in doctors:
                if d['name'].lower() == doctor_name.lower():
                    doctor_id = d['id']
                    break
        
        patient_db_id = None
        if patient_id:
            patient = self.patient_dal.get_patient_by_personal_id(patient_id)
            if patient:
                patient_db_id = patient['id']
        
        self.appointment_dal.update_appointment(appointment_id, doctor_id, patient_db_id, date, notes)
        return True, f"Appointment {appointment_id} updated successfully."

    def delete_appointment(self, appointment_id):
        """Delete appointment"""
        self.appointment_dal.delete_appointment(appointment_id)
        return True, f"Appointment {appointment_id} deleted successfully."

    def get_appointment_by_id(self, appointment_id):
        """Get appointment by ID"""
        return self.appointment_dal.get_appointment_by_id(appointment_id)

    # Getter methods for views
    def get_departments(self):
        """Get all departments"""
        return self.department_dal.get_all_departments()

    def get_doctors(self):
        """Get all doctors"""
        return self.doctor_dal.get_all_doctors()

    def get_patients(self):
        """Get all patients"""
        return self.patient_dal.get_all_patients()

    def get_appointments(self):
        """Get all appointments"""
        return self.appointment_dal.get_all_appointments()

    def get_patient_appointments(self, patient_id):
        """Get appointments for a specific patient"""
        patient = self.patient_dal.get_patient_by_personal_id(patient_id)
        if patient:
            return self.appointment_dal.get_appointments_by_patient(patient['id'])
        return []

    def get_doctor_appointments(self, doctor_id):
        """Get appointments for a specific doctor"""
        return self.appointment_dal.get_appointments_by_doctor(doctor_id)

    def get_patient_medical_records(self, patient_id):
        """Get medical records for a specific patient"""
        patient = self.patient_dal.get_patient_by_personal_id(patient_id)
        if patient:
            return self.medical_record_dal.get_medical_records_by_patient(patient['id'])
        return []

    def reset_database(self):
        """Reset the entire database (Clear all records)"""
        import sqlite3
        from database import get_database_path, initialize_database
        import os
        
        db_path = get_database_path()
        try:
            if os.path.exists(db_path):
                # We need to close connections first if possible, 
                # but sqlite might lock it. Simplest is to drop tables.
                from database import get_connection
                with get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                    tables = cursor.fetchall()
                    for table in tables:
                        if table[0] != "sqlite_sequence":
                            cursor.execute(f"DROP TABLE IF EXISTS {table[0]}")
                    conn.commit()
            
            # Re-initialize
            initialize_database()
            return True, "Database reset successfully."
        except Exception as e:
            return False, f"Error resetting database: {str(e)}"

    # --- Admissions ---
    def add_admission(self, patient_id, room_number, bed_number):
        return self.admission_dal.create_admission(patient_id, room_number, bed_number)

    def discharge_patient(self, admission_id):
        return self.admission_dal.discharge_patient(admission_id)

    def get_active_admissions(self):
        return self.admission_dal.get_active_admissions()

    def get_all_admissions(self):
        return self.admission_dal.get_all_admissions()

    # --- Inventory ---
    def add_inventory_item(self, item_name, quantity, unit, min_threshold=10):
        return self.inventory_dal.create_inventory_item(item_name, quantity, unit, min_threshold)

    def update_inventory_stock(self, item_name, quantity_change):
        return self.inventory_dal.update_stock(item_name, quantity_change)

    def get_all_inventory(self):
        return self.inventory_dal.get_all_inventory()

    def get_low_stock_items(self):
        return self.inventory_dal.get_low_stock_items()

    # --- Prescriptions ---
    def add_prescription(self, patient_id, doctor_id, medicine_name, dosage, frequency, duration):
        return self.prescription_dal.create_prescription(patient_id, doctor_id, medicine_name, dosage, frequency, duration)

    def get_patient_prescriptions(self, patient_id):
        return self.prescription_dal.get_prescriptions_by_patient(patient_id)

    def update_prescription_status(self, prescription_id, status):
        return self.prescription_dal.update_prescription_status(prescription_id, status)

    # --- Staff Schedules ---
    def add_staff_schedule(self, staff_name, role, department_id, shift_start, shift_end, performance_rating=5.0):
        return self.staff_dal.create_schedule(staff_name, role, department_id, shift_start, shift_end, performance_rating)

    def get_all_staff_schedules(self):
        return self.staff_dal.get_all_schedules()

    # --- Billing ---
    def add_bill(self, patient_id, appointment_id, amount, status='Unpaid'):
        return self.billing_dal.create_bill(patient_id, appointment_id, amount, status)

    def pay_bill(self, bill_id):
        return self.billing_dal.pay_bill(bill_id)

    def get_patient_bills(self, patient_id):
        return self.billing_dal.get_bills_by_patient(patient_id)

    def get_all_bills(self):
        return self.billing_dal.get_all_bills()

    # --- Claims ---
    def add_insurance_claim(self, bill_id, provider_name, policy_number, claimed_amount):
        return self.billing_dal.create_insurance_claim(bill_id, provider_name, policy_number, claimed_amount)

    def update_claim_status(self, claim_id, status):
        return self.billing_dal.update_claim_status(claim_id, status)

    def get_all_claims(self):
        return self.billing_dal.get_all_claims()

    # --- Lab Orders ---
    def add_lab_order(self, patient_id, doctor_id, test_name, loinc_code):
        return self.lab_dal.create_lab_order(patient_id, doctor_id, test_name, loinc_code)

    def complete_lab_order(self, lab_order_id, result):
        return self.lab_dal.complete_lab_order(lab_order_id, result)

    def get_patient_lab_orders(self, patient_id):
        return self.lab_dal.get_patient_lab_orders(patient_id)

    def get_all_lab_orders(self):
        return self.lab_dal.get_all_lab_orders()

    # --- Radiology ---
    def add_radiology_image(self, patient_id, doctor_id, image_type, body_part, file_path, ai_prediction=None, doctor_notes=None):
        return self.radiology_dal.create_radiology_image(patient_id, doctor_id, image_type, body_part, file_path, ai_prediction, doctor_notes)

    def get_patient_radiology(self, patient_id):
        return self.radiology_dal.get_radiology_by_patient(patient_id)

    def get_all_radiology(self):
        return self.radiology_dal.get_all_radiology()

    # --- Audit Logs ---
    def log_audit(self, username, action, table_name, record_id=None, details=None):
        return self.audit_dal.log_action(username, action, table_name, record_id, details)

    def get_all_audit_logs(self):
        return self.audit_dal.get_all_logs()

def get_initial_hospital():
    """Initialize hospital with comprehensive departments and seed data"""
    hospital = Hospital("General Hospital")
    
    # Create comprehensive hospital departments if they don't exist
    default_departments = [
        ("Cardiology", "Heart and cardiovascular care"),
        ("Orthopedics", "Bone and joint care"),
        ("Dermatology", "Skin care and treatment"),
        ("Psychiatry", "Mental health care"),
        ("Ophthalmology", "Eye care and vision"),
        ("Neurology", "Nervous system and brain disorders"),
        ("Oncology", "Cancer treatment and care"),
        ("Pediatrics", "Child and adolescent healthcare"),
        ("Gynecology", "Women's reproductive health"),
        ("Urology", "Urinary tract and male reproductive system"),
        ("Gastroenterology", "Digestive system and liver diseases"),
        ("Pulmonology", "Respiratory and lung diseases"),
        ("Nephrology", "Kidney diseases and dialysis"),
        ("Endocrinology", "Hormonal and metabolic disorders"),
        ("Rheumatology", "Autoimmune and joint diseases"),
        ("Hematology", "Blood disorders and diseases"),
        ("Infectious Diseases", "Infection prevention and treatment"),
        ("Emergency Medicine", "Acute and emergency care"),
        ("Anesthesiology", "Pain management and anesthesia"),
        ("Radiology", "Medical imaging and diagnostics"),
        ("Pathology", "Laboratory medicine and diagnostics"),
        ("General Surgery", "Surgical procedures and operations"),
        ("Plastic Surgery", "Reconstructive and cosmetic surgery"),
        ("Thoracic Surgery", "Chest and lung surgery"),
        ("Vascular Surgery", "Blood vessel surgery"),
        ("Neurosurgery", "Brain and nervous system surgery"),
        ("Orthopedic Surgery", "Musculoskeletal surgery")
    ]
    
    existing_departments = hospital.get_departments()
    existing_names = [d['name'].lower() for d in existing_departments]
    
    for name, description in default_departments:
        if name.lower() not in existing_names:
            hospital.add_department(name, description)
    
    # --- Add Nigerian Doctors ---
    existing_doctors = [d['name'].lower() for d in hospital.get_doctors()]
    nigerian_doctors = [
        ("Chinonso Okoro", "Cardiology"),
        ("Adebayo Ogunlesi", "Pediatrics"),
        ("Ngozi Idika", "Gynecology"),
        ("Ibrahim Musa", "General Surgery"),
        ("Funke Akindele", "Dermatology")
    ]
    for name, spec in nigerian_doctors:
        if name.lower() not in existing_doctors:
            hospital.add_doctor(name, spec, department_name=spec)

    # --- Add Nigerian Patients ---
    existing_patients = [p['personal_id'].lower() for p in hospital.get_patients()]
    nigerian_patients = [
        ("Amaka Nnamani", "PAT-001"),
        ("Tunde Bakare", "PAT-002"),
        ("Aisha Yusuf", "PAT-003"),
        ("Emeka Uzoh", "PAT-004"),
        ("Blessing Effiong", "PAT-005")
    ]
    for name, p_id in nigerian_patients:
        if p_id.lower() not in existing_patients:
            hospital.add_patient(name, p_id)
            
    # --- Seed Inventory Items ---
    default_inventory = [
        ("Paracetamol 500mg", 150, "tablets", 20),
        ("Amoxicillin 250mg", 80, "tablets", 15),
        ("Insulin Glargine 100 U/mL", 8, "vials", 5),
        ("Atorvastatin 20mg", 200, "tablets", 30),
        ("Metformin 500mg", 300, "tablets", 40)
    ]
    existing_inventory = [item['item_name'].lower() for item in hospital.get_all_inventory()]
    for name, qty, unit, threshold in default_inventory:
        if name.lower() not in existing_inventory:
            hospital.add_inventory_item(name, qty, unit, threshold)
            
    # --- Seed Staff Schedules ---
    default_staff = [
        ("Nurse Ngozi", "Nurse", "Emergency Medicine", "2026-05-20 08:00:00", "2026-05-20 16:00:00"),
        ("Nurse Adebayo", "Nurse", "Pediatrics", "2026-05-20 16:00:00", "2026-05-21 00:00:00"),
        ("Tech Ibrahim", "Technician", "Radiology", "2026-05-20 09:00:00", "2026-05-20 17:00:00")
    ]
    existing_schedules = hospital.get_all_staff_schedules()
    if not existing_schedules:
        # Find department IDs for seeding
        depts = {d['name'].lower(): d['id'] for d in hospital.get_departments()}
        for name, role, dept_name, start, end in default_staff:
            dept_id = depts.get(dept_name.lower())
            hospital.add_staff_schedule(name, role, dept_id, start, end)
            
    return hospital
