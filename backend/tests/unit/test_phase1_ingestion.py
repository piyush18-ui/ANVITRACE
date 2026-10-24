"""Deterministic test suite for Phase 1: Foundation, Ingestion, Storage & Indexing.

Verifies:
1. basic ingestion
2. schema validation
3. repeated Transaction_ID with different source rows
4. exact duplicate row detection
5. account validation
6. IFSC validation
7. missing timestamp
8. invalid amount
9. invalid payment mode
10. record_id uniqueness
11. source_row preservation
12. dataset hash generation
13. ingestion metadata persistence
14. reloading/accessing indexed transactions
15. dataset isolation using dataset_id
"""

from pathlib import Path

import duckdb
import pytest
from fastapi.testclient import TestClient

from app.config.constants import STATUS_INVALID, STATUS_VALID
from app.database.schema import apply_schema
from app.indexes.manager import ForensicIndexManager
from app.main import app
from app.services.ingestion import IngestionService, compute_file_sha256
from app.utils.validators import (
    validate_account_id,
    validate_amount,
    validate_ifsc,
    validate_payment_mode,
    validate_timestamp,
)


@pytest.fixture
def in_memory_db():
    """Create an isolated in-memory DuckDB connection for each test."""
    conn = duckdb.connect(":memory:")
    apply_schema(conn)
    yield conn
    conn.close()


@pytest.fixture
def sample_csv(tmp_path: Path):
    """Generate a controlled forensic CSV test file covering valid & invalid scenarios."""
    csv_path = tmp_path / "forensic_test.csv"
    data = [
        # Row 1: Perfectly valid
        "TX1001,2026-03-01 10:00:00,ACC123456789,Alice,SBIN0001234,ACC987654321,Bob,HDFC0005678,15000.00,UPI,SUCCESS",
        # Row 2: Valid with same Transaction_ID (repeated TX, but different accounts/amounts)
        "TX1001,2026-03-01 10:05:00,ACC123456789,Alice,SBIN0001234,ACC555555555,Charlie,ICIC0009999,5000.00,IMPS,SUCCESS",
        # Row 3: Exact duplicate of Row 1
        "TX1001,2026-03-01 10:00:00,ACC123456789,Alice,SBIN0001234,ACC987654321,Bob,HDFC0005678,15000.00,UPI,SUCCESS",
        # Row 4: Invalid account length (< 12 chars)
        "TX1002,2026-03-01 10:10:00,SHORTACC,Alice,SBIN0001234,ACC987654321,Bob,HDFC0005678,1000.00,NEFT,SUCCESS",
        # Row 5: Invalid IFSC structure
        "TX1003,2026-03-01 10:15:00,ACC123456789,Alice,INVALID_IFSC,ACC987654321,Bob,HDFC0005678,2500.00,RTGS,SUCCESS",
        # Row 6: Invalid negative amount
        "TX1004,2026-03-01 10:20:00,ACC123456789,Alice,SBIN0001234,ACC987654321,Bob,HDFC0005678,-500.00,UPI,SUCCESS",
        # Row 7: Missing / invalid timestamp
        "TX1005,,ACC123456789,Alice,SBIN0001234,ACC987654321,Bob,HDFC0005678,4000.00,UPI,SUCCESS",
        # Row 8: Invalid payment mode
        "TX1006,2026-03-01 10:30:00,ACC123456789,Alice,SBIN0001234,ACC987654321,Bob,HDFC0005678,3000.00,BITCOIN,SUCCESS",
    ]
    header = "Transaction_ID,Timestamp,Sender_Account,Sender_Name,Sender_IFSC,Receiver_Account,Receiver_Name,Receiver_IFSC,Amount,Payment_Mode,Status\n"
    content = header + "\n".join(data) + "\n"
    csv_path.write_text(content, encoding="utf-8")
    return csv_path


# 1. Validation tests
def test_account_validation():
    ok, _ = validate_account_id("1234567890AB")
    assert ok is True
    ok, _ = validate_account_id("SHORT")
    assert ok is False
    ok, _ = validate_account_id("123456789012345")  # Too long
    assert ok is False


def test_ifsc_validation():
    ok, clean = validate_ifsc("sbin0001234")
    assert ok is True
    assert clean == "SBIN0001234"
    ok, _ = validate_ifsc("SBIN9991234")  # 5th char must be 0
    assert ok is False
    ok, _ = validate_ifsc("SHORT")
    assert ok is False


def test_amount_validation():
    ok, val, _ = validate_amount("1500.50")
    assert ok is True
    assert val == 1500.50
    ok, _, _ = validate_amount("-100.00")
    assert ok is False
    ok, _, _ = validate_amount("abc")
    assert ok is False


def test_timestamp_validation():
    ok, _ = validate_timestamp("2026-03-01 10:00:00")
    assert ok is True
    ok, _ = validate_timestamp("invalid-date")
    assert ok is False
    ok, _ = validate_timestamp(None)
    assert ok is False


def test_payment_mode_validation():
    for mode in ["UPI", "IMPS", "NEFT", "RTGS", "upi"]:
        ok, _clean = validate_payment_mode(mode)
        assert ok is True
    ok, _ = validate_payment_mode("BITCOIN")
    assert ok is False


