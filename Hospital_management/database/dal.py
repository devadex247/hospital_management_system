from .connection import get_connection
from datetime import datetime
import hashlib

class UserDAL:
    """Data Access Layer for Users"""
    
    @staticmethod
    def create_user(username, email, password_hash, role='user'):
        """Create a new user"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO users (username, email, password_hash, role)
                VALUES (?, ?, ?, ?)
                """,
                (username, email, password_hash, role)
            )
            conn.commit()
            return cursor.lastrowid
    
    @staticmethod
    def get_user_by_username(username):
        """Get user by username"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM users WHERE username = ?",
                (username,)
            )
            return cursor.fetchone()
    
    @staticmethod
    def get_user_by_id(user_id):
        """Get user by ID"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM users WHERE id = ?",
                (user_id,)
            )
            return cursor.fetchone()
    
    @staticmethod
    def get_all_users():
        """Get all users"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users")
            return cursor.fetchall()

class DepartmentDAL:
    """Data Access Layer for Departments"""
    
    @staticmethod
    def create_department(name, description=None):
        """Create a new department"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO departments (name, description)
                VALUES (?, ?)
                """,
                (name, description)
            )
            conn.commit()
            return cursor.lastrowid
    
    @staticmethod
    def get_department_by_id(dept_id):
        """Get department by ID"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM departments WHERE id = ?",
                (dept_id,)
            )
            return cursor.fetchone()
    
    @staticmethod
    def get_all_departments():
        """Get all departments"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM departments")
            return cursor.fetchall()
    
    @staticmethod
    def update_department(dept_id, name=None, description=None):
        """Update department"""
        with get_connection() as conn:
            cursor = conn.cursor()
            if name:
                cursor.execute(
                    "UPDATE departments SET name = ? WHERE id = ?",
                    (name, dept_id)
                )
            if description:
                cursor.execute(
                    "UPDATE departments SET description = ? WHERE id = ?",
                    (description, dept_id)
                )
            conn.commit()

class DoctorDAL:
    """Data Access Layer for Doctors"""
    
    @staticmethod
    def create_doctor(name, specialization, department_id=None, email=None, phone=None):
        """Create a new doctor"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO doctors (name, specialization, department_id, email, phone)
                VALUES (?, ?, ?, ?, ?)
                """,
                (name, specialization, department_id, email, phone)
            )
            conn.commit()
            return cursor.lastrowid
    
    @staticmethod
    def get_doctor_by_id(doctor_id):
        """Get doctor by ID"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT d.*, dept.name as department_name 
                FROM doctors d
                LEFT JOIN departments dept ON d.department_id = dept.id
                WHERE d.id = ?
                """,
                (doctor_id,)
            )
            return cursor.fetchone()
    
    @staticmethod
    def get_all_doctors():
        """Get all doctors"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT d.*, dept.name as department_name 
                FROM doctors d
                LEFT JOIN departments dept ON d.department_id = dept.id
                """
            )
            return cursor.fetchall()
    
    @staticmethod
    def get_doctors_by_department(department_id):
        """Get doctors by department"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM doctors WHERE department_id = ?",
                (department_id,)
            )
            return cursor.fetchall()
    
    @staticmethod
    def update_doctor(doctor_id, name=None, specialization=None, department_id=None, email=None, phone=None):
        """Update doctor"""
        with get_connection() as conn:
            cursor = conn.cursor()
            updates = []
            params = []
            
            if name:
                updates.append("name = ?")
                params.append(name)
            if specialization:
                updates.append("specialization = ?")
                params.append(specialization)
            if department_id:
                updates.append("department_id = ?")
                params.append(department_id)
            if email:
                updates.append("email = ?")
                params.append(email)
            if phone:
                updates.append("phone = ?")
                params.append(phone)
            
            if updates:
                params.append(doctor_id)
                cursor.execute(
                    f"UPDATE doctors SET {', '.join(updates)} WHERE id = ?",
                    params
                )
                conn.commit()
    
    @staticmethod
    def delete_doctor(doctor_id):
        """Delete doctor"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM doctors WHERE id = ?", (doctor_id,))
            conn.commit()

class PatientDAL:
    """Data Access Layer for Patients"""
    
    @staticmethod
    def create_patient(name, personal_id, email=None, phone=None, date_of_birth=None, address=None):
        """Create a new patient"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO patients (name, personal_id, email, phone, date_of_birth, address)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (name, personal_id, email, phone, date_of_birth, address)
            )
            conn.commit()
            return cursor.lastrowid
    
    @staticmethod
    def get_patient_by_id(patient_id):
        """Get patient by ID"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM patients WHERE id = ?",
                (patient_id,)
            )
            return cursor.fetchone()
    
    @staticmethod
    def get_patient_by_personal_id(personal_id):
        """Get patient by personal ID"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM patients WHERE personal_id = ?",
                (personal_id,)
            )
            return cursor.fetchone()
    
    @staticmethod
    def get_all_patients():
        """Get all patients"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM patients ORDER BY created_at DESC")
            return cursor.fetchall()
    
    @staticmethod
    def update_patient(patient_id, name=None, email=None, phone=None, date_of_birth=None, address=None):
        """Update patient"""
        with get_connection() as conn:
            cursor = conn.cursor()
            updates = []
            params = []
            
            if name:
                updates.append("name = ?")
                params.append(name)
            if email:
                updates.append("email = ?")
                params.append(email)
            if phone:
                updates.append("phone = ?")
                params.append(phone)
            if date_of_birth:
                updates.append("date_of_birth = ?")
                params.append(date_of_birth)
            if address:
                updates.append("address = ?")
                params.append(address)
            
            if updates:
                updates.append("updated_at = CURRENT_TIMESTAMP")
                params.append(patient_id)
                cursor.execute(
                    f"UPDATE patients SET {', '.join(updates)} WHERE id = ?",
                    params
                )
                conn.commit()
    
    @staticmethod
    def delete_patient(patient_id):
        """Delete patient"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM patients WHERE id = ?", (patient_id,))
            conn.commit()

