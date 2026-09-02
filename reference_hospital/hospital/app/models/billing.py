import enum
import uuid
from sqlalchemy import Column, String, Text, Numeric, ForeignKey, Enum, DateTime, Uuid, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class PaymentMethod(str, enum.Enum):
    cash = 'cash'
    insurance = 'insurance'

class PaymentStatus(str, enum.Enum):
    pending = 'pending'
    paid = 'paid'

class ExpenseCategory(str, enum.Enum):
    rent = 'rent'
    salaries = 'salaries'
    supplies = 'supplies'
    maintenance = 'maintenance'
    bills = 'bills'

class Invoice(Base):
    __tablename__ = 'invoices'

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    appointment_id = Column(Uuid(as_uuid=True), ForeignKey('appointments.id'), unique=True, nullable=True)
    clinic_id = Column(Uuid(as_uuid=True), ForeignKey('clinics.id'), nullable=False)
    amount = Column(Numeric, nullable=False)
    payment_method = Column(Enum(PaymentMethod, name='payment_method', native_enum=False))
    payment_status = Column(Enum(PaymentStatus, name='payment_status', native_enum=False), default=PaymentStatus.pending)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    appointment = relationship("Appointment")
    clinic = relationship("Clinic")

class Expense(Base):
    __tablename__ = 'expenses'

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clinic_id = Column(Uuid(as_uuid=True), ForeignKey('clinics.id'), nullable=False)
    category = Column(Enum(ExpenseCategory, name='expense_category', native_enum=False))
    amount = Column(Numeric, nullable=False)
    description = Column(Text, nullable=True)
    expense_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    clinic = relationship("Clinic")
