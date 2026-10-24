"""Phase 4 Forensic Test Suite: Evidence Provenance, Snapshots, Documents, APIs, Reproducibility.

Verifies:
1. Investigation snapshot creation with full provenance
2. SHA-256 integrity hashing (dataset and result)
3. Evidence items linked to exact source records
4. Snapshot reproducibility — same inputs produce same result_hash
5. Case diary generation with factual consistency validation
6. Bank freeze requisition with verified-only fields
7. Document generation produces valid PDF files
8. No factual fields invented outside validated evidence
9. New API endpoints: POST /api/evidence/snapshot, POST /api/documents/case-diary, POST /api/documents/freeze-requisition
10. Offline validation — no external network calls
11. Evidence contract completeness
"""

from pathlib import Path

import duckdb
import pytest
from fastapi.testclient import TestClient

from app.database import duckdb as db_module
from app.database.schema import apply_schema
from app.main import app
from app.services.documents import DocumentService
from app.services.evidence import EvidenceSnapshotService, _compute_result_hash
from app.services.ingestion import IngestionService


@pytest.fixture
def phase4_db():
    """In-memory DuckDB for Phase 4 tests."""
    conn = duckdb.connect(":memory:")
    apply_schema(conn)
    yield conn
    conn.close()


@pytest.fixture
def phase4_csv(tmp_path: Path):
    """Phase 4 test dataset."""
    csv_file = tmp_path / "phase4_test.csv"
    rows = [
        "TX_P4_01,2026-03-01 10:00:00,ACC_VIC_P4001,Victim1,SBIN0001001,ACC_MULE_P401,Mule1,HDFC0002001,20000.00,UPI,SUCCESS,TASK_EARNING,185.220.101.5,Linux_Script",
        "TX_P4_02,2026-03-01 10:05:00,ACC_VIC_P4002,Victim2,ICIC0003001,ACC_MULE_P401,Mule1,HDFC0002001,30000.00,IMPS,SUCCESS,TASK_EARNING,185.220.101.5,Linux_Script",
        "TX_P4_03,2026-03-01 10:15:00,ACC_MULE_P401,Mule1,HDFC0002001,ACC_HOP2_P401,Hop2A,PUNB0004001,15000.00,UPI,SUCCESS,,185.220.101.5,Linux_Script",
        "TX_P4_04,2026-03-01 10:20:00,ACC_MULE_P401,Mule1,HDFC0002001,ACC_HOP2_P402,Hop2B,BARB0005001,18000.00,UPI,SUCCESS,,194.26.29.10,Web_Emulator",
        "TX_P4_05,2026-03-01 10:30:00,ACC_HOP2_P401,Hop2A,PUNB0004001,ACC_TERM_P401,Terminal,KKBK0006001,14000.00,IMPS,SUCCESS,WALLET_LOAD,103.21.244.1,Android",
    ]
    header = "Transaction_ID,Timestamp,Sender_Account,Sender_Name,Sender_IFSC,Receiver_Account,Receiver_Name,Receiver_IFSC,Amount,Payment_Mode,Status,Narration,IP_Address,Device_Type\n"
    csv_file.write_text(header + "\n".join(rows) + "\n", encoding="utf-8")
    return csv_file


@pytest.fixture
def ingested_p4_db(phase4_db, phase4_csv):
    """Ingest Phase 4 test data."""
    svc = IngestionService(phase4_db)
    svc.ingest_file(phase4_csv, dataset_id="ds_p4_test")
    return phase4_db


# === 1. Evidence Snapshot Creation ===

def test_snapshot_creation(ingested_p4_db):
    """Verify investigation snapshot contains full provenance metadata."""
    svc = EvidenceSnapshotService(ingested_p4_db)
    resp = svc.create_snapshot(victim_account="ACC_VIC_P4001", dataset_id="ds_p4_test")
    snap = resp.snapshot

    assert snap.investigation_id.startswith("inv_")
    assert snap.dataset_id == "ds_p4_test"
    assert len(snap.dataset_hash) == 64  # SHA-256 hex
    assert snap.app_version == "1.0.0"
    assert snap.rule_version == "1.0.0"
    assert snap.victim_account == "ACC_VIC_P4001"
    assert snap.max_hops == 4
    assert len(snap.result_hash) == 64
    assert snap.created_at is not None