class AppointmentDAL:
    """Data Access Layer for Appointments"""
    
    @staticmethod
    def create_appointment(doctor_id, patient_id, date, notes=None):
        """Create a new appointment"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO appointments (doctor_id, patient_id, date, notes)
                VALUES (?, ?, ?, ?)
                """,
                (doctor_id, patient_id, date, notes)
            )
            conn.commit()
            return cursor.lastrowid
    
    @staticmethod
    def get_appointment_by_id(appointment_id):
        """Get appointment by ID"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT a.*, d.name as doctor_name, p.name as patient_name 
                FROM appointments a
                JOIN doctors d ON a.doctor_id = d.id
                JOIN patients p ON a.patient_id = p.id
                WHERE a.id = ?
                """,
                (appointment_id,)
            )
            return cursor.fetchone()
    
    @staticmethod
    def get_all_appointments():
        """Get all appointments"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT a.*, d.name as doctor_name, p.name as patient_name 
                FROM appointments a
                JOIN doctors d ON a.doctor_id = d.id
                JOIN patients p ON a.patient_id = p.id
                ORDER BY a.date DESC
                """
            )
            return cursor.fetchall()
    
    @staticmethod
    def get_appointments_by_doctor(doctor_id):
        """Get appointments by doctor"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT a.*, p.name as patient_name 
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                WHERE a.doctor_id = ?
                ORDER BY a.date DESC
                """,
                (doctor_id,)
            )
            return cursor.fetchall()
    
    @staticmethod
    def get_appointments_by_patient(patient_id):
        """Get appointments by patient"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT a.*, d.name as doctor_name 
                FROM appointments a
                JOIN doctors d ON a.doctor_id = d.id
                WHERE a.patient_id = ?
                ORDER BY a.date DESC
                """,
                (patient_id,)
            )
            return cursor.fetchall()
    
    @staticmethod
    def update_appointment_status(appointment_id, status):
        """Update appointment status"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE appointments 
                SET status = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
                """,
                (status, appointment_id)
            )
            conn.commit()
    
    @staticmethod
    def update_appointment(appointment_id, doctor_id=None, patient_id=None, date=None, notes=None):
        """Update appointment details"""
        with get_connection() as conn:
            cursor = conn.cursor()
            updates = []
            params = []
            
            if doctor_id:
                updates.append("doctor_id = ?")
                params.append(doctor_id)
            if patient_id:
                updates.append("patient_id = ?")
                params.append(patient_id)
            if date:
                updates.append("date = ?")
                params.append(date)
            if notes is not None:
                updates.append("notes = ?")
                params.append(notes)
            
            if updates:
                updates.append("updated_at = CURRENT_TIMESTAMP")
                params.append(appointment_id)
                cursor.execute(
                    f"UPDATE appointments SET {', '.join(updates)} WHERE id = ?",
                    params
                )
                conn.commit()
    
    @staticmethod
    def delete_appointment(appointment_id):
        """Delete appointment"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM appointments WHERE id = ?", (appointment_id,))
            conn.commit()
    
    @staticmethod
    def complete_appointment(appointment_id, diagnosis, recommendation):
        """Complete appointment and create medical record"""
        with get_connection() as conn:
            cursor = conn.cursor()
            
            # Get appointment details
            cursor.execute(
                "SELECT patient_id FROM appointments WHERE id = ?",
                (appointment_id,)
            )
            appointment = cursor.fetchone()
            
            if appointment:
                # Update appointment status
                cursor.execute(
                    """
                    UPDATE appointments 
                    SET status = 'Completed', updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                    """,
                    (appointment_id,)
                )
                
                # Create medical record
                cursor.execute(
                    """
                    INSERT INTO medical_records (patient_id, appointment_id, diagnosis, recommendation)
                    VALUES (?, ?, ?, ?)
                    """,
                    (appointment['patient_id'], appointment_id, diagnosis, recommendation)
                )
                
                conn.commit()
                return True
            return False

class MedicalRecordDAL:
    """Data Access Layer for Medical Records"""
    
    @staticmethod
    def get_medical_records_by_patient(patient_id):
        """Get medical records for a patient"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT mr.*, a.date as appointment_date, d.name as doctor_name
                FROM medical_records mr
                LEFT JOIN appointments a ON mr.appointment_id = a.id
                LEFT JOIN doctors d ON a.doctor_id = d.id
                WHERE mr.patient_id = ?
                ORDER BY mr.created_at DESC
                """,
                (patient_id,)
            )
            return cursor.fetchall()
    
    @staticmethod
    def add_medical_record(patient_id, diagnosis, recommendation, appointment_id=None):
        """Add a medical record"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO medical_records (patient_id, appointment_id, diagnosis, recommendation)
                VALUES (?, ?, ?, ?)
                """,
                (patient_id, appointment_id, diagnosis, recommendation)
            )
            conn.commit()
            return cursor.lastrowid


class ChatSessionDAL:
    """Data Access Layer for AI Chat Sessions"""

    @staticmethod
    def create_session(username, title):
        """Create a new chat session"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO chat_sessions (username, title) VALUES (?, ?)",
                (username, title)
            )
            conn.commit()
            return cursor.lastrowid

    @staticmethod
    def get_sessions_by_user(username):
        """Get all chat sessions for a user, newest first"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM chat_sessions WHERE username = ? ORDER BY created_at DESC",
                (username,)
            )
            return cursor.fetchall()

    @staticmethod
    def delete_session(session_id):
        """Delete a chat session and all its messages (CASCADE)"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM chat_messages WHERE session_id = ?", (session_id,))
            cursor.execute("DELETE FROM chat_sessions WHERE id = ?", (session_id,))
            conn.commit()

    @staticmethod
    def add_message(session_id, role, content):
        """Add a message to a chat session"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)",
                (session_id, role, content)
            )
            conn.commit()
            return cursor.lastrowid

    @staticmethod
    def get_messages(session_id):
        """Get all messages for a session"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC",
                (session_id,)
            )
            return cursor.fetchall()

    @staticmethod
    def update_session_title(session_id, title):
        """Update session title"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE chat_sessions SET title = ? WHERE id = ?",
                (title, session_id)
            )
            conn.commit()


# Helper function for password hashing
def hash_password(password):
    """Hash a password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()
