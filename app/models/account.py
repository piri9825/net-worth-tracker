from sqlalchemy import Column, String, Text, Enum as SQLEnum
import uuid
from sqlalchemy.orm import relationship
from app.database import Base
from app.enums import Term, AccountType, Portfolio, AssetClass


class Account(Base):
    __tablename__ = "accounts"

    id = Column(
        String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4())
    )
    name = Column(String(100), nullable=False, index=True, unique=True)
    description = Column(Text, nullable=True)
    term = Column(SQLEnum(Term), nullable=True)
    type = Column(SQLEnum(AccountType), nullable=True)
    portfolio = Column(SQLEnum(Portfolio), nullable=True)
    asset_class = Column(SQLEnum(AssetClass), nullable=True)

    # Relationship to values
    values = relationship(
        "Value", back_populates="account", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Account {self.name}>"
