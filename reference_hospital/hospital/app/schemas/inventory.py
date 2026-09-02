import uuid
from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict

class SupplyCreate(BaseModel):
    name: str
    unit: str
    current_stock: Decimal = Decimal(0)
    low_stock_threshold: Decimal

class SupplyUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    current_stock: Optional[Decimal] = None
    low_stock_threshold: Optional[Decimal] = None

class SupplyResponse(BaseModel):
    id: uuid.UUID
    clinic_id: uuid.UUID
    name: str
    unit: str
    current_stock: Decimal
    low_stock_threshold: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SupplyConsumptionCreate(BaseModel):
    supply_id: uuid.UUID
    quantity_used: Decimal
    visit_id: Optional[uuid.UUID] = None

class SupplyConsumptionResponse(BaseModel):
    id: uuid.UUID
    supply_id: uuid.UUID
    visit_id: Optional[uuid.UUID] = None
    quantity_used: Decimal
    consumed_by_user_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
