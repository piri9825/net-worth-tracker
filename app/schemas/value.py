from pydantic import BaseModel, Field
from datetime import datetime


class ValueBase(BaseModel):
    account_name: str = Field(..., max_length=100)
    amount: float
    date: datetime = Field(...)  # ... means required with no default


class ValueCreate(ValueBase):
    pass


class Value(ValueBase):
    id: str

    class Config:
        from_attributes = True