# 2. Ingestion pipeline & forensic rules
def test_full_ingestion_and_rules(in_memory_db, sample_csv, tmp_path: Path):
    service = IngestionService(in_memory_db)
    result = service.ingest_file(sample_csv, dataset_id="ds_test_01")

    # Ingestion metrics
    assert result["total_rows"] == 8
    assert result["valid_rows"] == 3  # rows 1, 2, 3
    assert result["invalid_rows"] == 5  # rows 4, 5, 6, 7, 8

    # Repeated TX and Exact duplicate checks
    assert result["repeated_tx_ids"] == 2  # rows 2 and 3 repeated TX1001
    assert result["exact_duplicates"] == 1  # row 3 is exact duplicate of row 1

    # Check database records including raw preserved columns
    records = in_memory_db.execute(
        """SELECT record_id, Transaction_ID, source_row, validation_status,
                  is_repeated_tx, is_exact_duplicate, raw_timestamp, raw_amount, raw_payment_mode
           FROM transactions WHERE dataset_id = 'ds_test_01' ORDER BY source_row ASC"""
    ).fetchall()

    assert len(records) == 8

    # Verify record_id uniqueness
    record_ids = [r[0] for r in records]
    assert len(record_ids) == len(set(record_ids))

    # Verify source_row is strictly 1..8
    source_rows = [r[2] for r in records]
    assert source_rows == list(range(1, 9))

    # Row 1 check: valid, not repeated, not exact dup, raw values preserved
    r1 = records[0]
    assert r1[1] == "TX1001"
    assert r1[3] == STATUS_VALID
    assert r1[4] is False
    assert r1[5] is False
    assert r1[6] == "2026-03-01 10:00:00"
    assert r1[7] == "15000.00"
    assert r1[8] == "UPI"

    # Row 2 check: valid, repeated TX, not exact dup (different receiver & amount)
    r2 = records[1]
    assert r2[1] == "TX1001"
    assert r2[3] == STATUS_VALID
    assert r2[4] is True
    assert r2[5] is False

    # Row 3 check: valid, repeated TX, exact dup of Row 1
    r3 = records[2]
    assert r3[1] == "TX1001"
    assert r3[3] == STATUS_VALID
    assert r3[4] is True
    assert r3[5] is True

    # Row 4 check: invalid account length
    r4 = records[3]
    assert r4[3] == STATUS_INVALID

    # Test account and IFSC prefix consistency
    from app.utils.validators import validate_account_ifsc_consistency
    ok_cons, _ = validate_account_ifsc_consistency("SBIN12345678", "SBIN0001234")
    assert ok_cons is True
    ok_incons, err_incons = validate_account_ifsc_consistency("HDFC12345678", "SBIN0001234")
    assert ok_incons is False
    assert "conflicts" in err_incons


def test_dataset_hash_deterministic(sample_csv):
    h1 = compute_file_sha256(sample_csv)
    h2 = compute_file_sha256(sample_csv)
    assert h1 == h2
    assert len(h1) == 64


def test_dataset_isolation(in_memory_db, sample_csv):
    """Test that two separate datasets in the same DuckDB remain strictly isolated."""
    service = IngestionService(in_memory_db)
    service.ingest_file(sample_csv, dataset_id="ds_alpha")
    service.ingest_file(sample_csv, dataset_id="ds_beta")

    cnt_alpha = in_memory_db.execute("SELECT COUNT(*) FROM transactions WHERE dataset_id = 'ds_alpha'").fetchone()[0]
    cnt_beta = in_memory_db.execute("SELECT COUNT(*) FROM transactions WHERE dataset_id = 'ds_beta'").fetchone()[0]

    assert cnt_alpha == 8
    assert cnt_beta == 8

    # Account features isolation
    acc_alpha = in_memory_db.execute("SELECT COUNT(*) FROM account_features WHERE dataset_id = 'ds_alpha'").fetchone()[
        0
    ]
    acc_beta = in_memory_db.execute("SELECT COUNT(*) FROM account_features WHERE dataset_id = 'ds_beta'").fetchone()[0]
    assert acc_alpha == acc_beta


def test_index_manager_reloading(in_memory_db, sample_csv, tmp_path: Path):
    """Test building and accessing indexed outgoing/incoming/timeline parquet files."""
    service = IngestionService(in_memory_db)
    service.ingest_file(sample_csv, dataset_id="ds_idx_test")

    idx = ForensicIndexManager("ds_idx_test")
    outgoing = idx.get_outgoing_edges("ACC123456789")
    assert len(outgoing) > 0
    assert "counterparty_account" in outgoing.columns

    incoming = idx.get_incoming_edges("ACC987654321")
    assert len(incoming) > 0

    timeline = idx.get_account_timeline("ACC123456789")
    assert len(timeline) > 0


# 3. API endpoints
def test_api_endpoints(sample_csv):
    client = TestClient(app)

    # Health check
    res_health = client.get("/api/health")
    assert res_health.status_code == 200
    assert res_health.json()["offline"] is True

    # Upload CSV
    with open(sample_csv, "rb") as f:
        res_upload = client.post("/api/dataset/upload", files={"file": ("test_transactions.csv", f, "text/csv")})
    assert res_upload.status_code == 202
    data = res_upload.json()
    assert "dataset_id" in data
    ds_id = data["dataset_id"]

    # Status check
    res_status = client.get(f"/api/dataset/status?dataset_id={ds_id}")
    assert res_status.status_code == 200
    st = res_status.json()
    assert st["status"] == "COMPLETED"
    assert st["total_rows"] == 8

    # Statistics check
    res_stats = client.get(f"/api/dataset/statistics?dataset_id={ds_id}")
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert stats["total_rows"] == 8
    assert stats["valid_rows"] == 3
    assert stats["repeated_tx_ids"] == 2
    assert stats["exact_duplicates"] == 1
    assert "UPI" in stats["payment_mode_distribution"]
