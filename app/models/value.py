from sqlalchemy import Column, String, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
import uuid
from app.database import Base


class Value(Base):
    __tablename__ = "values"

    id = Column(
        String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4())
    )
    account_name = Column(
        String(100), ForeignKey("accounts.name"), nullable=False, index=True
    )
    amount = Column(Float, nullable=False)
    date = Column(DateTime, nullable=False, default=func.now(), index=True)

    # Relationship to account
    account = relationship("Account", back_populates="values")

    def __repr__(self):
        return f"<Value {self.account_name}: {self.amount} on {self.date}>"
