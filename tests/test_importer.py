from datetime import datetime

import pytest

from app.enums import AccountType, AssetClass, Portfolio, Term
from app.models.account import Account
from app.models.value import Value
from app.services.importer import (
    ExcelParseError,
    import_accounts,
    parse_workbook,
)
from tests.conftest import make_workbook

MAY = datetime(2026, 5, 1)
JUNE = datetime(2026, 6, 1)


class TestParseWorkbook:
    def test_parses_accounts_and_values(self):
        wb = make_workbook(
            [
                ["Savings", "Short Term", "Asset", "Liquid", "Cash", "ISA", 100, 150],
                ["Loan", "Long Term", "Liability", None, None, "Mortgage", -500, -490],
            ]
        )
        parsed = parse_workbook(wb)

        assert set(parsed) == {"ISA", "Mortgage"}
        isa = parsed["ISA"]
        assert isa.term == Term.SHORT_TERM
        assert isa.type == AccountType.ASSET
        assert isa.portfolio == Portfolio.LIQUID
        assert isa.asset_class == AssetClass.CASH
        assert isa.description == "Savings"
        assert isa.values_by_date == {MAY: 100.0, JUNE: 150.0}
        assert parsed["Mortgage"].portfolio is None
        assert parsed["Mortgage"].values_by_date[JUNE] == -490.0

    def test_sums_duplicate_account_rows(self):
        wb = make_workbook(
            [
                ["Pot A", "Short Term", "Asset", "Liquid", "Cash", "Bank", 100, 200],
                ["Pot B", "Short Term", "Asset", "Liquid", "Cash", "Bank", 25, 50],
            ]
        )
        parsed = parse_workbook(wb)
        assert parsed["Bank"].values_by_date == {MAY: 125.0, JUNE: 250.0}

    def test_stops_at_summary_rows(self):
        wb = make_workbook(
            [
                ["Savings", "Short Term", "Asset", "Liquid", "Cash", "ISA", 100, 150],
                [None, None, None, None, None, "Total", 100, 150],
                ["After", "Short Term", "Asset", "Liquid", "Cash", "Ghost", 1, 2],
            ]
        )
        parsed = parse_workbook(wb)
        assert set(parsed) == {"ISA"}

    def test_skips_rows_without_account_name(self):
        wb = make_workbook(
            [
                ["Header row", None, None, None, None, None, None, None],
                ["Savings", "Short Term", "Asset", "Liquid", "Cash", "ISA", 100, 150],
            ]
        )
        parsed = parse_workbook(wb)
        assert set(parsed) == {"ISA"}

    def test_skips_blank_values_and_treats_none_string_as_null(self):
        wb = make_workbook(
            [["Savings", "none", "Asset", "None", "Cash", "ISA", None, 150]]
        )
        parsed = parse_workbook(wb)
        isa = parsed["ISA"]
        assert isa.term is None
        assert isa.portfolio is None
        assert isa.values_by_date == {JUNE: 150.0}

    def test_rejects_invalid_enum_value(self):
        wb = make_workbook(
            [["Savings", "Medium Term", "Asset", "Liquid", "Cash", "ISA", 100, 150]]
        )
        with pytest.raises(ExcelParseError, match="invalid Term 'Medium Term'"):
            parse_workbook(wb)

    def test_rejects_inconsistent_duplicate_attributes(self):
        wb = make_workbook(
            [
                ["Pot A", "Short Term", "Asset", "Liquid", "Cash", "Bank", 100, 200],
                ["Pot B", "Long Term", "Asset", "Liquid", "Cash", "Bank", 25, 50],
            ]
        )
        with pytest.raises(ExcelParseError, match="inconsistent attributes"):
            parse_workbook(wb)

    def test_rejects_workbook_without_account_rows(self):
        wb = make_workbook([[None, None, None, None, None, "Total", 1, 2]])
        with pytest.raises(ExcelParseError, match="No account rows"):
            parse_workbook(wb)

    def test_rejects_missing_sheet(self):
        import pandas as pd
        from io import BytesIO

        buffer = BytesIO()
        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            pd.DataFrame({"a": [1]}).to_excel(writer, sheet_name="Wrong", index=False)
        buffer.seek(0)
        with pytest.raises(ExcelParseError, match="Net Worth"):
            parse_workbook(buffer)


class TestImportAccounts:
    def _parsed(self, amount=100):
        wb = make_workbook(
            [["Savings", "Short Term", "Asset", "Liquid", "Cash", "ISA", amount, 150]]
        )
        return parse_workbook(wb)

    def test_loads_accounts_and_values(self, db_session):
        summary = import_accounts(db_session, self._parsed())

        assert summary.accounts_loaded == 1
        assert summary.values_loaded == 2
        account = db_session.query(Account).one()
        assert account.name == "ISA"
        assert account.term == Term.SHORT_TERM
        amounts = {v.date: v.amount for v in db_session.query(Value).all()}
        assert amounts == {MAY: 100.0, JUNE: 150.0}

    def test_reimport_replaces_existing_data(self, db_session):
        import_accounts(db_session, self._parsed(amount=100))
        import_accounts(db_session, self._parsed(amount=999))

        assert db_session.query(Account).count() == 1
        may_value = db_session.query(Value).filter(Value.date == MAY).one()
        assert may_value.amount == 999.0

    def test_failed_import_keeps_existing_data(self, db_session):
        import_accounts(db_session, self._parsed())

        bad = self._parsed()
        bad["ISA"].values_by_date[JUNE] = None  # violates NOT NULL on amount
        with pytest.raises(Exception):
            import_accounts(db_session, bad)

        assert db_session.query(Account).count() == 1
        assert db_session.query(Value).count() == 2
        assert db_session.query(Value).filter(Value.date == MAY).one().amount == 100.0
