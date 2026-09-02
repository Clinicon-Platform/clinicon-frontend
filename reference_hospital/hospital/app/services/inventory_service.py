import uuid
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.inventory import Supply, SupplyConsumption
from app.models.clinic import Clinic
from app.models.patient import Notification, Patient
from app.models.user import User, UserRole
from app.schemas.inventory import SupplyCreate, SupplyUpdate

class InventoryService:
    @staticmethod
    def create_supply(db: Session, clinic_id: uuid.UUID, data: SupplyCreate) -> Supply:
        supply = Supply(
            clinic_id=clinic_id,
            name=data.name,
            unit=data.unit,
            current_stock=data.current_stock,
            low_stock_threshold=data.low_stock_threshold
        )
        db.add(supply)
        db.commit()
        db.refresh(supply)
        return supply

    @staticmethod
    def get_supplies_by_clinic(db: Session, clinic_id: uuid.UUID) -> List[Supply]:
        return db.query(Supply).filter(Supply.clinic_id == clinic_id).all()

    @staticmethod
    def update_supply(db: Session, clinic_id: uuid.UUID, supply_id: uuid.UUID, data: SupplyUpdate) -> Supply:
        supply = db.query(Supply).filter(Supply.id == supply_id, Supply.clinic_id == clinic_id).first()
        if not supply:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="المستلزم غير موجود أو لا ينتمي لعيادتك")

        for key, value in data.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(supply, key, value)

        db.commit()
        db.refresh(supply)
        return supply

    @staticmethod
    def record_consumption(
        db: Session,
        supply_id: uuid.UUID,
        quantity_used: Decimal,
        visit_id: Optional[uuid.UUID],
        user: User,
        clinic_id: uuid.UUID
    ) -> SupplyConsumption:
        # a. Confirm supply belongs to user's clinic
        supply = db.query(Supply).filter(Supply.id == supply_id, Supply.clinic_id == clinic_id).first()
        if not supply:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="المستلزم غير موجود في مخزون عيادتك"
            )

        # b. Ensure current_stock does not go below 0
        if supply.current_stock < quantity_used:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"الكمية المطلوبة ({quantity_used}) أكبر من المخزون المتاح ({supply.current_stock})"
            )

        supply.current_stock -= quantity_used

        # c. Create SupplyConsumption record
        consumption = SupplyConsumption(
            supply_id=supply.id,
            visit_id=visit_id,
            quantity_used=quantity_used,
            consumed_by_user_id=user.id
        )
        db.add(consumption)

        # d. Low stock notification check
        if supply.current_stock <= supply.low_stock_threshold:
            clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
            if clinic and clinic.owner_user_id:
                # Find patient record for owner or any patient tied to owner if Notification requires patient_id FK
                # Check Notification model constraint: patient_id is ForeignKey('patients.id'), nullable=False
                owner_patient = db.query(Patient).filter(Patient.user_id == clinic.owner_user_id).first()
                if owner_patient:
                    notif = Notification(
                        patient_id=owner_patient.id,
                        title="تنبيه نقص المخزون",
                        message=f"تنبيه: وصل مخزون الصنف '{supply.name}' إلى {supply.current_stock} {supply.unit} (الحد الأدنى: {supply.low_stock_threshold})",
                        type="LowStock",
                        status="unread",
                        is_read=False
                    )
                    db.add(notif)

        db.commit()
        db.refresh(consumption)
        return consumption