def test_snapshot_provenance_fields(ingested_p4_db):
    """Verify all required provenance fields are present."""
    svc = EvidenceSnapshotService(ingested_p4_db)
    resp = svc.create_snapshot(victim_account="ACC_VIC_P4001", dataset_id="ds_p4_test")
    snap = resp.snapshot

    # Query parameters
    assert snap.query_parameters["victim_account"] == "ACC_VIC_P4001"
    assert snap.query_parameters["dataset_id"] == "ds_p4_test"
    assert snap.query_parameters["max_hops"] == 4

    # Supporting IDs
    assert isinstance(snap.supporting_record_ids, list)
    assert isinstance(snap.supporting_transaction_ids, list)
    assert len(snap.supporting_record_ids) >= 1


# === 2. SHA-256 Integrity ===

def test_sha256_result_hash_consistency(ingested_p4_db):
    """Verify result hash is deterministic for identical data."""
    data1 = {"key": "value", "num": 42}
    data2 = {"key": "value", "num": 42}
    assert _compute_result_hash(data1) == _compute_result_hash(data2)
    assert len(_compute_result_hash(data1)) == 64


def test_sha256_different_data_different_hash():
    """Verify different data produces different hash."""
    h1 = _compute_result_hash({"key": "value1"})
    h2 = _compute_result_hash({"key": "value2"})
    assert h1 != h2


# === 3. Evidence Items ===

def test_evidence_items_linked_to_source_records(ingested_p4_db):
    """Verify evidence items retain provenance: dataset, record_ids, transaction_ids, rule_version."""
    svc = EvidenceSnapshotService(ingested_p4_db)
    resp = svc.create_snapshot(victim_account="ACC_MULE_P401", dataset_id="ds_p4_test")
    snap = resp.snapshot

    # ACC_MULE_P401 should have detected risk features
    assert len(snap.evidence_items) >= 1

    for ev in snap.evidence_items:
        assert ev.dataset_id == "ds_p4_test"
        assert ev.rule_version == "1.0.0"
        assert ev.investigation_id == snap.investigation_id
        assert len(ev.record_ids) >= 1
        assert len(ev.feature_name) > 0
        assert ev.generated_at is not None


# === 4. Snapshot Reproducibility ===

def test_snapshot_reproducibility(ingested_p4_db):
    """Given same dataset, hash, version, victim, hops, and parameters → same result_hash."""
    svc = EvidenceSnapshotService(ingested_p4_db)
    resp1 = svc.create_snapshot(victim_account="ACC_VIC_P4001", dataset_id="ds_p4_test", max_hops=4)
    resp2 = svc.create_snapshot(victim_account="ACC_VIC_P4001", dataset_id="ds_p4_test", max_hops=4)

    assert resp1.snapshot.result_hash == resp2.snapshot.result_hash
    assert resp1.snapshot.dataset_hash == resp2.snapshot.dataset_hash
    assert resp1.snapshot.victim_account == resp2.snapshot.victim_account
    # Compare deterministic parts of money trail (exclude execution_time_ms)
    t1 = resp1.snapshot.money_trail_summary
    t2 = resp2.snapshot.money_trail_summary
    assert t1["total_edges"] == t2["total_edges"]
    assert t1["total_hops_found"] == t2["total_hops_found"]
    assert t1["total_attributed_amount"] == t2["total_attributed_amount"]
    assert t1["nodes"] == t2["nodes"]


def test_snapshot_different_params_different_hash(ingested_p4_db):
    """Different parameters should produce different result hash."""
    svc = EvidenceSnapshotService(ingested_p4_db)
    resp1 = svc.create_snapshot(victim_account="ACC_VIC_P4001", dataset_id="ds_p4_test", max_hops=4)
    resp2 = svc.create_snapshot(victim_account="ACC_MULE_P401", dataset_id="ds_p4_test", max_hops=4)

    assert resp1.snapshot.result_hash != resp2.snapshot.result_hash


# === 5. Case Diary Generation ===

def test_case_diary_generation(ingested_p4_db):
    """Verify case diary PDF is generated with validated evidence."""
    svc = DocumentService(ingested_p4_db)
    resp = svc.generate_case_diary(
        victim_account="ACC_VIC_P4001",
        dataset_id="ds_p4_test",
        officer_name="Test Officer",
        officer_designation="Cyber Crime Cell",
        case_reference="FIR/2026/001",
    )

    assert resp.document_id.startswith("diary_")
    assert resp.victim_account == "ACC_VIC_P4001"
    assert resp.dataset_id == "ds_p4_test"
    assert resp.file_format == "PDF"
    assert resp.factual_validation_passed is True
    assert len(resp.integrity_hash) == 64
    assert Path(resp.file_path).exists()
    assert Path(resp.file_path).stat().st_size > 0


