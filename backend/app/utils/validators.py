"""Validation helpers for financial forensics fields."""

import re
from datetime import datetime
from typing import Any

from app.config.constants import (
    ACCOUNT_ID_LENGTH,
    IFSC_LENGTH,
    VALID_PAYMENT_MODES,
)

# Regex for Indian Financial System Code (IFSC): 4 letters, 0, 6 alphanumeric
IFSC_REGEX = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")

# Account ID regex: strictly alphanumeric, length 12
ACCOUNT_REGEX = re.compile(r"^[A-Za-z0-9]{12}$")


def validate_account_id(account: str | None) -> tuple[bool, str]:
    """Validate 12-character alphanumeric account identifier."""
    if not account or not isinstance(account, str):
        return False, "Account ID is missing or not a string"
    clean = account.strip()
    if len(clean) != ACCOUNT_ID_LENGTH:
        return False, f"Account ID length is {len(clean)}, expected {ACCOUNT_ID_LENGTH}"
    if not ACCOUNT_REGEX.match(clean):
        return False, "Account ID must be alphanumeric"
    return True, clean


def validate_ifsc(ifsc: str | None) -> tuple[bool, str]:
    """Validate 11-character IFSC format."""
    if not ifsc or not isinstance(ifsc, str):
        return False, "IFSC is missing or not a string"
    clean = ifsc.strip().upper()
    if len(clean) != IFSC_LENGTH:
        return False, f"IFSC length is {len(clean)}, expected {IFSC_LENGTH}"
    if not IFSC_REGEX.match(clean):
        return False, f"IFSC '{clean}' does not match standard pattern (4 letters, '0', 6 alphanumeric)"
    return True, clean


def validate_account_ifsc_consistency(account: str | None, ifsc: str | None) -> tuple[bool, str]:
    """Verify account and IFSC consistency where supported.

    When both account and IFSC are provided, verifies that bank prefixes or
    routing codes do not conflict. For standard Indian banking accounts with
    bank prefix identifiers, cross-checks compatibility.
    """
    if not account or not ifsc:
        return True, ""  # Handled by individual validators
    clean_acc = account.strip().upper()
    clean_ifsc = ifsc.strip().upper()

    # If account starts with letters, ensure they match bank code prefix if both alphabetic
    acc_prefix = clean_acc[:4]
    ifsc_prefix = clean_ifsc[:4]
    if acc_prefix.isalpha() and ifsc_prefix.isalpha() and acc_prefix != ifsc_prefix:
        return False, f"Account prefix '{acc_prefix}' conflicts with IFSC bank prefix '{ifsc_prefix}'"

    return True, ""


def validate_amount(amount: Any) -> tuple[bool, float, str]:
    """Validate exact monetary value. Returns (is_valid, float_val, error_msg)."""
    if amount is None:
        return False, 0.0, "Amount is null"
    try:
        val = float(amount)
        if val <= 0:
            return False, val, "Amount must be strictly positive (> 0)"
        return True, round(val, 2), ""
    except (ValueError, TypeError):
        return False, 0.0, f"Amount '{amount}' cannot be parsed to numeric"


def validate_timestamp(ts: Any) -> tuple[bool, str]:
    """Validate timestamp string or datetime object."""
    if ts is None:
        return False, "Timestamp is null"
    if isinstance(ts, datetime):
        return True, ts.isoformat()
    if isinstance(ts, str):
        cleaned = ts.strip()
        if not cleaned:
            return False, "Timestamp is empty"
        # Standard formats
        for fmt in (
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d %H:%M:%S.%f",
            "%Y-%m-%dT%H:%M:%S.%f",
            "%d-%m-%Y %H:%M:%S",
            "%Y/%m/%d %H:%M:%S",
        ):
            try:
                dt = datetime.strptime(cleaned, fmt)
                return True, dt.isoformat()
            except ValueError:
                continue
        return False, f"Unrecognized timestamp format: {cleaned}"
    return False, f"Invalid timestamp type: {type(ts)}"


def validate_payment_mode(mode: str | None) -> tuple[bool, str]:
    """Validate payment mode against known modes (UPI, IMPS, NEFT, RTGS)."""
    if not mode or not isinstance(mode, str):
        return False, "Payment mode is missing"
    clean = mode.strip().upper()
    if clean not in VALID_PAYMENT_MODES:
        return False, f"Invalid payment mode '{clean}'. Expected one of {sorted(VALID_PAYMENT_MODES)}"
    return True, clean
