import uuid
from decimal import Decimal
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user, require_doctor, require_patient, require_clinic_owner
from app.core.dependencies import get_current_user, require_doctor, require_patient, require_clinic_owner, require_receptionist_or_owner
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.clinic import Clinic
from app.models.appointment import Appointment
from app.models.billing import Invoice
from app.schemas.billing import InvoiceResponse, InvoiceUpdate

router = APIRouter(prefix="", tags=["Billing"])


class ConsultationPriceUpdate(BaseModel):
    consultation_price: Decimal


@router.get("/billing/invoices/me", response_model=List[InvoiceResponse])
def get_my_invoices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    جلب فواتير المستخدم الحالي حسب دوره:
    - clinic_owner أو receptionist: جميع فواتير عيادتهم
    - doctor: فواتير مواعيده هو فقط
    - patient: فواتيره هو فقط
    """
    if current_user.role in [UserRole.clinic_owner, UserRole.receptionist]:
        clinic_id = None
        if current_user.role == UserRole.clinic_owner:
            clinic = db.query(Clinic).filter(Clinic.owner_user_id == current_user.id).first()
            if clinic:
                clinic_id = clinic.id
        elif current_user.role == UserRole.receptionist:
            if current_user.pending_clinic_id:
                clinic_id = current_user.pending_clinic_id
            else:
                # Fallback: first clinic
                clinic = db.query(Clinic).first()
                if clinic:
                    clinic_id = clinic.id

        if not clinic_id:
            return []
        invoices = db.query(Invoice).filter(Invoice.clinic_id == clinic_id).order_by(Invoice.created_at.desc()).all()
        for inv in invoices:
            if inv.appointment:
                inv.patient_name = inv.appointment.patient_name or (inv.appointment.patient.user.full_name if inv.appointment.patient and inv.appointment.patient.user else None)
                inv.patient_phone = inv.appointment.patient_phone or (inv.appointment.patient.user.phone_number if inv.appointment.patient and inv.appointment.patient.user else None)
                inv.doctor_name = inv.appointment.doctor.user.full_name if inv.appointment.doctor and inv.appointment.doctor.user else None
        return invoices

    elif current_user.role == UserRole.doctor:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor:
            return []
        invoices = (
            db.query(Invoice)
            .join(Appointment, Invoice.appointment_id == Appointment.id)
            .filter(Appointment.doctor_id == doctor.id)
            .order_by(Invoice.created_at.desc())
            .all()
        )
        for inv in invoices:
            if inv.appointment:
                inv.patient_name = inv.appointment.patient_name or (inv.appointment.patient.user.full_name if inv.appointment.patient and inv.appointment.patient.user else None)
                inv.patient_phone = inv.appointment.patient_phone or (inv.appointment.patient.user.phone_number if inv.appointment.patient and inv.appointment.patient.user else None)
                inv.doctor_name = inv.appointment.doctor.user.full_name if inv.appointment.doctor and inv.appointment.doctor.user else None
        return invoices

    elif current_user.role == UserRole.patient:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        return (
            db.query(Invoice)
            .join(Appointment, Invoice.appointment_id == Appointment.id)
            .filter(Appointment.patient_id == patient.id)
            .order_by(Invoice.created_at.desc())
            .all()
        )

    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="غير مصرح لك بالوصول")


@router.patch("/billing/invoices/{invoice_id}/payment", response_model=InvoiceResponse)
def update_invoice_payment(
    invoice_id: uuid.UUID,
    payload: InvoiceUpdate,
    current_user: User = Depends(require_receptionist_or_owner),
    db: Session = Depends(get_db)
):
    """صاحب العيادة أو موظف الاستقبال يحدّث payment_method و payment_status للفاتورة"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="الفاتورة غير موجودة")

    if payload.payment_method is not None:
        invoice.payment_method = payload.payment_method
    if payload.payment_status is not None:
        invoice.payment_status = payload.payment_status

    db.commit()
    db.refresh(invoice)
    return invoice


@router.patch("/doctors/me/consultation-price")
def update_consultation_price(
    payload: ConsultationPriceUpdate,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    """طبيب يحدّث سعر الكشف بتاعه"""
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="ملف الطبيب غير موجود")

    doctor.consultation_price = payload.consultation_price
    db.commit()
    db.refresh(doctor)

    return {
        "success": True,
        "message": "تم تحديث سعر الكشف بنجاح",
        "consultation_price": str(doctor.consultation_price)
    }
