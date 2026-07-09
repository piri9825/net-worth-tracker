from datetime import datetime
from io import BytesIO

import pandas as pd
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base

HEADER = ["Description", "Term", "Type", "Portfolio", "Asset Class", "Account"]
DATES = [datetime(2026, 5, 1), datetime(2026, 6, 1)]


def make_workbook(rows: list[list], dates: list[datetime] = DATES) -> BytesIO:
    """Build an in-memory xlsx with the expected 'Net Worth' sheet layout."""
    df = pd.DataFrame(rows, columns=HEADER + dates)
    buffer = BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Net Worth", index=False)
    buffer.seek(0)
    return buffer


@pytest.fixture
def db_session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()
