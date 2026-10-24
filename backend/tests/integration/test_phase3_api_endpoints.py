"""Integration test suite for Phase 3 API endpoints.

Tests:
- GET /api/accounts/{account_id}/risk
- GET /api/recovery/candidates
- POST /api/syndicates/cross-victim
- Verification of trace API backwards compatibility: GET /api/investigations/trace/{account_id}
"""

from pathlib import Path

import duckdb
import pytest
from fastapi.testclient import TestClient

from app.database import duckdb as db_module
from app.database.schema import apply_schema
from app.main import app
from app.services.ingestion import IngestionService


@pytest.fixture
def api_test_db(tmp_path: Path):
    """Setup in-memory DuckDB for API tests with Phase 3 test data."""
    conn = duckdb.connect(":memory:")
    apply_schema(conn)

    # Monkey-patch get_connection to return this test connection
    db_module._connection = conn

    # Ingest test dataset
    csv_file = tmp_path / "api_test_scenario.csv"
    rows = [
        "TX_VIC_1,2026-03-01 10:00:00,ACC_VIC_001,Victim1,SBIN0001001,ACC_MULE_01,Mule1,HDFC0002001,15000.00,UPI,SUCCESS,TASK_EARNING,185.220.101.5,Linux_Script",
        "TX_VIC_2,2026-03-01 10:05:00,ACC_VIC_002,Victim2,ICIC0003001,ACC_MULE_01,Mule1,HDFC0002001,25000.00,IMPS,SUCCESS,TASK_EARNING,185.220.101.5,Linux_Script",
        "TX_OUT_1,2026-03-01 10:20:00,ACC_MULE_01,Mule1,HDFC0002001,ACC_HOP2_01,Hop2A,PUNB0004001,10000.00,UPI,SUCCESS,,185.220.101.5,Linux_Script",
        "TX_OUT_2,2026-03-01 10:25:00,ACC_MULE_01,Mule1,HDFC0002001,ACC_HOP2_02,Hop2B,BARB0005001,12000.00,UPI,SUCCESS,,185.220.101.5,Linux_Script",
    ]
    header = "Transaction_ID,Timestamp,Sender_Account,Sender_Name,Sender_IFSC,Receiver_Account,Receiver_Name,Receiver_IFSC,Amount,Payment_Mode,Status,Narration,IP_Address,Device_Type\n"
    csv_file.write_text(header + "\n".join(rows) + "\n", encoding="utf-8")

    ingest_svc = IngestionService(conn)
    ingest_svc.ingest_file(csv_file, dataset_id="ds_api_test")

    yield conn

    db_module._connection = None
    conn.close()


def test_get_account_risk_api(api_test_db):
    """Verify GET /api/accounts/{account_id}/risk returns valid risk profile adhering to contract."""
    client = TestClient(app)
    response = client.get("/api/accounts/ACC_MULE_01/risk?dataset_id=ds_api_test")
    assert response.status_code == 200
    data = response.json()

    assert data["account_id"] == "ACC_MULE_01"
    assert data["dataset_id"] == "ds_api_test"
    assert "mule_risk_index" in data
    assert "risk_tier" in data
    assert "rule_version" in data
    assert "candidate_terminology_disclaimer" in data
    assert len(data["features"]) == 8

    # Verify feature contract keys
    for f in data["features"]:
        assert "feature_name" in f
        assert "measured_value" in f
        assert "threshold_configured" in f
        assert "supporting_record_ids" in f
        assert "supporting_transaction_ids" in f
        assert "data_quality_confidence" in f
        assert "score_contribution" in f
        assert "explanation" in f


def test_recovery_candidates_api(api_test_db):
    """Verify GET /api/recovery/candidates returns ranked candidates and disclaimer."""
    client = TestClient(app)
    response = client.get("/api/recovery/candidates?dataset_id=ds_api_test&min_net_flow=100")
    assert response.status_code == 200
    data = response.json()

    assert data["dataset_id"] == "ds_api_test"
    assert data["total_candidates"] >= 1
    assert "candidates" in data

    candidate = data["candidates"][0]
    assert "observed_net_flow" in candidate
    assert "retention_percentage" in candidate
    assert "recovery_priority_score" in candidate
    assert "disclaimer" in candidate
    assert "Observed Net Flow is strictly limited to the selected dataset" in candidate["disclaimer"]


def test_cross_victim_api(api_test_db):
    """Verify POST /api/syndicates/cross-victim links multiple victims to shared candidate."""
    client = TestClient(app)
    payload = {
        "victim_accounts": ["ACC_VIC_001", "ACC_VIC_002"],
        "dataset_id": "ds_api_test",
        "max_hops": 4,
    }
    response = client.post("/api/syndicates/cross-victim", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["dataset_id"] == "ds_api_test"
    assert data["analyzed_victims"] == ["ACC_VIC_001", "ACC_VIC_002"]
    assert len(data["shared_infrastructure_candidates"]) >= 1

    cand = data["shared_infrastructure_candidates"][0]
    assert cand["candidate_account_id"] == "ACC_MULE_01"
    assert cand["victim_count"] == 2
    assert len(cand["connecting_transactions"]) >= 2
    assert "candidate_linkage_disclaimer" in data


def test_trace_api_backwards_compatibility(api_test_db):
    """Verify existing GET /api/investigations/trace/{account_id} remains fully operational."""
    client = TestClient(app)
    response = client.get("/api/investigations/trace/ACC_VIC_001?dataset_id=ds_api_test")
    assert response.status_code == 200
    data = response.json()

    assert data["victim_account"] == "ACC_VIC_001"
    assert data["dataset_id"] == "ds_api_test"
    assert len(data["money_trail"]) >= 1
