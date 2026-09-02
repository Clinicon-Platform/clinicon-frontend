import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user, require_clinic_owner, require_doctor
from app.models.user import User, UserRole
from app.models.clinic import Clinic
from app.models.doctor import Doctor
from app.models.inventory import Supply, SupplyConsumption
from app.schemas.inventory import (
    SupplyCreate,
    SupplyUpdate,
    SupplyResponse,
    SupplyConsumptionCreate,
    SupplyConsumptionResponse
)
from app.services.inventory_service import InventoryService

router = APIRouter(prefix="/inventory", tags=["Inventory"])


def _get_user_clinic_id(user: User, db: Session) -> uuid.UUID:
    """Helper to extract clinic_id for clinic_owner or doctor"""
    if user.role == UserRole.clinic_owner:
        clinic = db.query(Clinic).filter(Clinic.owner_user_id == user.id).first()
        if not clinic:
            raise HTTPException(status_code=404, detail="لم تقم بتسجيل عيادة بعد")
        return clinic.id
    elif user.role == UserRole.doctor:
        doctor = db.query(Doctor).filter(Doctor.user_id == user.id).first()
        if not doctor or not doctor.clinic_id:
            raise HTTPException(status_code=404, detail="الطبيب غير مرتبط بأي عيادة")
        return doctor.clinic_id
    else:
        raise HTTPException(status_code=403, detail="غير مصرح لك بالوصول")


@router.post("/supplies", response_model=SupplyResponse, status_code=status.HTTP_201_CREATED)
def create_supply(
    payload: SupplyCreate,
    current_user: User = Depends(require_clinic_owner),
    db: Session = Depends(get_db)
):
    """إضافة مستلزم جديد بالمخزون (clinic_owner فقط)"""
    clinic_id = _get_user_clinic_id(current_user, db)
    return InventoryService.create_supply(db, clinic_id, payload)


@router.get("/supplies", response_model=List[SupplyResponse])
def list_supplies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """عرض قائمة المستلزمات لعيادة المستخدم الحالي (clinic_owner و doctor فقط)"""
    if current_user.role not in [UserRole.clinic_owner, UserRole.doctor]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="غير مصرح لك بالوصول")
    clinic_id = _get_user_clinic_id(current_user, db)
    return InventoryService.get_supplies_by_clinic(db, clinic_id)


@router.patch("/supplies/{id}", response_model=SupplyResponse)
def update_supply(
    id: uuid.UUID,
    payload: SupplyUpdate,
    current_user: User = Depends(require_clinic_owner),
    db: Session = Depends(get_db)
):
    """تعديل بيانات مستلزم بالمخزون (clinic_owner فقط)"""
    clinic_id = _get_user_clinic_id(current_user, db)
    return InventoryService.update_supply(db, clinic_id, id, payload)


@router.post("/consumptions", response_model=SupplyConsumptionResponse, status_code=status.HTTP_201_CREATED)
def record_consumption(
    payload: SupplyConsumptionCreate,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    """تسجيل استهلاك كمية من مستلزم (doctor فقط)"""
    clinic_id = _get_user_clinic_id(current_user, db)
    return InventoryService.record_consumption(
        db=db,
        supply_id=payload.supply_id,
        quantity_used=payload.quantity_used,
        visit_id=payload.visit_id,
        user=current_user,
        clinic_id=clinic_id
    )


@router.get("/consumptions")
def list_consumptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """عرض سجل الاستهلاك للمستلزمات والأطباء"""
    clinic_id = _get_user_clinic_id(current_user, db)
    consumptions = (
        db.query(SupplyConsumption)
        .join(Supply, SupplyConsumption.supply_id == Supply.id)
        .filter(Supply.clinic_id == clinic_id)
        .order_by(SupplyConsumption.created_at.desc())
        .all()
    )
    res = []
    for c in consumptions:
        res.append({
            "id": str(c.id),
            "supply_name": c.supply.name if c.supply else "—",
            "unit": c.supply.unit if c.supply else "pcs",
            "quantity_used": float(c.quantity_used),
            "doctor_name": c.consumed_by.full_name if c.consumed_by else "—",
            "date": c.created_at.isoformat() if c.created_at else None
        })
    return res

