import io
import uuid
from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user, require_clinic_owner, require_doctor
from app.models.user import User, UserRole
from app.models.clinic import Clinic
from app.models.doctor import Doctor
from app.services.analytics_service import (
    get_doctor_performance,
    get_patient_insights,
    get_income_report,
    get_expense_report
)
from app.services.export_service import export_to_excel, export_to_pdf

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _get_owner_clinic_id(user: User, db: Session) -> uuid.UUID:
    clinic = db.query(Clinic).filter(Clinic.owner_user_id == user.id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="لم تقم بتسجيل عيادة بعد")
    return clinic.id


def _build_owner_dashboard_data(
    db: Session,
    clinic_id: uuid.UUID,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    doctor_id: Optional[uuid.UUID] = None,
    specialization: Optional[str] = None
) -> dict:
    doc_perf = get_doctor_performance(db, clinic_id, date_from, date_to)

    # Optional filter on doctor performance array
    if doctor_id:
        doc_perf = [d for d in doc_perf if d.get("doctor_id") == str(doctor_id)]
    if specialization:
        # Filter doctors by specialization
        spec_docs = (
            db.query(Doctor.id)
            .filter(Doctor.clinic_id == clinic_id, Doctor.specialization.ilike(f"%{specialization}%"))
            .all()
        )
        spec_doc_ids = {str(d.id) for d in spec_docs}
        doc_perf = [d for d in doc_perf if d.get("doctor_id") in spec_doc_ids]

    month_str = date_from.strftime("%Y-%m") if date_from else None

    patient_insights = get_patient_insights(db, clinic_id, month=month_str)
    income_report = get_income_report(db, clinic_id, period="monthly", date_from=date_from, date_to=date_to)
    expense_report = get_expense_report(db, clinic_id, month=month_str)

    return {
        "clinic_id": str(clinic_id),
        "doctor_performance": doc_perf,
        "patient_insights": patient_insights,
        "income_report": income_report,
        "expense_report": expense_report
    }


@router.get("/owner")
def get_owner_dashboard(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    doctor_id: Optional[uuid.UUID] = Query(None),
    specialization: Optional[str] = Query(None),
    current_user: User = Depends(require_clinic_owner),
    db: Session = Depends(get_db)
):
    """لوحة تحكم مالك العيادة (تتضمن أداء الأطباء، تحليل المرضى، الإيرادات، المصروفات، صافي الربح)"""
    clinic_id = _get_owner_clinic_id(current_user, db)
    return _build_owner_dashboard_data(db, clinic_id, date_from, date_to, doctor_id, specialization)


@router.get("/doctor/me")
def get_doctor_dashboard(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    """لوحة تحكم الطبيب الحالي (يعرض أداءه الشخصي فقط)"""
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="ملف الطبيب غير موجود")

    # If doctor has no clinic_id, return zero-data fallback (don't crash)
    if not doctor.clinic_id:
        return {
            "success": True,
            "data": {
                "doctor_id": str(doctor.id),
                "doctor_name": current_user.full_name,
                "patient_count": 0,
                "no_show_rate": 0.0,
                "occupancy_rate": 0.0,
                "revenue": 0,
                "consultation_price": float(doctor.consultation_price) if doctor.consultation_price is not None else None
            }
        }

    doc_perf = get_doctor_performance(db, doctor.clinic_id, date_from, date_to)
    my_perf = next((d for d in doc_perf if d.get("doctor_id") == str(doctor.id)), None)

    if not my_perf:
        my_perf = {
            "doctor_id": str(doctor.id),
            "doctor_name": current_user.full_name,
            "patient_count": 0,
            "no_show_rate": 0.0,
            "occupancy_rate": 0.0,
            "revenue": 0,
        }

    # Always include consultation_price
    my_perf["consultation_price"] = float(doctor.consultation_price) if doctor.consultation_price is not None else None

    # Normalize revenue field (backend returns total_revenue as string)
    if "total_revenue" in my_perf:
        my_perf["revenue"] = float(my_perf.pop("total_revenue") or 0)

    return {
        "success": True,
        "data": my_perf
    }



@router.get("/owner/export")
def export_owner_dashboard(
    format: str = Query("excel", regex="^(excel|pdf)$"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    doctor_id: Optional[uuid.UUID] = Query(None),
    specialization: Optional[str] = Query(None),
    current_user: User = Depends(require_clinic_owner),
    db: Session = Depends(get_db)
):
    """تصدير تقارير لوحة التحكم بصيغة Excel أو PDF (clinic_owner فقط)"""
    clinic_id = _get_owner_clinic_id(current_user, db)
    data = _build_owner_dashboard_data(db, clinic_id, date_from, date_to, doctor_id, specialization)

    if format == "excel":
        file_bytes = export_to_excel(data, filename="owner_dashboard.xlsx")
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = "owner_dashboard.xlsx"
    else:
        file_bytes = export_to_pdf(data, filename="owner_dashboard.pdf")
        media_type = "application/pdf"
        filename = "owner_dashboard.pdf"

    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
