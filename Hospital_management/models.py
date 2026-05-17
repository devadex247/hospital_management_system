class MedicalRecord:
    def __init__(self):
        self.records = []

    def add_record(self, diagnosis, recommendation):
        self.records.append({
            "diagnosis": diagnosis,
            "recommendation": recommendation
        })


class Patient:
    def __init__(self, name, personal_id):
        self.name = name
        self.personal_id = personal_id
        self.appointment_history = []
        self.medical_record = MedicalRecord()

    def add_appointment(self, appointment):
        self.appointment_history.append(appointment)


class Doctor:
    def __init__(self, name, specialization):
        self.name = name
        self.specialization = specialization
        self.patients = []

    def add_patient(self, patient):
        if patient not in self.patients:
            self.patients.append(patient)


class Appointment:
    def __init__(self, doctor, patient, date):
        self.doctor = doctor
        self.patient = patient
        self.date = date
        self.status = "Scheduled"

    def complete(self, diagnosis, recommendation):
        self.status = "Completed"
        self.patient.medical_record.add_record(diagnosis, recommendation)
        return True, f"Appointment on {self.date} completed with diagnosis: {diagnosis}"


class Department:
    def __init__(self, name):
        self.name = name
        self.doctors = []

    def add_doctor(self, doctor):
        self.doctors.append(doctor)
