import uuid
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from app.models.billing import ExpenseCategory

class ExpenseCreate(BaseModel):
    category: ExpenseCategory
    amount: Decimal
    description: Optional[str] = None
    expense_date: date

class ExpenseResponse(BaseModel):
    id: uuid.UUID
    clinic_id: uuid.UUID
    category: ExpenseCategory
    amount: Decimal
    description: Optional[str] = None
    expense_date: date
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
