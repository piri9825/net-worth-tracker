from sqlalchemy import Column, DateTime, Integer, String

from app.database import Base


class SyncState(Base):
    """Single-row record of the last successful Drive sync."""

    __tablename__ = "sync_state"

    id = Column(Integer, primary_key=True, default=1)
    file_name = Column(String(255), nullable=False)
    drive_modified_time = Column(String(64), nullable=False)
    synced_at = Column(DateTime, nullable=False)
