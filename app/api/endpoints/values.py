from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.value import Value as ValueModel
from app.models.account import Account as AccountModel
from app.schemas.value import Value, ValueCreate

router = APIRouter()


@router.post("/", response_model=Value)
def create_value(value: ValueCreate, db: Session = Depends(get_db)):
    """
    Create or update a value entry for an account on a specific date
    """
    # Check if the account exists
    account = (
        db.query(AccountModel).filter(AccountModel.name == value.account_name).first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Check if a value already exists for this account and date
    # Truncate time part for date comparison (only compare year, month, day)
    existing_value = (
        db.query(ValueModel)
        .filter(
            ValueModel.account_name == value.account_name,
            # Extract date part for comparison
            func.date(ValueModel.date) == func.date(value.date),
        )
        .first()
    )

    if existing_value:
        # Update existing value
        existing_value.amount = value.amount
        existing_value.date = (
            value.date
        )  # Update timestamp too in case time part changed
        db.commit()
        db.refresh(existing_value)
        return existing_value
    else:
        # Create new value
        db_value = ValueModel(
            account_name=value.account_name, amount=value.amount, date=value.date
        )
        db.add(db_value)
        db.commit()
        db.refresh(db_value)
        return db_value


@router.get("/", response_model=List[Value])
def list_values(
    account_name: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """
    List values with optional filtering by account and date range
    """
    query = db.query(ValueModel)

    if account_name:
        query = query.filter(ValueModel.account_name == account_name)

    if start_date:
        query = query.filter(ValueModel.date >= start_date)

    if end_date:
        query = query.filter(ValueModel.date <= end_date)

    values = query.order_by(ValueModel.date.desc()).offset(skip).limit(limit).all()
    return values


@router.delete("/{value_id}", response_model=dict)
def delete_value(value_id: str, db: Session = Depends(get_db)):
    """
    Delete a value by ID
    """
    db_value = db.query(ValueModel).filter(ValueModel.id == value_id).first()
    if db_value is None:
        raise HTTPException(status_code=404, detail="Value not found")

    db.delete(db_value)
    db.commit()
    return {"message": "Value deleted successfully"}


@router.get("/account/{account_name}", response_model=List[Value])
def get_values_by_account(
    account_name: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
):
    """
    Get all values for a specific account with optional date filtering
    """
    # Check if the account exists
    account = db.query(AccountModel).filter(AccountModel.name == account_name).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    query = db.query(ValueModel).filter(ValueModel.account_name == account_name)

    if start_date:
        query = query.filter(ValueModel.date >= start_date)

    if end_date:
        query = query.filter(ValueModel.date <= end_date)

    values = query.order_by(ValueModel.date.desc()).all()
    return values
