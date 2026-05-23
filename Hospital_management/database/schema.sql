-- Hospital Management System Database Schema
-- SQLite Database Schema

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialization TEXT NOT NULL,
    department_id INTEGER,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    personal_id TEXT UNIQUE NOT NULL,
    email TEXT,
    phone TEXT,
    date_of_birth DATE,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    date TIMESTAMP NOT NULL,
    status TEXT DEFAULT 'Scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- Medical Records table
CREATE TABLE IF NOT EXISTS medical_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    appointment_id INTEGER,
    diagnosis TEXT NOT NULL,
    recommendation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

-- AI Chat Sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Chat Messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctors_department ON doctors(department_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(username);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

-- Admissions table
CREATE TABLE IF NOT EXISTS admissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    room_number TEXT NOT NULL,
    bed_number TEXT NOT NULL,
    admission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    discharge_date TIMESTAMP,
    status TEXT DEFAULT 'Admitted',
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- Pharmacy & Inventory table
CREATE TABLE IF NOT EXISTS inventories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT UNIQUE NOT NULL,
    quantity INTEGER DEFAULT 0,
    unit TEXT NOT NULL,
    min_threshold INTEGER DEFAULT 10,
    last_restocked TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    medicine_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

-- Staff Schedules & Rosters table
CREATE TABLE IF NOT EXISTS staff_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_name TEXT NOT NULL,
    role TEXT NOT NULL,
    department_id INTEGER,
    shift_start TIMESTAMP NOT NULL,
    shift_end TIMESTAMP NOT NULL,
    performance_rating REAL DEFAULT 5.0,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Financials: Bills table
CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    appointment_id INTEGER,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'Unpaid',
    billing_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

-- Financials: Insurance Claims table
CREATE TABLE IF NOT EXISTS insurance_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    provider_name TEXT NOT NULL,
    policy_number TEXT NOT NULL,
    claimed_amount REAL NOT NULL,
    status TEXT DEFAULT 'Submitted',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES bills(id)
);

-- Lab Orders & Diagnostics table (incorporating LOINC mapping)
CREATE TABLE IF NOT EXISTS lab_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    test_name TEXT NOT NULL,
    loinc_code TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    result TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

-- Radiology & Imaging table (PACS Mock references & AI predictions)
CREATE TABLE IF NOT EXISTS radiology_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    image_type TEXT NOT NULL,
    body_part TEXT NOT NULL,
    file_path TEXT NOT NULL,
    ai_prediction TEXT,
    doctor_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

-- Immutable Security Audit Logs (for HIPAA/GDPR Compliance)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id INTEGER,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for the new scaled tables
CREATE INDEX IF NOT EXISTS idx_admissions_patient ON admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_staff_department ON staff_schedules(department_id);
CREATE INDEX IF NOT EXISTS idx_bills_patient ON bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_bill ON insurance_claims(bill_id);
CREATE INDEX IF NOT EXISTS idx_labs_patient ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_radiology_patient ON radiology_images(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

