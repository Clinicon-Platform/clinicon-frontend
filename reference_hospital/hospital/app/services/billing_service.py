import uuid
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.billing import Invoice, PaymentStatus
from app.models.doctor import Doctor
from app.models.appointment import Appointment

class BillingService:
    @staticmethod
    def create_invoice_for_appointment(db: Session, appointment: Appointment) -> Invoice:
        # Check if invoice already exists for this appointment
        existing_invoice = db.query(Invoice).filter(Invoice.appointment_id == appointment.id).first()
        if existing_invoice:
            return existing_invoice

        # Fetch doctor to get consultation_price and clinic_id
        doctor = db.query(Doctor).filter(Doctor.id == appointment.doctor_id).first()
        
        amount = Decimal(0)
        clinic_id = None
        if doctor:
            if doctor.consultation_price is not None:
                amount = Decimal(str(doctor.consultation_price))
            clinic_id = doctor.clinic_id

        # If clinic_id is not set on doctor, fallback to patient's clinic_id if available
        if not clinic_id and appointment.patient:
            clinic_id = appointment.patient.clinic_id

        invoice = Invoice(
            appointment_id=appointment.id,
            clinic_id=clinic_id,
            amount=amount,
            payment_status=PaymentStatus.pending
        )
        db.add(invoice)
        db.flush()
        return invoice
