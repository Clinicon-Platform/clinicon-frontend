from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import require_clinic_owner
from app.models.user import User
from app.models.clinic import Clinic
from app.models.billing import ExpenseCategory
from app.schemas.expense import ExpenseCreate, ExpenseResponse
from app.services.expense_service import ExpenseService

router = APIRouter(prefix="/expenses", tags=["Expenses"])


def _get_clinic_id(user: User, db: Session):
    clinic = db.query(Clinic).filter(Clinic.owner_user_id == user.id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="لم تقم بتسجيل عيادة بعد")
    return clinic.id


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    current_user: User = Depends(require_clinic_owner),
    db: Session = Depends(get_db)
):
    """تسجيل مصروف جديد للعيادة (clinic_owner فقط)"""
    clinic_id = _get_clinic_id(current_user, db)
    return ExpenseService.create_expense(db, clinic_id, payload)


@router.get("", response_model=List[ExpenseResponse])
def list_expenses(
    category: Optional[ExpenseCategory] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    current_user: User = Depends(require_clinic_owner),
    db: Session = Depends(get_db)
):
    """عرض قائمة المصروفات مع الفلترة حسب الفئة أو الفترة الزمنية (clinic_owner فقط)"""
    clinic_id = _get_clinic_id(current_user, db)
    return ExpenseService.list_expenses(
        db=db,
        clinic_id=clinic_id,
        category=category,
        date_from=date_from,
        date_to=date_to
    )
