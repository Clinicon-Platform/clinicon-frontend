import uuid
from typing import Dict, Any, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, case, String

from app.models.doctor import Doctor, DoctorAvailability, DoctorLeave
from app.models.appointment import Appointment, AppointmentStatus
from app.models.billing import Invoice, Expense, PaymentStatus
from app.models.patient import Patient


def get_doctor_performance(
    db: Session,
    clinic_id: uuid.UUID,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None
) -> list[Dict[str, Any]]:
    """
    أداء الأطباء داخل العيادة.
    في حالة عدم تحديد date_from/date_to، يتم استخدام آخر 30 يوماً كـ default.
    """
    if not date_from:
        date_from = (datetime.utcnow() - timedelta(days=30)).date()
    if not date_to:
        date_to = datetime.utcnow().date()

    start_dt = datetime.combine(date_from, datetime.min.time())
    end_dt = datetime.combine(date_to, datetime.max.time())

    doctors = db.query(Doctor).filter(Doctor.clinic_id == clinic_id).all()
    results = []

    for doctor in doctors:
        # 1. Total appointments/patients seen count in range
        patient_count = (
            db.query(func.count(Appointment.id))
            .filter(
                Appointment.doctor_id == doctor.id,
                Appointment.appointment_date >= start_dt,
                Appointment.appointment_date <= end_dt
            )
            .scalar() or 0
        )

        # 2. No-show rate = (no_show appointments) / (total appointments excluding pending/cancelled)
        no_show_count = (
            db.query(func.count(Appointment.id))
            .filter(
                Appointment.doctor_id == doctor.id,
                Appointment.appointment_date >= start_dt,
                Appointment.appointment_date <= end_dt,
                Appointment.status == AppointmentStatus.no_show
            )
            .scalar() or 0
        )

        valid_appointments_count = (
            db.query(func.count(Appointment.id))
            .filter(
                Appointment.doctor_id == doctor.id,
                Appointment.appointment_date >= start_dt,
                Appointment.appointment_date <= end_dt,
                Appointment.status.notin_([
                    AppointmentStatus.pending,
                    AppointmentStatus.cancelled,
                    AppointmentStatus.cancelled_by_doctor,
                    AppointmentStatus.cancelled_by_patient
                ])
            )
            .scalar() or 0
        )

        no_show_rate = (float(no_show_count) / float(valid_appointments_count)) if valid_appointments_count > 0 else 0.0

        # 3. Occupancy rate = (booked appointments) / (total available slots minus leave slots)
        booked_count = (
            db.query(func.count(Appointment.id))
            .filter(
                Appointment.doctor_id == doctor.id,
                Appointment.appointment_date >= start_dt,
                Appointment.appointment_date <= end_dt,
                Appointment.status.in_([AppointmentStatus.confirmed, AppointmentStatus.completed, AppointmentStatus.no_show])
            )
            .scalar() or 0
        )

        # Calculate total available slots for doctor within date_from to date_to
        total_possible_slots = 0
        availabilities = db.query(DoctorAvailability).filter(
            DoctorAvailability.doctor_id == doctor.id,
            DoctorAvailability.is_active == True
        ).all()
        slot_duration = doctor.slot_duration_minutes or 15

        curr_date = date_from
        while curr_date <= date_to:
            day_of_week = curr_date.weekday()
            day_avails = [a for a in availabilities if a.day_of_week == day_of_week]
            for avail in day_avails:
                if avail.start_time and avail.end_time:
                    s_dt = datetime.combine(curr_date, avail.start_time)
                    e_dt = datetime.combine(curr_date, avail.end_time)
                    mins = (e_dt - s_dt).total_seconds() / 60
                    slots_count = int(mins // slot_duration)
                    total_possible_slots += max(0, slots_count)
            curr_date += timedelta(days=1)

        # Subtract leaves
        leaves = db.query(DoctorLeave).filter(
            DoctorLeave.doctor_id == doctor.id,
            func.date(DoctorLeave.leave_date) >= date_from,
            func.date(DoctorLeave.leave_date) <= date_to
        ).all()
        leave_slots_count = 0
        for leave in leaves:
            s_dt = datetime.combine(leave.leave_date.date(), leave.start_time)
            e_dt = datetime.combine(leave.leave_date.date(), leave.end_time)
            mins = (e_dt - s_dt).total_seconds() / 60
            leave_slots_count += int(mins // slot_duration)

        net_available_slots = max(0, total_possible_slots - leave_slots_count)
        occupancy_rate = (float(booked_count) / float(net_available_slots)) if net_available_slots > 0 else 0.0

        # 4. Total revenue for this doctor (paid invoices)
        total_revenue = (
            db.query(func.coalesce(func.sum(Invoice.amount), Decimal(0)))
            .join(Appointment, Invoice.appointment_id == Appointment.id)
            .filter(
                Appointment.doctor_id == doctor.id,
                Invoice.clinic_id == clinic_id,
                Invoice.payment_status == PaymentStatus.paid,
                Appointment.appointment_date >= start_dt,
                Appointment.appointment_date <= end_dt
            )
            .scalar()
        )

        results.append({
            "doctor_id": str(doctor.id),
            "doctor_name": doctor.user.full_name if doctor.user else "—",
            "patient_count": patient_count,
            "no_show_rate": round(no_show_rate, 4),
            "occupancy_rate": round(occupancy_rate, 4),
            "total_revenue": str(total_revenue)
        })

    return results


def get_patient_insights(
    db: Session,
    clinic_id: uuid.UUID,
    month: Optional[str] = None  # Format: "YYYY-MM"
) -> Dict[str, Any]:
    """
    تحليلات المرضى للعيادة.
    في حالة عدم تحديد month (YYYY-MM)، يتم استخدام الشهر الحالي كـ default.
    """
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")

    try:
        year, month_num = map(int, month.split("-"))
        start_date = date(year, month_num, 1)
        if month_num == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month_num + 1, 1) - timedelta(days=1)
    except Exception:
        start_date = (datetime.utcnow() - timedelta(days=30)).date()
        end_date = datetime.utcnow().date()

    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())

    # Get all doctors in clinic to scope appointments
    doctors = db.query(Doctor).filter(Doctor.clinic_id == clinic_id).all()
    doc_ids = [d.id for d in doctors]

    if not doc_ids:
        return {
            "new_patients_count": 0,
            "recurring_patients_count": 0,
            "top_repeat_patients": [],
            "average_visit_value": "0"
        }

    patient_identity = func.coalesce(
        func.nullif(Appointment.patient_phone, ''),
        func.cast(Appointment.patient_id, String)
    ).label("patient_key")

    # First appointment date per unique patient (by phone/id) in this clinic
    first_appts = (
        db.query(
            patient_identity,
            func.min(Appointment.appointment_date).label("first_date")
        )
        .filter(Appointment.doctor_id.in_(doc_ids))
        .group_by(patient_identity)
        .subquery()
    )

    new_patients_count = (
        db.query(func.count(first_appts.c.patient_key))
        .filter(
            first_appts.c.first_date >= start_dt,
            first_appts.c.first_date <= end_dt
        )
        .scalar() or 0
    )

    # Patient appointment counts in current period (grouped by phone/id)
    patient_period_counts = (
        db.query(
            patient_identity,
            func.count(Appointment.id).label("period_cnt")
        )
        .filter(
            Appointment.doctor_id.in_(doc_ids),
            Appointment.appointment_date >= start_dt,
            Appointment.appointment_date <= end_dt
        )
        .group_by(patient_identity)
        .subquery()
    )

    # Recurring patients: patients in this period whose first visit was BEFORE this period OR had >1 visits in this period
    recurring_patients_count = (
        db.query(func.count(patient_period_counts.c.patient_key))
        .join(first_appts, patient_period_counts.c.patient_key == first_appts.c.patient_key)
        .filter(
            (first_appts.c.first_date < start_dt) | (patient_period_counts.c.period_cnt > 1)
        )
        .scalar() or 0
    )

    # Top 5 repeat patients in clinic
    top_5 = (
        db.query(
            patient_identity,
            func.max(Appointment.patient_name).label("p_name"),
            func.count(Appointment.id).label("appt_cnt")
        )
        .filter(Appointment.doctor_id.in_(doc_ids))
        .group_by(patient_identity)
        .order_by(func.count(Appointment.id).desc())
        .limit(5)
        .all()
    )

    top_repeat_patients = []
    for p_key, p_name, cnt in top_5:
        top_repeat_patients.append({
            "patient_id": str(p_key),
            "patient_name": p_name or "—",
            "appointment_count": cnt
        })

    # Average visit value = SUM(paid invoices) / COUNT(completed appointments) in range
    paid_sum = (
        db.query(func.coalesce(func.sum(Invoice.amount), Decimal(0)))
        .join(Appointment, Invoice.appointment_id == Appointment.id)
        .filter(
            Invoice.clinic_id == clinic_id,
            Invoice.payment_status == PaymentStatus.paid,
            Appointment.appointment_date >= start_dt,
            Appointment.appointment_date <= end_dt
        )
        .scalar()
    )

    completed_cnt = (
        db.query(func.count(Appointment.id))
        .filter(
            Appointment.doctor_id.in_(doc_ids),
            Appointment.status == AppointmentStatus.completed,
            Appointment.appointment_date >= start_dt,
            Appointment.appointment_date <= end_dt
        )
        .scalar() or 0
    )

    avg_val = (paid_sum / Decimal(completed_cnt)) if completed_cnt > 0 else Decimal(0)

    return {
        "new_patients_count": new_patients_count,
        "recurring_patients_count": recurring_patients_count,
        "top_repeat_patients": top_repeat_patients,
        "average_visit_value": str(round(avg_val, 2))
    }


