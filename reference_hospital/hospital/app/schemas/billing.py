import uuid
from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from app.models.billing import PaymentMethod, PaymentStatus

class InvoiceCreate(BaseModel):
    appointment_id: uuid.UUID
    clinic_id: uuid.UUID
    amount: Decimal
    payment_method: Optional[PaymentMethod] = None
    payment_status: PaymentStatus = PaymentStatus.pending

class InvoiceResponse(BaseModel):
    id: uuid.UUID
    appointment_id: Optional[uuid.UUID] = None
    amount: Decimal
    payment_method: Optional[PaymentMethod] = None
    payment_status: PaymentStatus
    created_at: datetime
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
    doctor_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class InvoiceUpdate(BaseModel):
    payment_method: Optional[PaymentMethod] = None
    payment_status: Optional[PaymentStatus] = None
