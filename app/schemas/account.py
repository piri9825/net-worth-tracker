from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.enums import Term, AccountType, Portfolio, AssetClass


class AccountBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    term: Optional[Term] = None
    type: Optional[AccountType] = None
    portfolio: Optional[Portfolio] = None
    asset_class: Optional[AssetClass] = None


class AccountCreate(AccountBase):
    pass


class Account(AccountBase):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)
