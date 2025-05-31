from typing import List, Optional
from pydantic import BaseModel, Field
import uuid


class AccountBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    tags: List[str] = []


class AccountCreate(AccountBase):
    pass


class Account(AccountBase):
    class Config:
        from_attributes = True
