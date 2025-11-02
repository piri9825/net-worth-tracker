from enum import Enum


class Term(str, Enum):
    SHORT_TERM = "Short Term"
    LONG_TERM = "Long Term"


class AccountType(str, Enum):
    ASSET = "Asset"
    LIABILITY = "Liability"


class Portfolio(str, Enum):
    LIQUID = "Liquid"
    ILLIQUID = "Illiquid"
    CASH_RESERVES = "Cash Reserves"


class AssetClass(str, Enum):
    CASH = "Cash"
    EQUITIES = "Equities"
    CRYPTO = "Crypto"
    REAL_ESTATE = "Real Estate"
