"""
Parse the Net Worth Tracker workbook and load it into the database.

Sheet layout ("Net Worth" sheet, first row as header):
  col 0: Description (NaN marks the start of summary rows - stop there)
  col 1: Term, col 2: Type, col 3: Portfolio, col 4: Asset Class
  col 5: Account (name, required)
  col 6+: date columns with amounts

Rows sharing an account name have their per-date amounts summed; duplicate
rows with inconsistent classification attributes are an error.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from io import BytesIO
from pathlib import Path

import pandas as pd
from sqlalchemy.orm import Session

from app.enums import AccountType, AssetClass, Portfolio, Term
from app.models.account import Account
from app.models.value import Value

SHEET_NAME = "Net Worth"


class ExcelParseError(Exception):
    """The workbook could not be parsed into accounts and values."""


@dataclass
class ParsedAccount:
    name: str
    description: str | None
    term: Term | None
    type: AccountType | None
    portfolio: Portfolio | None
    asset_class: AssetClass | None
    values_by_date: dict[datetime, float] = field(default_factory=dict)


@dataclass
class ImportSummary:
    accounts_loaded: int
    values_loaded: int


def _parse_cell(cell_value) -> str | None:
    """Normalise a cell: NaN, empty and "None" become None."""
    if pd.isna(cell_value):
        return None
    value_str = str(cell_value).strip()
    if not value_str or value_str.lower() == "none":
        return None
    return value_str


def _parse_enum(enum_cls: type[Enum], cell_value, column: str, row_num: int):
    value = _parse_cell(cell_value)
    if value is None:
        return None
    try:
        return enum_cls(value)
    except ValueError:
        allowed = ", ".join(e.value for e in enum_cls)
        raise ExcelParseError(
            f"Row {row_num}: invalid {column} '{value}' (allowed: {allowed})"
        ) from None


def parse_workbook(source: str | Path | BytesIO) -> dict[str, ParsedAccount]:
    """
    Parse the workbook into a map of account name -> ParsedAccount.
    Raises ExcelParseError on any structural or value problem.
    """
    try:
        df = pd.read_excel(source, sheet_name=SHEET_NAME, header=0)
    except ExcelParseError:
        raise
    except Exception as e:
        raise ExcelParseError(f"Could not read sheet '{SHEET_NAME}': {e}") from e

    if len(df.columns) < 7:
        raise ExcelParseError(
            f"Sheet '{SHEET_NAME}' has {len(df.columns)} columns; expected the "
            "6 attribute columns plus at least one date column"
        )

    date_columns = [col for col in df.columns[6:] if not pd.isna(col)]

    accounts: dict[str, ParsedAccount] = {}

    for idx, row in df.iterrows():
        row_num = idx + 2  # +2 because header is row 1

        # Summary rows (no Description) mark the end of account data
        if pd.isna(row[df.columns[0]]):
            break

        account_name = row[df.columns[5]]
        if pd.isna(account_name):
            continue
        account_name = str(account_name).strip()

        parsed = ParsedAccount(
            name=account_name,
            description=_parse_cell(row[df.columns[0]]),
            term=_parse_enum(Term, row[df.columns[1]], "Term", row_num),
            type=_parse_enum(AccountType, row[df.columns[2]], "Type", row_num),
            portfolio=_parse_enum(Portfolio, row[df.columns[3]], "Portfolio", row_num),
            asset_class=_parse_enum(
                AssetClass, row[df.columns[4]], "Asset Class", row_num
            ),
        )

        existing = accounts.setdefault(account_name, parsed)
        if existing is not parsed and (
            existing.term != parsed.term
            or existing.type != parsed.type
            or existing.portfolio != parsed.portfolio
            or existing.asset_class != parsed.asset_class
        ):
            raise ExcelParseError(
                f"Account '{account_name}' has inconsistent attributes across rows "
                f"(row {row_num} differs from an earlier row)"
            )

        for date_col in date_columns:
            value = row[date_col]
            if pd.isna(value):
                continue
            try:
                amount = float(value)
            except (ValueError, TypeError):
                continue

            if isinstance(date_col, (pd.Timestamp, datetime)):
                date = pd.Timestamp(date_col).to_pydatetime()
            else:
                try:
                    date = pd.to_datetime(date_col).to_pydatetime()
                except (ValueError, TypeError):
                    continue
            date = date.replace(hour=0, minute=0, second=0, microsecond=0)

            existing.values_by_date[date] = (
                existing.values_by_date.get(date, 0.0) + amount
            )

    if not accounts:
        raise ExcelParseError(f"No account rows found in sheet '{SHEET_NAME}'")

    return accounts


def import_accounts(db: Session, parsed: dict[str, ParsedAccount]) -> ImportSummary:
    """
    Replace all accounts and values with the parsed data, in one transaction.
    On failure the transaction is rolled back and the existing data is kept.
    """
    try:
        # Bulk deletes bypass ORM cascade, so delete values explicitly first
        db.query(Value).delete()
        db.query(Account).delete()

        values_loaded = 0
        for account in parsed.values():
            db.add(
                Account(
                    name=account.name,
                    description=account.description,
                    term=account.term,
                    type=account.type,
                    portfolio=account.portfolio,
                    asset_class=account.asset_class,
                )
            )
            for date, amount in account.values_by_date.items():
                db.add(Value(account_name=account.name, amount=amount, date=date))
                values_loaded += 1

        db.commit()
    except Exception:
        db.rollback()
        raise

    return ImportSummary(accounts_loaded=len(parsed), values_loaded=values_loaded)
