from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models.account import Account as AccountModel
from app.schemas.account import Account, AccountCreate

router = APIRouter()


@router.post("/", response_model=Account)
def create_account(account: AccountCreate, db: Session = Depends(get_db)):
    """
    Create a new account
    """
    db_account = AccountModel(**account.model_dump())
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account


@router.get("/", response_model=List[Account])
def list_accounts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    List all accounts with pagination
    """
    accounts = db.query(AccountModel).offset(skip).limit(limit).all()
    return accounts


@router.get("/{account_id}", response_model=Account)
def get_account(account_id: str, db: Session = Depends(get_db)):
    """
    Get a specific account by ID
    """
    db_account = db.query(AccountModel).filter(AccountModel.id == account_id).first()
    if db_account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return db_account


@router.delete("/{account_id}", response_model=dict)
def delete_account(account_id: str, db: Session = Depends(get_db)):
    """
    Delete an account by ID
    """
    db_account = db.query(AccountModel).filter(AccountModel.id == account_id).first()
    if db_account is None:
        raise HTTPException(status_code=404, detail="Account not found")

    db.delete(db_account)
    db.commit()
    return {"message": "Account deleted successfully"}
