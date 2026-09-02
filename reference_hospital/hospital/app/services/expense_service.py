import uuid
from typing import List, Optional
from datetime import date
from sqlalchemy.orm import Session
from app.models.billing import Expense, ExpenseCategory
from app.schemas.expense import ExpenseCreate

class ExpenseService:
    @staticmethod
    def create_expense(db: Session, clinic_id: uuid.UUID, data: ExpenseCreate) -> Expense:
        expense = Expense(
            clinic_id=clinic_id,
            category=data.category,
            amount=data.amount,
            description=data.description,
            expense_date=data.expense_date
        )
        db.add(expense)
        db.commit()
        db.refresh(expense)
        return expense

    @staticmethod
    def list_expenses(
        db: Session,
        clinic_id: uuid.UUID,
        category: Optional[ExpenseCategory] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> List[Expense]:
        query = db.query(Expense).filter(Expense.clinic_id == clinic_id)

        if category is not None:
            query = query.filter(Expense.category == category)
        if date_from is not None:
            query = query.filter(Expense.expense_date >= date_from)
        if date_to is not None:
            query = query.filter(Expense.expense_date <= date_to)

        return query.order_by(Expense.expense_date.desc(), Expense.created_at.desc()).all()
