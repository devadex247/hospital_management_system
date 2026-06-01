-- ============================================================
-- MedOS AI  –  Supabase PostgreSQL 16 Schema
-- Paste this into the Supabase project SQL Editor and run it.
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- 1. PUBLIC PROFILES  (mirrors auth.users)
-- ─────────────────────────────────────────
create table if not exists public.users (
    id              uuid primary key references auth.users(id) on delete cascade,
    username        text unique not null,
    email           text unique not null,
    full_name       text,
    phone_number    text,
    role            text not null default 'patient'
                        check (role in ('owner_admin','hospital_admin','doctor','staff','patient')),
    account_status  text not null default 'active'
                        check (account_status in ('active','inactive')),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

alter table public.users enable row level security;
create policy "users: read own"   on public.users for select using (auth.uid() = id);
create policy "users: update own" on public.users for update using (auth.uid() = id);

-- ─────────────────────────────────────────
-- 2. HOSPITALS  (tenants)
-- ─────────────────────────────────────────
create table if not exists public.hospitals (
    id              bigint generated always as identity primary key,
    name            text not null,
    address         text,
    contact_email   text,
    contact_phone   text,
    owner_user_id   uuid references public.users(id) on delete set null,
    is_active       boolean not null default true,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

alter table public.hospitals enable row level security;
create policy "hospitals: authenticated read" on public.hospitals
    for select using (auth.role() = 'authenticated');
create policy "hospitals: owner all" on public.hospitals
    for all using (auth.uid() = owner_user_id);

-- ─────────────────────────────────────────
-- 3. HOSPITAL ACCESS TOKENS
-- ─────────────────────────────────────────
create table if not exists public.hospital_access_tokens (
    id                    bigint generated always as identity primary key,
    hospital_id           bigint not null references public.hospitals(id) on delete cascade,
    access_token          text unique not null,
    created_by_user_id    uuid references public.users(id) on delete set null,
    is_active             boolean not null default true,
    created_at            timestamptz not null default now(),
    rotated_at            timestamptz
);

alter table public.hospital_access_tokens enable row level security;
create policy "tokens: authenticated read" on public.hospital_access_tokens
    for select using (auth.role() = 'authenticated');
create policy "tokens: owner insert" on public.hospital_access_tokens
    for insert with check (auth.uid() = created_by_user_id);

-- ─────────────────────────────────────────
-- 4. HOSPITAL MEMBERSHIPS
-- ─────────────────────────────────────────
create table if not exists public.hospital_memberships (
    id          bigint generated always as identity primary key,
    hospital_id bigint not null references public.hospitals(id) on delete cascade,
    user_id     uuid   not null references public.users(id)    on delete cascade,
    role        text   not null,
    status      text   not null default 'active',
    joined_at   timestamptz not null default now(),
    created_at  timestamptz not null default now(),
    unique (hospital_id, user_id)
);

alter table public.hospital_memberships enable row level security;
create policy "memberships: read own" on public.hospital_memberships
    for select using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- 5. DEPARTMENTS
-- ─────────────────────────────────────────
create table if not exists public.departments (
    id          bigint generated always as identity primary key,
    name        text unique not null,
    description text,
    created_at  timestamptz not null default now()
);

alter table public.departments enable row level security;
create policy "departments: authenticated read" on public.departments
    for select using (auth.role() = 'authenticated');
create policy "departments: admin write" on public.departments
    for all using (
        exists (
            select 1 from public.users u
            where u.id = auth.uid()
              and u.role in ('owner_admin','hospital_admin')
        )
    );

-- ─────────────────────────────────────────
-- 6. DOCTORS
-- ─────────────────────────────────────────
create table if not exists public.doctors (
    id              bigint generated always as identity primary key,
    user_id         uuid references public.users(id) on delete set null,
    name            text not null,
    specialization  text not null,
    department_id   bigint references public.departments(id) on delete set null,
    email           text,
    phone           text,
    created_at      timestamptz not null default now()
);

alter table public.doctors enable row level security;
create policy "doctors: authenticated read" on public.doctors
    for select using (auth.role() = 'authenticated');
create policy "doctors: admin write" on public.doctors
    for all using (
        exists (
            select 1 from public.users u
            where u.id = auth.uid()
              and u.role in ('owner_admin','hospital_admin','doctor')
        )
    );

-- ─────────────────────────────────────────
-- 7. PATIENTS
-- ─────────────────────────────────────────
create table if not exists public.patients (
    id            bigint generated always as identity primary key,
    user_id       uuid references public.users(id) on delete set null,
    name          text not null,
    personal_id   text unique not null,
    gender        text,
    allergies     text,
    email         text,
    phone         text,
    date_of_birth date,
    address       text,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

alter table public.patients enable row level security;
create policy "patients: authenticated read" on public.patients
    for select using (auth.role() = 'authenticated');
create policy "patients: own write" on public.patients
    for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- 8. APPOINTMENTS
-- ─────────────────────────────────────────
create table if not exists public.appointments (
    id          bigint generated always as identity primary key,
    doctor_id   bigint not null references public.doctors(id)  on delete cascade,
    patient_id  bigint not null references public.patients(id) on delete cascade,
    date        timestamptz not null,
    status      text not null default 'Scheduled',
    notes       text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

alter table public.appointments enable row level security;
create policy "appointments: authenticated read" on public.appointments
    for select using (auth.role() = 'authenticated');
create policy "appointments: staff write" on public.appointments
    for all using (
        exists (
            select 1 from public.users u
            where u.id = auth.uid()
              and u.role in ('owner_admin','hospital_admin','doctor','staff')
        )
    );

-- ─────────────────────────────────────────
-- 9. MEDICAL RECORDS
-- ─────────────────────────────────────────
create table if not exists public.medical_records (
    id                   bigint generated always as identity primary key,
    patient_id           bigint not null references public.patients(id)     on delete cascade,
    appointment_id       bigint references public.appointments(id)          on delete set null,
    diagnosis            text not null,
    recommendation       text,
    record_type          text not null default 'CLINICAL_NOTE',
    structured_data_hash text,
    created_at           timestamptz not null default now()
);

alter table public.medical_records enable row level security;
create policy "medical_records: clinical read" on public.medical_records
    for select using (auth.role() = 'authenticated');
create policy "medical_records: doctor write" on public.medical_records
    for all using (
        exists (
            select 1 from public.users u
            where u.id = auth.uid()
              and u.role in ('owner_admin','hospital_admin','doctor')
        )
    );

-- ─────────────────────────────────────────
-- 10. PATIENT VITALS  (MEWS snapshots)
-- ─────────────────────────────────────────
create table if not exists public.patient_vitals (
    id               bigint generated always as identity primary key,
    patient_id       bigint not null references public.patients(id) on delete cascade,
    doctor_username  text   not null,
    heart_rate       double precision not null,
    spo2             double precision not null,
    temperature      double precision not null,
    mews_score       integer not null,
    risk_level       text    not null,
    probability      double precision not null,
    recommendation   text    not null,
    source           text    not null default '/api/predict',
    created_at       timestamptz not null default now()
);

alter table public.patient_vitals enable row level security;
create policy "vitals: clinical read" on public.patient_vitals
    for select using (auth.role() = 'authenticated');
create policy "vitals: doctor write" on public.patient_vitals
    for all using (
        exists (
            select 1 from public.users u
            where u.id = auth.uid()
              and u.role in ('owner_admin','hospital_admin','doctor')
        )
    );

-- ─────────────────────────────────────────
-- 11. AI RECOMMENDATION FEEDBACK
-- ─────────────────────────────────────────
create table if not exists public.ai_recommendation_feedback (
    id             bigint generated always as identity primary key,
    username       text not null,
    patient_id     bigint not null references public.patients(id) on delete cascade,
    response_hash  text not null,
    rating         text not null,
    comments       text,
    created_at     timestamptz not null default now()
);

alter table public.ai_recommendation_feedback enable row level security;
create policy "ai_feedback: clinical read" on public.ai_recommendation_feedback
    for select using (auth.role() = 'authenticated');

-- ─────────────────────────────────────────
-- 12. ADMISSIONS
-- ─────────────────────────────────────────
create table if not exists public.admissions (
    id             bigint generated always as identity primary key,
    patient_id     bigint not null references public.patients(id) on delete cascade,
    room_number    text   not null,
    bed_number     text   not null,
    admission_date timestamptz not null default now(),
    discharge_date timestamptz,
    status         text   not null default 'Admitted'
);

alter table public.admissions enable row level security;
create policy "admissions: authenticated read" on public.admissions
    for select using (auth.role() = 'authenticated');
create policy "admissions: staff write" on public.admissions
    for all using (
        exists (
            select 1 from public.users u
            where u.id = auth.uid()
              and u.role in ('owner_admin','hospital_admin','doctor','staff')
        )
    );

-- ─────────────────────────────────────────
-- 13. INVENTORIES  (Pharmacy)
-- ─────────────────────────────────────────
create table if not exists public.inventories (
    id              bigint generated always as identity primary key,
    item_name       text    unique not null,
    quantity        integer not null default 0,
    unit            text    not null,
    min_threshold   integer not null default 10,
    last_restocked  timestamptz not null default now()
);

alter table public.inventories enable row level security;
create policy "inventories: authenticated read" on public.inventories
    for select using (auth.role() = 'authenticated');
create policy "inventories: staff write" on public.inventories
    for all using (
        exists (
            select 1 from public.users u
            where u.id = auth.uid()
              and u.role in ('owner_admin','hospital_admin','doctor','staff')
        )
    );

-- ─────────────────────────────────────────
-- 14. PRESCRIPTIONS
-- ─────────────────────────────────────────
create table if not exists public.prescriptions (
    id            bigint generated always as identity primary key,
    patient_id    bigint not null references public.patients(id) on delete cascade,
    doctor_id     bigint not null references public.doctors(id)  on delete cascade,
    medicine_name text   not null,
    dosage        text   not null,
    frequency     text   not null,
    duration      text   not null,
    status        text   not null default 'Active',
    created_at    timestamptz not null default now()
);

alter table public.prescriptions enable row level security;
create policy "prescriptions: authenticated read" on public.prescriptions
    for select using (auth.role() = 'authenticated');
create policy "prescriptions: doctor write" on public.prescriptions
    for all using (
        exists (
            select 1 from public.users u
            where u.id = auth.uid()
              and u.role in ('owner_admin','hospital_admin','doctor')
        )
    );

-- ─────────────────────────────────────────
-- 15. STAFF SCHEDULES
-- ─────────────────────────────────────────
create table if not exists public.staff_schedules (
    id                 bigint generated always as identity primary key,
    staff_name         text   not null,
    role               text   not null,
    department_id      bigint references public.departments(id) on delete set null,
    shift_start        timestamptz not null,
    shift_end          timestamptz not null,
    performance_rating double precision not null default 5.0
);

alter table public.staff_schedules enable row level security;
create policy "staff_schedules: authenticated read" on public.staff_schedules
    for select using (auth.role() = 'authenticated');
create policy "staff_schedules: admin write" on public.staff_schedules
    for all using (
        exists (
            select 1 from public.users u
            where u.id = auth.uid()
              and u.role in ('owner_admin','hospital_admin')
        )
    );

-- ─────────────────────────────────────────
-- 16. BILLS
-- ─────────────────────────────────────────
create table if not exists public.bills (
    id             bigint generated always as identity primary key,
    patient_id     bigint not null references public.patients(id)     on delete cascade,
    appointment_id bigint references public.appointments(id)          on delete set null,
    amount         double precision not null,
    status         text   not null default 'Unpaid',
    billing_date   timestamptz not null default now()
);

alter table public.bills enable row level security;
create policy "bills: authenticated read" on public.bills
    for select using (auth.role() = 'authenticated');
create policy "bills: admin write" on public.bills
    for all using (
        exists (
            select 1 from public.users u
            where u.id = auth.uid()
              and u.role in ('owner_admin','hospital_admin')
        )
    );

-- ─────────────────────────────────────────
-- 17. INSURANCE CLAIMS
-- ─────────────────────────────────────────
create table if not exists public.insurance_claims (
    id              bigint generated always as identity primary key,
    bill_id         bigint not null references public.bills(id) on delete cascade,
    provider_name   text   not null,
    policy_number   text   not null,
    claimed_amount  double precision not null,
    status          text   not null default 'Submitted',
    submitted_at    timestamptz not null default now()
);

alter table public.insurance_claims enable row level security;
create policy "insurance_claims: authenticated read" on public.insurance_claims
    for select using (auth.role() = 'authenticated');
create policy "insurance_claims: admin write" on public.insurance_claims
    for all using (
        exists (
            select 1 from public.users u
            where u.id = auth.uid()
              and u.role in ('owner_admin','hospital_admin')
        )
    );

-- ─────────────────────────────────────────
-- 18. LAB ORDERS
-- ─────────────────────────────────────────
create table if not exists public.lab_orders (
    id          bigint generated always as identity primary key,
    patient_id  bigint not null references public.patients(id) on delete cascade,
    doctor_id   bigint not null references public.doctors(id)  on delete cascade,
    test_name   text   not null,
    loinc_code  text   not null,
    status      text   not null default 'Pending',
    result      text,
    created_at  timestamptz not null default now()
);

alter table public.lab_orders enable row level security;
create policy "lab_orders: authenticated read" on public.lab_orders
    for select using (auth.role() = 'authenticated');
create policy "lab_orders: clinical write" on public.lab_orders
    for all using (
        exists (
            select 1 from public.users u
            where u.id = auth.uid()
              and u.role in ('owner_admin','hospital_admin','doctor','staff')
        )
    );

-- ─────────────────────────────────────────
-- 19. RADIOLOGY IMAGES  (PACS references)
-- ─────────────────────────────────────────
create table if not exists public.radiology_images (
    id             bigint generated always as identity primary key,
    patient_id     bigint not null references public.patients(id) on delete cascade,
    doctor_id      bigint not null references public.doctors(id)  on delete cascade,
    image_type     text   not null,
    body_part      text   not null,
    file_path      text   not null,
    ai_prediction  text,
    doctor_notes   text,
    created_at     timestamptz not null default now()
);

alter table public.radiology_images enable row level security;
create policy "radiology: authenticated read" on public.radiology_images
    for select using (auth.role() = 'authenticated');
create policy "radiology: clinical write" on public.radiology_images
    for all using (
        exists (
            select 1 from public.users u
            where u.id = auth.uid()
              and u.role in ('owner_admin','hospital_admin','doctor','staff')
        )
    );

-- ─────────────────────────────────────────
-- 20. AUDIT LOGS  (immutable compliance trail)
-- ─────────────────────────────────────────
create table if not exists public.audit_logs (
    id          bigint generated always as identity primary key,
    username    text   not null,
    action      text   not null,
    action_type text,
    table_name  text   not null,
    record_id   bigint,
    patient_id  bigint,
    data_hash   text,
    details     text,
    created_at  timestamptz not null default now()
);

alter table public.audit_logs enable row level security;
create policy "audit_logs: admin read" on public.audit_logs
    for select using (
        exists (
            select 1 from public.users u
            where u.id = auth.uid()
              and u.role in ('owner_admin','hospital_admin')
        )
    );
create policy "audit_logs: any insert" on public.audit_logs
    for insert with check (auth.role() = 'authenticated');

-- ─────────────────────────────────────────
-- PERFORMANCE INDEXES
-- ─────────────────────────────────────────
create index if not exists idx_appointments_doctor   on public.appointments(doctor_id);
create index if not exists idx_appointments_patient  on public.appointments(patient_id);
create index if not exists idx_appointments_date     on public.appointments(date);
create index if not exists idx_medical_records_patient on public.medical_records(patient_id);
create index if not exists idx_doctors_department    on public.doctors(department_id);
create index if not exists idx_vitals_patient        on public.patient_vitals(patient_id);
create index if not exists idx_feedback_patient      on public.ai_recommendation_feedback(patient_id);
create index if not exists idx_admissions_patient    on public.admissions(patient_id);
create index if not exists idx_prescriptions_patient on public.prescriptions(patient_id);
create index if not exists idx_prescriptions_doctor  on public.prescriptions(doctor_id);
create index if not exists idx_staff_department      on public.staff_schedules(department_id);
create index if not exists idx_bills_patient         on public.bills(patient_id);
create index if not exists idx_claims_bill           on public.insurance_claims(bill_id);
create index if not exists idx_labs_patient          on public.lab_orders(patient_id);
create index if not exists idx_radiology_patient     on public.radiology_images(patient_id);
create index if not exists idx_audit_created         on public.audit_logs(created_at);
create index if not exists idx_audit_patient         on public.audit_logs(patient_id);
create index if not exists idx_tokens_hospital       on public.hospital_access_tokens(hospital_id);
create index if not exists idx_memberships_hospital  on public.hospital_memberships(hospital_id);
create index if not exists idx_memberships_user      on public.hospital_memberships(user_id);

-- ─────────────────────────────────────────
-- AUTO-PROFILE TRIGGER
-- Creates a public.users row when a new Supabase auth user signs up
-- ─────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, username, email, full_name, phone_number, role, account_status)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1) || '_' || floor(random() * 9000 + 1000)::text
    ),
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone_number',
    coalesce(new.raw_user_meta_data->>'role', 'patient'),
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────
-- 7-DAY SESSION CONFIG
-- Run this in the Supabase Dashboard > Auth > Settings, OR via API:
-- Set JWT expiry to 604800 seconds (7 days)
-- Enable "Refresh token rotation"
-- ─────────────────────────────────────────
-- (No SQL needed – configured via the Supabase dashboard Auth settings)
