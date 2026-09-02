# 🏥 Clinicon — وثيقة التوثيق الشاملة

> **نظام إدارة العيادات الطبية** — توثيق تقني كامل  
> الإصدار: `1.0.0` | التاريخ: أغسطس 2026

---

## 📌 جدول المحتويات

1. [فكرة المشروع — Business Overview](#1-فكرة-المشروع--business-overview)
2. [المكونات التقنية — Tech Stack](#2-المكونات-التقنية--tech-stack)
3. [هيكل المشروع — Project Structure](#3-هيكل-المشروع--project-structure)
4. [قاعدة البيانات — Database Schema](#4-قاعدة-البيانات--database-schema)
5. [نظام المصادقة والصلاحيات — Auth & Permissions](#5-نظام-المصادقة-والصلاحيات--auth--permissions)
6. [API Endpoints — الواجهات البرمجية](#6-api-endpoints)
7. [المنطق الأساسي — Core Business Logic](#7-المنطق-الأساسي--core-business-logic)
8. [نظام التذكيرات — Reminder Scheduler](#8-نظام-التذكيرات--reminder-scheduler)
9. [تكامل تليجرام — Telegram Integration](#9-تكامل-تليجرام--telegram-integration)
10. [الأمان — Security Details](#10-الأمان--security-details)
11. [متغيرات البيئة — Environment Variables](#11-متغيرات-البيئة--environment-variables)
12. [تقرير شامل — Full System Report](#12-تقرير-شامل--full-system-report)

---

## 1. فكرة المشروع — Business Overview

### 🎯 الفكرة الأساسية

**Clinicon** هو نظام سحابي متكامل لإدارة العيادات الطبية، يربط بين **أصحاب العيادات** و**الأطباء** و**المرضى** ويتيح إدارة المواعيد، السجلات الطبية، الأدوية، والتذكيرات الآلية في منصة واحدة.

### 💼 المشكلة التي يحلها

| المشكلة | الحل الذي يقدمه Clinicon |
|---------|--------------------------|
| الحجز اليدوي بالهاتف وضياع المواعيد | نظام حجز إلكتروني مع منع التعارض |
| تشتت السجلات الطبية الورقية | سجلات رقمية مركزية لكل مريض |
| نسيان مواعيد الأدوية | تذكيرات تلقائية عبر تليجرام |
| ضعف التواصل عند اعتذار الطبيب | إشعارات فورية مع خيارات إعادة الجدولة |
| صعوبة مراقبة الأداء للعيادة | لوحة إحصائيات تفصيلية لصاحب العيادة |

### 👥 الأطراف المستفيدة (Stakeholders)

```
Clinicon Platform
├── 🏢 صاحب العيادة (Clinic Owner)
│   ├── يدير العيادة وبياناتها والأطباء والمخزون والماليات
│   ├── يرى إحصائيات تحليلات شاملة وسحب الأطباء من المخزن
│   └── يوافق/يرفض طلبات الانضمام والتحليلات المتقدمة
│
├── 💁‍♀️ موظف الاستقبال (Receptionist)
│   ├── إدارة وتتبع الفواتير والماليات والبحث برقم الهاتف
│   ├── تحويل الفواتير إلى مدفوع (Paid) بعد الاستلام
│   └── حجز مواعيد فورية للمرضى واختيار الأطباء
│
├── 👨‍⚕️ الطبيب (Doctor)
│   ├── يدير جدوله وإجازاته وسعر كشفه الخاص
│   ├── يرى قائمة مرضاها اليوم وحالة السداد لكل مريض
│   ├── يكتب وصفات الدواء والروشتات
│   ├── تسليم وقيد استهلاك المستلزمات الطبية من المخزن
│   └── يسجل نتائج الفحص (Visit) بعد التحقق من سداد الفاتورة
│
├── 🧑‍🤝‍🧑 المريض (Patient)
│   ├── يحجز المواعيد إلكترونياً
│   ├── يدير أدويته وتذكيراتها التلقائية
│   ├── يرفع ملفاته الطبية
│   └── يستقبل تذكيرات التليجرام للمواعيد والجرعات
│
└── 🔬 معمل التحاليل (Lab)
    └── مرتبط بعيادة ويتعامل مع نتائج التحاليل
```

---

## 2. المكونات التقنية — Tech Stack

| الطبقة | التقنية | الإصدار |
|--------|---------|---------|
| **Web Framework** | FastAPI | `>= 0.100.0` |
| **ASGI Server** | Uvicorn | `>= 0.22.0` |
| **ORM** | SQLAlchemy | `2.0.21` |
| **Database** | PostgreSQL | أي إصدار حديث |
| **DB Migration** | Alembic | `>= 1.11.0` |
| **Data Validation** | Pydantic v2 | `>= 2.0.0` |
| **Authentication** | JWT (python-jose) | `>= 3.3.0` |
| **Password Hashing** | bcrypt | `>= 4.0.0` |
| **HTTP Client** | httpx | `>= 0.24.0` |
| **Notifications** | Telegram Bot API | (via httpx) |
| **Language** | Python | `3.11+` |
| **Port** | `5000` | — |

---

## 3. هيكل المشروع — Project Structure

```
clinicon-backend/
├── app/
│   ├── main.py                     # نقطة بداية التطبيق وتسجيل الـ routers
│   ├── config.py                   # إعدادات النظام وقراءة .env
│   ├── database.py                 # اتصال قاعدة البيانات (SQLAlchemy engine)
│   │
│   ├── core/
│   │   ├── security.py             # JWT: إنشاء/فك التشفير | bcrypt: تشفير كلمة المرور
│   │   └── dependencies.py         # FastAPI dependencies للتحقق من الأدوار
│   │
│   ├── models/                     # ORM Models (جداول قاعدة البيانات)
│   │   ├── __init__.py             # استيراد جميع النماذج
│   │   ├── user.py                 # User + UserRole enum
│   │   ├── patient.py              # Patient + Allergy + ChronicDisease + PatientNote + Notification
│   │   ├── doctor.py               # Doctor + DoctorAvailability + DoctorLeave
│   │   ├── clinic.py               # Clinic + LabEntity
│   │   ├── appointment.py          # Appointment + AppointmentStatus enum
│   │   ├── medical_record.py       # Visit (سجل الزيارة)
│   │   ├── medication.py           # Medication + MedicationReminder
│   │   ├── file.py                 # MedicalFile
│   │   └── audit_log.py            # AuditLog
│   │
│   ├── routers/                    # API Route Handlers
│   │   ├── auth.py                 # POST /auth/register | /auth/login
│   │   ├── appointments.py         # GET/POST المواعيد، الأطباء، الإحصائيات
│   │   ├── clinic_owner.py         # إدارة العيادة (CRUD + موافقات الأعضاء)
│   │   ├── doctors.py              # إجازات الطبيب + إشعارات المرضى
│   │   ├── medications.py          # إدارة الأدوية والتذكيرات
│   │   ├── files.py                # رفع/جلب الملفات الطبية
│   │   ├── visit.py                # تسجيل زيارة
│   │   ├── patient_notes.py        # ملاحظات الطبيب على المريض
│   │   ├── telegram.py             # webhook/polling البوت
│   │   ├── chatbot.py              # واجهة الـ AI Agent
│   │   └── medical_records.py      # (stub)
│   │
│   ├── schemas/                    # Pydantic Schemas (Request/Response)
│   │   ├── user.py | auth.py | doctor.py | patient.py
│   │   ├── appointment.py | medication.py | medication_reminder.py
│   │   ├── medical_record.py | file.py | visit.py | patient_note.py
│   │   └── medical_file.py
│   │
│   ├── services/                   # Business Logic Layer
│   │   ├── auth_service.py         # تسجيل/دخول المستخدمين
│   │   ├── medication_service.py   # CRUD الأدوية والتذكيرات
│   │   ├── reminder_scheduler.py   # Background Thread للتذكيرات
│   │   ├── visit_service.py        # منطق تسجيل الزيارة
│   │   └── patient_note_service.py # ملاحظات المريض
│   │
│   └── utils/
│       └── file_validation.py      # التحقق من نوع وحجم الملفات
│
├── requirements.txt
├── .env / .env.example
└── README.md
```

---

## 4. قاعدة البيانات — Database Schema

### 4.1 جدول `users` — المستخدمون

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name       VARCHAR(200) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,  -- indexed
    password_hash   TEXT NOT NULL,                  -- bcrypt hash
    phone_number    VARCHAR(30) UNIQUE,
    role            VARCHAR(50) NOT NULL,            -- ENUM: patient | doctor | lab | clinic_owner | admin
    is_active       BOOLEAN DEFAULT TRUE,
    pending_clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

> `pending_clinic_id`: يستخدم عند طلب الانضمام لعيادة — يُمسح بعد الموافقة أو الرفض.

---

### 4.2 جدول `clinics` — العيادات

```sql
CREATE TABLE clinics (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_name     VARCHAR(200) NOT NULL,
    address         TEXT,
    phone           VARCHAR(30),
    location_url    TEXT,
    specializations TEXT,   -- comma-separated: "cardiology,orthopedics"
    owner_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,  -- indexed
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4.3 جدول `lab_entities` — معامل التحاليل

```sql
CREATE TABLE lab_entities (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    clinic_id    UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name         VARCHAR(200) NOT NULL,
    contact_info TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4.4 جدول [patients](file:///c:/Users/ZBOOK/clinicon-backend/app/routers/appointments.py#403-445) — بيانات المريض

```sql
CREATE TABLE patients (
    id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                   UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clinic_id                 UUID REFERENCES clinics(id) ON DELETE SET NULL,
    date_of_birth             DATE,
    gender                    VARCHAR(10),        -- ENUM: male | female
    address                   TEXT,
    blood_type                VARCHAR(3),         -- A+, B-, O+ ...
    emergency_contact_name    VARCHAR(200),
    emergency_contact_phone   VARCHAR(30),
    telegram_chat_id          BIGINT,             -- للتذكيرات
    telegram_notif_enabled    BOOLEAN DEFAULT FALSE,
    created_at                TIMESTAMPTZ DEFAULT NOW(),
    updated_at                TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4.5 جدول [doctors](file:///c:/Users/ZBOOK/clinicon-backend/app/routers/appointments.py#27-56) — بيانات الطبيب

```sql
CREATE TABLE doctors (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clinic_id               UUID REFERENCES clinics(id) ON DELETE SET NULL,
    specialization          VARCHAR(150) NOT NULL,
    slot_duration_minutes   INTEGER DEFAULT 15,   -- مدة الموعد
    bio                     TEXT,
    location_url            TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4.6 جدول `doctor_availability` — جدول عمل الطبيب الأسبوعي

```sql
CREATE TABLE doctor_availability (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id    UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week  SMALLINT,    -- 0=Monday, 1=Tuesday, ..., 6=Sunday
    start_time   TIME NOT NULL,
    end_time     TIME NOT NULL,
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_start_time_before_end_time CHECK (start_time < end_time)
);
```

> **الجدول الافتراضي:** عند تسجيل طبيب جديد تُنشأ تلقائياً 6 سجلات (السبت-الخميس، 09:00–17:00).

---

### 4.7 جدول [doctor_leave](file:///c:/Users/ZBOOK/clinicon-backend/app/routers/doctors.py#123-142) — إجازات الطبيب

```sql
CREATE TABLE doctor_leave (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id    UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    leave_date   TIMESTAMPTZ NOT NULL,
    start_time   TIME NOT NULL,
    end_time     TIME NOT NULL,
    reason       VARCHAR(500),
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

> عند تسجيل إجازة: يُستبعد هذا النطاق الزمني تلقائياً من الـ available slots ويُرسل إشعار تليجرام للمرضى المتأثرين.

---

### 4.8 جدول `appointments` — المواعيد

```sql
CREATE TABLE appointments (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id         UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    appointment_date  TIMESTAMPTZ NOT NULL,   -- indexed
    status            VARCHAR(50) DEFAULT 'pending',
    -- ENUM: pending | confirmed | rescheduled | cancelled_by_doctor | cancelled_by_patient | completed | cancelled
    patient_name      VARCHAR(200),  -- الاسم وقت الحجز
    patient_phone     VARCHAR(50),   -- الهاتف وقت الحجز
    notes             TEXT,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_doctor_slot UNIQUE (doctor_id, appointment_date)
);
```

> `UNIQUE(doctor_id, appointment_date)` يمنع حجز نفس الـ slot مرتين.

---

### 4.9 جدول `visits` — سجل الزيارة الطبية

```sql
CREATE TABLE visits (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id       UUID NOT NULL REFERENCES patients(id),
    doctor_id        UUID NOT NULL REFERENCES doctors(id),
    appointment_id   UUID UNIQUE REFERENCES appointments(id) ON DELETE SET NULL,
    visit_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    chief_complaint  TEXT,    -- الشكوى الرئيسية
    diagnosis        TEXT,    -- التشخيص
    doctor_notes     TEXT,    -- ملاحظات الطبيب
    follow_up_date   DATE,    -- موعد المتابعة
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

> تُنشأ تلقائياً عند إنهاء الطبيب لكشف المريض (mark as done).

---

### 4.10 جدول [medications](file:///c:/Users/ZBOOK/clinicon-backend/app/routers/medications.py#90-99) — الأدوية

```sql
CREATE TABLE medications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id      UUID NOT NULL REFERENCES patients(id),
    visit_id        UUID REFERENCES visits(id) ON DELETE SET NULL,
    prescribed_by   UUID REFERENCES doctors(id),   -- الطبيب الواصف
    medicine_name   VARCHAR(200) NOT NULL,
    dosage          VARCHAR(100),      -- "500mg"
    frequency       VARCHAR(100),      -- "مرتين يومياً"
    start_date      DATE,
    end_date        DATE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_medication_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
```

---

### 4.11 جدول `medication_reminders` — تذكيرات الأدوية

```sql
CREATE TABLE medication_reminders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medication_id   UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    reminder_time   TIME NOT NULL,   -- وقت أخذ الجرعة
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4.12 جدول `allergies` — الحساسيات

```sql
CREATE TABLE allergies (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    allergy_name  VARCHAR(150) NOT NULL,
    severity      VARCHAR(20),   -- "mild" | "moderate" | "severe"
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4.13 جدول `chronic_diseases` — الأمراض المزمنة

```sql
CREATE TABLE chronic_diseases (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id     UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    disease_name   VARCHAR(150) NOT NULL,
    diagnosed_at   DATE,
    notes          TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4.14 جدول `patient_notes` — ملاحظات الطبيب على المريض

```sql
CREATE TABLE patient_notes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id  UUID NOT NULL REFERENCES patients(id),
    doctor_id   UUID NOT NULL REFERENCES doctors(id),
    note        TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4.15 جدول `medical_files` — الملفات الطبية

```sql
CREATE TABLE medical_files (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id          UUID NOT NULL REFERENCES patients(id),
    visit_id            UUID REFERENCES visits(id) ON DELETE SET NULL,
    uploaded_by_user_id UUID REFERENCES users(id),
    category            VARCHAR(50),    -- "xray" | "lab" | "prescription" ...
    file_name           VARCHAR(255),
    file_url            TEXT,
    mime_type           VARCHAR(100),
    file_size           BIGINT,         -- bytes
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4.16 جدول `notifications` — الإشعارات

```sql
CREATE TABLE notifications (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id   UUID NOT NULL REFERENCES patients(id),
    title        VARCHAR(255) NOT NULL,
    message      TEXT NOT NULL,
    type         VARCHAR(50),
    -- ENUM: Reminder | Doctor Changed | Appointment Rescheduled | Appointment Cancelled
    status       VARCHAR(30),
    scheduled_at TIMESTAMPTZ,
    sent_at      TIMESTAMPTZ,
    is_read      BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4.17 جدول `audit_logs` — سجل الأحداث

```sql
CREATE TABLE audit_logs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID REFERENCES users(id),
    action       VARCHAR(100) NOT NULL,    -- "CREATE" | "UPDATE" | "DELETE"
    entity_type  VARCHAR(100) NOT NULL,    -- "Appointment" | "Medication" ...
    entity_id    UUID,
    old_value    JSONB,
    new_value    JSONB,
    ip_address   VARCHAR(45),
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4.18 مخطط العلاقات — Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o| patients : "has profile"
    users ||--o| doctors : "has profile"
    users ||--o{ clinics : "owns"

    clinics ||--o{ doctors : "employs"
    clinics ||--o{ lab_entities : "has"
    clinics ||--o{ patients : "serves"

    doctors ||--o{ doctor_availability : "has schedule"
    doctors ||--o{ doctor_leave : "requests leave"
    doctors ||--o{ appointments : "receives"
    doctors ||--o{ visits : "conducts"
    doctors ||--o{ medications : "prescribes"
    doctors ||--o{ patient_notes : "writes"

    patients ||--o{ appointments : "books"
    patients ||--o{ visits : "attends"
    patients ||--o{ allergies : "has"
    patients ||--o{ chronic_diseases : "has"
    patients ||--o{ medications : "takes"
    patients ||--o{ medication_reminders : "receives"
    patients ||--o{ medical_files : "owns"
    patients ||--o{ notifications : "receives"
    patients ||--o{ patient_notes : "about"

    appointments ||--o| visits : "leads to"
    visits ||--o{ medications : "from visit"
    visits ||--o{ medical_files : "attached"
    medications ||--o{ medication_reminders : "has"
```

---

## 5. نظام المصادقة والصلاحيات — Auth & Permissions

### 5.1 دورة حياة المصادقة

```
[Client] ──POST /api/auth/register──► [AuthService]
                                           │
                                    Hash password (bcrypt)
                                    Create User record
                                    Create Profile (Patient/Doctor/Lab/Clinic)
                                           │
[Client] ──POST /api/auth/login───► [AuthService]
                                           │
                                    Verify password (bcrypt.checkpw)
                                    Generate JWT Token (24 hours)
                                           │
                                    Return { access_token, role, user_id, doctor_id }
```

### 5.2 JWT Token Structure

```json
{
  "sub": "uuid-of-user",
  "email": "user@example.com",
  "role": "doctor",
  "exp": 1724000000
}
```

- **Algorithm:** `HS256`
- **Expiry:** `24 hours`
- **Secret Key:** من متغير البيئة `SECRET_KEY`

### 5.3 مصفوفة الصلاحيات — Permissions Matrix

| الـ Endpoint | patient | doctor | clinic_owner | receptionist | lab | guest |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `POST /auth/register` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /auth/login` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /doctors` | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| `GET /doctors/{id}/available-slots` | ✅ | ✅ | — | ✅ | — | ✅ |
| `POST /book` | ✅ | — | — | ✅ | — | — |
| `GET /billing/invoices` | — | — | ✅ | ✅ | — | — |
| `PUT /billing/invoices/{id}/pay` | — | — | ✅ | ✅ | — | — |
| `GET /inventory/consumptions` | — | — | ✅ | — | — | — |
| `POST /inventory/consumptions` | — | ✅ | — | — | — | — |
| `GET /queue` | ✅ | ✅ | ✅ | — | — | — |
| `PUT /patient/{id}/done` | — | ✅ (يتطلب دفعت) | — | — | — | — |
| `GET /medications/` | ✅ | — | — | — | — |
| `POST /medications/` | ✅ | — | — | — | — |
| `POST /medications/prescribe` | — | ✅ | — | — | — |
| `GET /medications/patient/{id}` | — | ✅ | — | — | — |
| `DELETE /medications/{id}` | ✅ | — | — | — | — |
| `DELETE /medications/doctor/{id}` | — | ✅ | — | — | — |
| `POST /doctors/leave` | — | ✅ | — | — | — |
| `POST /doctors/leave/end-today` | — | ✅ | — | — | — |
| `GET /clinic/my-clinic` | — | — | ✅ | — | — |
| `PUT /clinic/update` | — | — | ✅ | — | — |
| `GET /clinic/my-doctors` | — | — | ✅ | — | — |
| `GET /clinic/my-labs` | — | — | ✅ | — | — |
| `GET /clinic/stats` | — | — | ✅ | — | — |
| `GET /clinic/pending-requests` | — | — | ✅ | — | — |
| `POST /clinic/approve-request/{id}` | — | — | ✅ | — | — |
| `POST /clinic/reject-request/{id}` | — | — | ✅ | — | — |
| `POST /clinic/add-member` | — | — | ✅ | — | — |

### 5.4 آلية التسجيل حسب الدور

```
role = clinic_owner:
  → ينشئ User + Clinic مباشرة، is_active = TRUE

role = doctor (مع clinic_email):
  → ينشئ User + Doctor Profile، is_active = FALSE حتى الموافقة
  → يُقيَّد pending_clinic_id
  → يُنشئ جدول أسبوعي افتراضي (السبت–الخميس 9-5)

role = patient (مع clinic_email):
  → ينشئ User + Patient Profile، is_active = TRUE فوراً
  → يُربط بالعيادة مباشرة عبر clinic_id

role = lab (مع clinic_email):
  → ينشئ User + LabEntity، is_active = FALSE حتى الموافقة
```

---

## 6. API Endpoints

### 6.1 المصادقة — `/api/auth`

| Method | URL | الوصف | Auth |
|--------|-----|-------|------|
| `POST` | `/api/auth/register` | تسجيل مستخدم جديد | ❌ |
| `POST` | `/api/auth/login` | تسجيل الدخول (JSON أو Form) | ❌ |
| `GET` | `/api/auth/verify-token` | التحقق من الـ Token | ❌ (stub) |

**Request (register):**
```json
{
  "full_name": "أحمد محمد",
  "email": "ahmed@example.com",
  "password": "Str0ngP@ss",
  "phone_number": "01012345678",
  "role": "patient",
  "clinic_email": "clinic_owner@example.com",
  "date_of_birth": "1990-05-15",
  "gender": "male",
  "blood_type": "O+"
}
```

**Response (login):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user_id": "uuid",
  "full_name": "أحمد محمد",
  "role": "patient",
  "email": "ahmed@example.com",
  "doctor_id": null
}
```

---

### 6.2 المواعيد — `/api`

| Method | URL | الوصف | Auth |
|--------|-----|-------|------|
| `GET` | `/api/doctors` | قائمة الأطباء المتاحين | اختياري |
| `GET` | `/api/doctors/{id}/available-slots?date=YYYY-MM-DD` | الـ slots المتاحة | ❌ |
| `POST` | `/api/book` | حجز موعد | patient |
| `GET` | `/api/queue` | قائمة المواعيد (حسب الدور) | ✅ |
| `GET` | `/api/patients` | مرضى اليوم للطبيب | doctor |
| `GET` | `/api/stats` | إحصائيات اليوم للطبيب | doctor |
| `PUT` | `/api/patient/{appointment_id}/done` | إنهاء كشف مريض | doctor |

**آلية حساب الـ Available Slots:**
```
1. احضر جدول الطبيب للـ day_of_week المطلوب
2. احضر إجازات الطبيب لذلك اليوم
3. قسّم النطاق الزمني إلى slots بحجم slot_duration_minutes (الافتراضي 15 دق)
4. استثنِ الـ slots المتعارضة مع إجازة
5. استثنِ الـ slots المحجوزة مسبقاً (status: pending/confirmed)
6. إذا كان اليوم = اليوم الحالي، استثنِ الـ slots الماضية
```

---

### 6.3 إدارة العيادة — `/api/clinic`

| Method | URL | الوصف | Auth |
|--------|-----|-------|------|
| `POST` | `/api/clinic/register` | تسجيل عيادة جديدة | clinic_owner |
| `PUT` | `/api/clinic/update` | تحديث بيانات العيادة | clinic_owner |
| `GET` | `/api/clinic/my-clinic` | بيانات عيادتي | clinic_owner |
| `GET` | `/api/clinic/my-doctors` | أطبائي مع الجداول | clinic_owner |
| `GET` | `/api/clinic/my-labs` | معاملي | clinic_owner |
| `GET` | `/api/clinic/stats?date=YYYY-MM-DD` | إحصائيات العيادة | clinic_owner |
| `POST` | `/api/clinic/add-member` | إضافة طبيب/معمل مباشرة | clinic_owner |
| `POST` | `/api/clinic/invite-doctor` | توليد دعوة انضمام | clinic_owner |
| `GET` | `/api/clinic/pending-requests` | طلبات الانضمام المعلقة | clinic_owner |
| `POST` | `/api/clinic/approve-request/{user_id}` | قبول طلب | clinic_owner |
| `POST` | `/api/clinic/reject-request/{user_id}` | رفض طلب (+ حذف) | clinic_owner |

---

### 6.4 إدارة الأدوية — `/api/medications`

| Method | URL | الوصف | Auth |
|--------|-----|-------|------|
| `POST` | `/api/medications/` | إضافة دواء جديد (مريض) | patient |
| `GET` | `/api/medications/` | أدويتي الحالية | patient |
| `PUT` | `/api/medications/{id}` | تعديل دواء | patient |
| `DELETE` | `/api/medications/{id}` | إيقاف دواء (soft delete) | patient |
| `POST` | `/api/medications/prescribe` | وصف دواء لمريض | doctor |
| `GET` | `/api/medications/patient/{id}` | أدوية مريض معين | doctor |
| `PUT` | `/api/medications/doctor/{id}` | تعديل دواء مريض | doctor |
| `DELETE` | `/api/medications/doctor/{id}` | إيقاف دواء مريض | doctor |
| `POST` | `/api/medications/{id}/reminders` | إضافة تذكيرات زمنية | patient |
| `GET` | `/api/medications/telegram-status` | حالة ربط تليجرام | patient |
| `POST` | `/api/medications/telegram-link` | ربط تليجرام يدوياً | patient |
| `GET` | `/api/medications/telegram-link-url` | لينك ربط تليجرام | patient |

---

### 6.5 إجازات الطبيب — `/api/doctors`

| Method | URL | الوصف | Auth |
|--------|-----|-------|------|
| `POST` | `/api/doctors/leave` | تسجيل إجازة + إشعار المرضى | doctor |
| `POST` | `/api/doctors/leave/end-today` | إنهاء عمل اليوم + إشعار | doctor |

---

### 6.6 ملاحظات المريض — `/api/patient-notes`

| Method | URL | الوصف | Auth |
|--------|-----|-------|------|
| `POST` | `/api/patient-notes/` | كتابة ملاحظة | doctor |
| `GET` | `/api/patient-notes/{patient_id}` | ملاحظات مريض معين | doctor |

---

### 6.7 Chatbot / AI Agent — `/api/chatbot`

| Method | URL | الوصف | Auth |
|--------|-----|-------|------|
| `POST` | `/api/chatbot/chat` | إرسال رسالة للـ AI Agent | ✅ |

> يُرسل الطلب إلى خدمة خارجية على `AGENT_SERVICE_URL` (افتراضياً `http://localhost:8200/chat`).

---

### 6.8 Other Endpoints

| Method | URL | الوصف |
|--------|-----|-------|
| `GET` | `/api/health` | فحص صحة الخادم |
| `POST` | `/api/files/upload` | رفع ملف طبي |
| `GET` | `/api/files/{patient_id}` | ملفات مريض |
| `POST` | `/api/visit/` | تسجيل زيارة |
| `GET` | `/api/visit/{patient_id}` | تاريخ زيارات مريض |

---

## 7. المنطق الأساسي — Core Business Logic

### 7.1 دورة حياة الموعد

```
حجز (pending)
     │
     ▼
تأكيد (confirmed) ◄── اختياري
     │
     ├── إنهاء الكشف ──► مكتمل (completed)
     │                       │
     │                       └──► إنشاء Visit تلقائياً
     │
     ├── اعتذار الطبيب ──► cancelled_by_doctor
     │
     └── إلغاء المريض ──► cancelled_by_patient
```

### 7.2 منع تعارض المواعيد

- `UNIQUE CONSTRAINT` على [(doctor_id, appointment_date)](file:///c:/Users/ZBOOK/clinicon-backend/app/models/user.py#16-34) في قاعدة البيانات
- التحقق قبل الحجز أن الـ slot مدرج في [available_slots](file:///c:/Users/ZBOOK/clinicon-backend/app/routers/appointments.py#126-153)
- استبعاد الـ slots المحجوزة أو المتعارضة مع إجازة أثناء استرداد الـ slots

### 7.3 إنشاء Visit تلقائياً

عند استدعاء `PUT /patient/{id}/done`:
1. تتغير حالة الموعد إلى `completed`
2. إذا لم توجد [Visit](file:///c:/Users/ZBOOK/clinicon-backend/app/models/medical_record.py#7-27) مرتبطة:
   - تُحضر آخر [PatientNote](file:///c:/Users/ZBOOK/clinicon-backend/app/models/patient.py#65-76) كتبها الطبيب لهذا المريض
   - تُنشأ [Visit](file:///c:/Users/ZBOOK/clinicon-backend/app/models/medical_record.py#7-27) جديدة بالـ notes الموجودة

---

## 8. نظام التذكيرات — Reminder Scheduler

يعمل النظام كـ **Background Thread** منفصل يُشغَّل عند بدء التطبيق، ويفحص قاعدة البيانات كل **60 ثانية**.

### خريطة التدفق

```
start_scheduler()
      │
      └──► daemon thread │ _scheduler_loop()
                         │   (كل 60 ثانية)
                         ├── _check_telegram_starts()    → ربط المرضى الجدد بالبوت
                         ├── _check_reminders()           → تذكيرات الأدوية (قبل الجرعة بـ 5 دق)
                         └── _check_appointment_reminders() → تذكير الموعد (قبل 3 ساعات)
```

### 8.1 تذكيرات الأدوية

```python
window = [-1 دقيقة, +6 دقائق] من الوقت الحالي
# يتم إرسال التذكير حين: (reminder_time - 5min) inside window
# يُمنع الإرسال المكرر: using _sent_today = Set of (reminder_id, date)
```

**نموذج الرسالة:**
```
💊 تذكير دواء

الدواء: باراسيتامول
الجرعة: 500mg
الموعد: 14:00

⏰ موعد جرعتك بعد 5 دقايق!
```

### 8.2 تذكيرات المواعيد

- يُرسل قبل الموعد بـ **3 ساعات** (نافذة ±1 دقيقة)
- لا يُرسل إلا للمرضى الذين ربطوا تليجرام وفعّلوا الإشعارات

**نموذج الرسالة:**
```
📅 تذكير موعد

لديك موعد مع الدكتور أحمد محمود
الساعة: 10:30

موعدك بعد 3 ساعات، يرجى الاستعداد. ⏰
```

---

## 9. تكامل تليجرام — Telegram Integration

### 9.1 ربط الحساب بتليجرام (Deep Link)

```
1. المريض يطلب GET /medications/telegram-link-url
2. النظام يُنشئ: https://t.me/{bot_username}?start={patient_uuid}
3. المريض يضغط الرابط → يفتح البوت → يرسل /start {patient_uuid}
4. الـ Scheduler يستقبل الـ update → يُسجّل chat_id → يُرسل رسالة تأكيد
```

### 9.2 إشعار اعتذار الطبيب (Inline Keyboard)

عند تسجيل إجازة:
```
⚠️ تنبيه اعتذار طبيب

عزيزي المريض، اعتذر الطبيب عن موعدك يوم 2024-09-01 الساعة 10:30
السبب: ظروف طارئة

يسعدنا مساعدتك:
[⏳ أستنى الموعد الجاي]
[🚨 محتاج أدخل النهاردة]
```

---

## 10. الأمان — Security Details

### 10.1 تشفير كلمات المرور

```python
# Hashing
bcrypt.hashpw(password.encode('utf-8')[:72], bcrypt.gensalt())

# Verification
bcrypt.checkpw(plain.encode('utf-8')[:72], stored_hash.encode('utf-8'))
```

- **لا يُستخدم passlib** — bcrypt مباشرة لتجنب مشاكل التوافق
- يُقطع الـ password عند 72 بايت (حد bcrypt)

### 10.2 JWT Authentication Flow

```python
# إنشاء Token
jwt.encode({"sub": user_id, "email": email, "role": role, "exp": ...}, SECRET_KEY, "HS256")

# فك التشفير
jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
```

### 10.3 Role Guards (FastAPI Dependencies)

```python
# استخدام في كل endpoint يحتاج صلاحية
current_user: User = Depends(require_doctor)    # يرفع 403 إذا لم يكن doctor
current_user: User = Depends(require_patient)   # يرفع 403 إذا لم يكن patient
current_user: User = Depends(require_clinic_owner)
current_user: User = Depends(get_current_user)  # أي مستخدم مسجل دخول
```

### 10.4 CORS

```python
allow_origins=["*"]  # ⚠️ يُعدَّل في الـ Production للـ domain المحدد
allow_credentials=True
allow_methods=["*"]
allow_headers=["*"]
```

### 10.5 Data Isolation (حماية البيانات)

- مريض يرى مواعيده فقط (مقيدة بـ [patient_id](file:///c:/Users/ZBOOK/clinicon-backend/app/routers/medications.py#26-32))
- طبيب يرى مرضاه فقط (مقيدة بـ `doctor_id`)
- صاحب العيادة يرى بيانات عيادته فقط (مقيدة بـ `clinic_id`)
- لا يمكن لمريض تعديل دواء مريض آخر (التحقق بـ [patient_id](file:///c:/Users/ZBOOK/clinicon-backend/app/routers/medications.py#26-32) قبل كل عملية)

---

## 11. متغيرات البيئة — Environment Variables

| المتغير | الوصف | القيمة الافتراضية |
|---------|-------|------------------|
| `DATABASE_URL` | رابط قاعدة البيانات | `postgresql://postgres:postgres@localhost:5432/clinic_db` |
| `SECRET_KEY` | مفتاح تشفير JWT | `change-this-secret-key-in-production` |
| `AGENT_SERVICE_URL` | رابط خدمة الـ AI Agent | `http://localhost:8200/chat` |
| `TELEGRAM_BOT_TOKEN` | توكن بوت تليجرام | [(empty)](file:///c:/Users/ZBOOK/clinicon-backend/app/models/user.py#16-34) |

---

## 12. تقرير شامل — Full System Report

### 12.1 ملخص تنفيذي

Clinicon هو Backend API متكامل يخدم منظومة إدارة العيادات الطبية بأربع فئات من المستخدمين. النظام مبني على FastAPI مع PostgreSQL، ويتبع نمط **معمارية الطبقات (Layered Architecture)**: Routers → Services → Models.

### 12.2 الإحصائيات التقنية

| المعيار | القيمة |
|---------|--------|
| عدد الجداول في قاعدة البيانات | **17 جدول** |
| عدد الـ API Endpoints | **~40 endpoint** |
| عدد الـ Roles | **5 أدوار** |
| عدد النماذج (Pydantic Schemas) | **~25 schema** |
| خدمات الـ Background | **1 daemon thread (scheduler)** |
| تكاملات خارجية | **Telegram Bot API، AI Agent** |

### 12.3 نقاط القوة

- ✅ **منع التعارض:** UNIQUE constraint + منطق slot validation مزدوج
- ✅ **الفصل بين الأدوار:** dependency guards على كل endpoint
- ✅ **التذكيرات الآلية:** لا تتطلب تدخل بشري
- ✅ **Deep Link لتليجرام:** ربط سلس وآمن بـ UUID
- ✅ **Soft Delete للأدوية:** لا حذف حقيقي — `is_active = False`
- ✅ **إنشاء Visit تلقائياً** عند إنهاء الكشف

### 12.4 نقاط التحسين المحتملة

- ⚠️ **CORS مفتوح:** يجب تقييده بـ domains محددة في الـ Production
- ⚠️ **لا rate limiting:** قد يُستغل Endpoint التسجيل
- ⚠️ **لا soft-delete للمواعيد:** الإلغاء يغير الـ status فقط لكن البيانات موجودة
- ⚠️ **Telegram polling:** يعمل بـ polling داخل الـ scheduler — يُفضَّل webhook في الـ Production
- ⚠️ **لا Alembic migrations مُطبَّقة:** يُستخدم `Base.metadata.create_all()` مع manual ALTER

### 12.5 كيفية تشغيل المشروع

```bash
# 1. إنشاء بيئة افتراضية
python -m venv venv
venv\Scripts\activate  # Windows

# 2. تثبيت المتطلبات
pip install -r requirements.txt

# 3. إعداد ملف البيئة
copy .env.example .env
# عدّل DATABASE_URL و SECRET_KEY و TELEGRAM_BOT_TOKEN

# 4. تشغيل الخادم
uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload

# 5. Swagger UI
# http://localhost:5000/docs
```

### 12.6 تدفق الطلب الكامل — Request Lifecycle

```
Client Request
     │
     ▼
FastAPI Router (تحديد الـ endpoint)
     │
     ▼
Dependency Injection
  ├── get_db() → Session قاعدة البيانات
  └── get_current_user() → فك JWT → جلب User من DB
       └── require_* → التحقق من الـ role
     │
     ▼
Route Handler (business logic)
  ├── SQLAlchemy Queries
  ├── Service Layer (للعمليات المعقدة)
  └── Telegram notifications (عند الحاجة)
     │
     ▼
JSONResponse ← Pydantic Serialization ← DB Models
     │
     ▼
Client Response
```

---

> 📝 **ملاحظة:** هذه الوثيقة تصف النظام كما هو مُطبَّق بالفعل في الكود المصدري. أي تطوير مستقبلي يجب أن يُحدَّث فيها.