def get_income_report(
    db: Session,
    clinic_id: uuid.UUID,
    period: str = "monthly",
    date_from: Optional[date] = None,
    date_to: Optional[date] = None
) -> Dict[str, Any]:
    """
    تقرير الإيرادات للعيادة.
    في حالة عدم تحديد date_from/date_to، يتم استخدام آخر 30 يوماً كـ default.
    """
    if not date_from:
        date_from = (datetime.utcnow() - timedelta(days=30)).date()
    if not date_to:
        date_to = datetime.utcnow().date()

    start_dt = datetime.combine(date_from, datetime.min.time())
    end_dt = datetime.combine(date_to, datetime.max.time())

    # Total income (SUM paid invoices)
    total_income = (
        db.query(func.coalesce(func.sum(Invoice.amount), Decimal(0)))
        .filter(
            Invoice.clinic_id == clinic_id,
            Invoice.payment_status == PaymentStatus.paid,
            Invoice.created_at >= start_dt,
            Invoice.created_at <= end_dt
        )
        .scalar()
    )

    # Income by doctor
    doc_incomes = (
        db.query(
            Appointment.doctor_id,
            func.coalesce(func.sum(Invoice.amount), Decimal(0)).label("sum_amt")
        )
        .join(Invoice, Invoice.appointment_id == Appointment.id)
        .filter(
            Invoice.clinic_id == clinic_id,
            Invoice.payment_status == PaymentStatus.paid,
            Invoice.created_at >= start_dt,
            Invoice.created_at <= end_dt
        )
        .group_by(Appointment.doctor_id)
        .all()
    )
    income_by_doctor = {str(doc_id): str(sum_amt) for doc_id, sum_amt in doc_incomes}

    # Income by specialization
    spec_incomes = (
        db.query(
            Doctor.specialization,
            func.coalesce(func.sum(Invoice.amount), Decimal(0)).label("sum_amt")
        )
        .join(Appointment, Doctor.id == Appointment.doctor_id)
        .join(Invoice, Invoice.appointment_id == Appointment.id)
        .filter(
            Invoice.clinic_id == clinic_id,
            Invoice.payment_status == PaymentStatus.paid,
            Invoice.created_at >= start_dt,
            Invoice.created_at <= end_dt
        )
        .group_by(Doctor.specialization)
        .all()
    )
    income_by_specialization = {spec: str(sum_amt) for spec, sum_amt in spec_incomes if spec}

    return {
        "period": period,
        "total_income": str(total_income),
        "income_by_doctor": income_by_doctor,
        "income_by_specialization": income_by_specialization
    }