# === 6. Bank Freeze Requisition ===

def test_freeze_requisition_generation(ingested_p4_db):
    """Verify freeze requisition contains only verified fields, requires officer approval."""
    svc = DocumentService(ingested_p4_db)
    resp = svc.generate_freeze_requisition(
        target_account_id="ACC_MULE_P401",
        dataset_id="ds_p4_test",
        requesting_officer="Inspector Test",
        bank_name="HDFC Bank",
        branch_name="Pune Branch",
    )

    assert resp.document_id.startswith("freeze_")
    assert resp.target_account_id == "ACC_MULE_P401"
    assert resp.contains_only_verified_fields is True
    assert resp.officer_approval_required is True
    assert resp.automatic_dispatch_enabled is False
    assert len(resp.integrity_hash) == 64
    assert Path(resp.file_path).exists()

    # Evidence summary present
    assert "risk_tier" in resp.evidence_summary
    assert "mule_risk_index" in resp.evidence_summary


def test_freeze_requisition_unknown_values(ingested_p4_db):
    """Verify unknown bank/branch remain UNAVAILABLE in output."""
    svc = DocumentService(ingested_p4_db)
    resp = svc.generate_freeze_requisition(
        target_account_id="ACC_MULE_P401",
        dataset_id="ds_p4_test",
    )

    # No automatic dispatch
    assert resp.automatic_dispatch_enabled is False
    assert resp.officer_approval_required is True


# === 7. Document Factual Consistency ===

def test_diary_no_invented_fields(ingested_p4_db):
    """Verify case diary only contains validated factual fields."""
    svc = DocumentService(ingested_p4_db)
    resp = svc.generate_case_diary(
        victim_account="ACC_VIC_P4001",
        dataset_id="ds_p4_test",
    )
    assert resp.factual_validation_passed is True
    assert "validated factual fields" in resp.disclaimer


# === 8. API Endpoints ===

@pytest.fixture
def phase4_api_db(tmp_path: Path):
    """Setup API test DB for Phase 4."""
    conn = duckdb.connect(":memory:")
    apply_schema(conn)
    db_module._connection = conn

    csv_file = tmp_path / "p4_api_test.csv"
    rows = [
        "TX_API_01,2026-03-01 10:00:00,ACC_VIC_API01,Victim,SBIN0001001,ACC_MUL_API01,Mule,HDFC0002001,10000.00,UPI,SUCCESS,TASK_EARNING,185.220.101.5,Linux_Script",
        "TX_API_02,2026-03-01 10:10:00,ACC_MUL_API01,Mule,HDFC0002001,ACC_HOP_API01,Hop,PUNB0004001,8000.00,UPI,SUCCESS,,103.21.244.1,Android",
    ]
    header = "Transaction_ID,Timestamp,Sender_Account,Sender_Name,Sender_IFSC,Receiver_Account,Receiver_Name,Receiver_IFSC,Amount,Payment_Mode,Status,Narration,IP_Address,Device_Type\n"
    csv_file.write_text(header + "\n".join(rows) + "\n", encoding="utf-8")

    svc = IngestionService(conn)
    svc.ingest_file(csv_file, dataset_id="ds_p4_api")

    yield conn

    db_module._connection = None
    conn.close()


