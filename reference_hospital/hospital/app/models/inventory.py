import uuid
from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime, Uuid
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Supply(Base):
    __tablename__ = 'supplies'

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clinic_id = Column(Uuid(as_uuid=True), ForeignKey('clinics.id'), nullable=False)
    name = Column(String(255), nullable=False)
    unit = Column(String(50))
    current_stock = Column(Numeric, default=0)
    low_stock_threshold = Column(Numeric, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    clinic = relationship("Clinic")
    consumptions = relationship("SupplyConsumption", back_populates="supply", cascade="all, delete-orphan")

class SupplyConsumption(Base):
    __tablename__ = 'supply_consumptions'

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    supply_id = Column(Uuid(as_uuid=True), ForeignKey('supplies.id'), nullable=False)
    visit_id = Column(Uuid(as_uuid=True), ForeignKey('visits.id'), nullable=True)
    quantity_used = Column(Numeric, nullable=False)
    consumed_by_user_id = Column(Uuid(as_uuid=True), ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    supply = relationship("Supply", back_populates="consumptions")
    visit = relationship("Visit")
    consumed_by = relationship("User")