def get_expense_report(
    db: Session,
    clinic_id: uuid.UUID,
    month: Optional[str] = None  # Format: "YYYY-MM"
) -> Dict[str, Any]:
    """
    تقرير المصروفات وصافي الربح للعيادة.
    في حالة عدم تحديد month (YYYY-MM)، يتم استخدام الشهر الحالي كـ default.
    """
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")

    try:
        year, month_num = map(int, month.split("-"))
        start_date = date(year, month_num, 1)
        if month_num == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month_num + 1, 1) - timedelta(days=1)
    except Exception:
        start_date = (datetime.utcnow() - timedelta(days=30)).date()
        end_date = datetime.utcnow().date()

    # Expenses by category in month
    exp_records = (
        db.query(
            Expense.category,
            func.coalesce(func.sum(Expense.amount), Decimal(0)).label("sum_amt")
        )
        .filter(
            Expense.clinic_id == clinic_id,
            Expense.expense_date >= start_date,
            Expense.expense_date <= end_date
        )
        .group_by(Expense.category)
        .all()
    )

    total_by_category = {cat.value if hasattr(cat, 'value') else str(cat): str(sum_amt) for cat, sum_amt in exp_records}
    total_expenses = sum([Decimal(v) for v in total_by_category.values()], Decimal(0))

    # Total income in same month
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())

    total_income = (
        db.query(func.coalesce(func.sum(Invoice.amount), Decimal(0)))
        .filter(
            Invoice.clinic_id == clinic_id,
            Invoice.payment_status == PaymentStatus.paid,
            Invoice.created_at >= start_dt,
            Invoice.created_at <= end_dt
        )
        .scalar()
    )

    net_profit = total_income - total_expenses

    return {
        "month": month,
        "total_by_category": total_by_category,
        "total_expenses": str(total_expenses),
        "total_income": str(total_income),
        "net_profit": str(net_profit)
    }
