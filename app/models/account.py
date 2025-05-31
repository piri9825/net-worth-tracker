from sqlalchemy import Column, String, Text, JSON
import uuid
from app.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(
        String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4())
    )
    name = Column(String(100), nullable=False, index=True, unique=True)
    description = Column(Text, nullable=True)
    tags = Column(JSON, default=list)

    def __repr__(self):
        return f"<Account {self.name}>"