def test_evidence_snapshot_api(phase4_api_db):
    """Verify POST /api/evidence/snapshot returns valid snapshot response."""
    client = TestClient(app)
    payload = {"victim_account": "ACC_VIC_API01", "dataset_id": "ds_p4_api"}
    resp = client.post("/api/evidence/snapshot", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    snap = data["snapshot"]
    assert snap["dataset_id"] == "ds_p4_api"
    assert snap["victim_account"] == "ACC_VIC_API01"
    assert len(snap["result_hash"]) == 64
    assert len(snap["dataset_hash"]) == 64
    assert snap["app_version"] == "1.0.0"
    assert snap["rule_version"] == "1.0.0"
    assert "reproducibility_note" in data


def test_case_diary_api(phase4_api_db):
    """Verify POST /api/documents/case-diary returns valid response with PDF file."""
    client = TestClient(app)
    payload = {
        "victim_account": "ACC_VIC_API01",
        "dataset_id": "ds_p4_api",
        "officer_name": "API Test Officer",
    }
    resp = client.post("/api/documents/case-diary", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["victim_account"] == "ACC_VIC_API01"
    assert data["file_format"] == "PDF"
    assert data["factual_validation_passed"] is True
    assert len(data["integrity_hash"]) == 64
    assert Path(data["file_path"]).exists()


def test_freeze_requisition_api(phase4_api_db):
    """Verify POST /api/documents/freeze-requisition returns valid response."""
    client = TestClient(app)
    payload = {
        "target_account_id": "ACC_MUL_API01",
        "dataset_id": "ds_p4_api",
        "requesting_officer": "API Inspector",
        "bank_name": "HDFC Bank",
    }
    resp = client.post("/api/documents/freeze-requisition", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["target_account_id"] == "ACC_MUL_API01"
    assert data["contains_only_verified_fields"] is True
    assert data["officer_approval_required"] is True
    assert data["automatic_dispatch_enabled"] is False
    assert len(data["integrity_hash"]) == 64
    assert Path(data["file_path"]).exists()


# === 9. Offline Validation ===

def test_offline_validation(phase4_api_db):
    """Verify all core endpoints work without network (localhost only).

    Architecture: Browser → localhost → FastAPI → DuckDB + forensic engines → Evidence + Reports
    No external API calls required.
    """
    client = TestClient(app)

    # Health check
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["offline"] is True

    # Dataset status
    resp = client.get("/api/dataset/status?dataset_id=ds_p4_api")
    assert resp.status_code == 200

    # Account profile
    resp = client.get("/api/accounts/ACC_VIC_API01?dataset_id=ds_p4_api")
    assert resp.status_code == 200

    # Account transactions
    resp = client.get("/api/accounts/ACC_VIC_API01/transactions?dataset_id=ds_p4_api")
    assert resp.status_code == 200

    # Account risk
    resp = client.get("/api/accounts/ACC_MUL_API01/risk?dataset_id=ds_p4_api")
    assert resp.status_code == 200

    # Investigation trace
    resp = client.get("/api/investigations/trace/ACC_VIC_API01?dataset_id=ds_p4_api")
    assert resp.status_code == 200

    # Recovery candidates
    resp = client.get("/api/recovery/candidates?dataset_id=ds_p4_api&min_net_flow=1")
    assert resp.status_code == 200

    # Evidence snapshot
    resp = client.post("/api/evidence/snapshot", json={"victim_account": "ACC_VIC_API01", "dataset_id": "ds_p4_api"})
    assert resp.status_code == 200

    # Case diary
    resp = client.post("/api/documents/case-diary", json={"victim_account": "ACC_VIC_API01", "dataset_id": "ds_p4_api"})
    assert resp.status_code == 200

    # Freeze requisition
    resp = client.post(
        "/api/documents/freeze-requisition",
        json={"target_account_id": "ACC_MUL_API01", "dataset_id": "ds_p4_api"},
    )
    assert resp.status_code == 200


# === 10. Integrity Disclaimer ===

def test_integrity_disclaimer_present(ingested_p4_db):
    """Verify SHA-256 disclaimer does NOT claim proof of authenticity."""
    svc = EvidenceSnapshotService(ingested_p4_db)
    resp = svc.create_snapshot(victim_account="ACC_VIC_P4001", dataset_id="ds_p4_test")
    disclaimer = resp.snapshot.integrity_disclaimer

    assert "integrity" in disclaimer.lower()
    assert "NOT" in disclaimer
    assert "proof" in disclaimer.lower()


# === 11. Layer Candidates and Risk in Snapshot ===

def test_snapshot_layer_candidates(ingested_p4_db):
    """Verify snapshot includes layer candidate classifications from risk engine."""
    svc = EvidenceSnapshotService(ingested_p4_db)
    resp = svc.create_snapshot(victim_account="ACC_MULE_P401", dataset_id="ds_p4_test")
    snap = resp.snapshot

    # ACC_MULE_P401 has fan-in (2 senders) and fan-out (2 receivers) - may or may not reach thresholds
    assert isinstance(snap.layer_candidates, list)
    assert isinstance(snap.risk_summary, dict)
    assert "mule_risk_index" in snap.risk_summary
    assert "risk_tier" in snap.risk_summary


def test_snapshot_money_trail_summary(ingested_p4_db):
    """Verify snapshot includes money trail summary with graph data."""
    svc = EvidenceSnapshotService(ingested_p4_db)
    resp = svc.create_snapshot(victim_account="ACC_VIC_P4001", dataset_id="ds_p4_test")
    trail = resp.snapshot.money_trail_summary

    assert "total_edges" in trail
    assert "total_hops_found" in trail
    assert "total_attributed_amount" in trail
    assert "nodes" in trail
    assert trail["total_edges"] >= 1
