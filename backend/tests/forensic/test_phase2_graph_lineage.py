"""Deterministic test suite for Phase 2: Temporal Graph Traversal & Amount Lineage.

Verifies:
1. branching graph (one-to-many amount split)
2. cycle detection (path-aware without infinite loop)
3. repeated account through alternative paths
4. out-of-order transactions (temporal filter exclusion)
5. exactly 3 hops
6. exactly 4 hops
7. attempted fifth hop (must be strictly rejected/not traversed)
8. temporal exclusion (t_out < t_in rejected)
9. one-to-many amount split (₹10,000 -> ₹6,000 + ₹4,000)
10. many-to-one convergence
11. partial attribution
12. double-count prevention across converging paths
13. repeated Transaction_ID with different record_ids
14. deterministic repeated query results
15. account profile and timeline API endpoints
"""

from pathlib import Path

import duckdb
import pytest
from fastapi.testclient import TestClient

from app.database.schema import apply_schema
from app.main import app
from app.services.ingestion import IngestionService
from app.services.investigation import InvestigationService


@pytest.fixture
def phase2_db():
    """Create in-memory DuckDB initialized with canonical schema."""
    conn = duckdb.connect(":memory:")
    apply_schema(conn)
    yield conn
    conn.close()


@pytest.fixture
def forensic_graph_csv(tmp_path: Path):
    """Generate a multi-hop forensic scenario dataset testing splits, cycles, and 5-hop bounds.

    Scenario:
    - Victim: ACC_VICTIM_01 sends ₹10,000 to ACC_MULE_A01 (Hop 1) at 10:00:00
    - Split: ACC_MULE_A01 sends ₹6,000 to ACC_MULE_B01 and ₹4,000 to ACC_MULE_B02 (Hop 2) at 10:10:00 & 10:15:00
    - Out-of-order / Temporal invalid: ACC_MULE_A01 had sent ₹2,000 to ACC_IGNORED at 09:00:00 (before victim tx) -> MUST BE EXCLUDED
    - Convergence: ACC_MULE_B01 sends ₹5,000 to ACC_MULE_C01 (Hop 3) at 10:20:00
                   ACC_MULE_B02 sends ₹3,000 to ACC_MULE_C01 (Hop 3) at 10:25:00
    - 4th Hop: ACC_MULE_C01 sends ₹7,000 to ACC_MULE_D01 (Hop 4) at 10:30:00
    - 5th Hop Attempt: ACC_MULE_D01 sends ₹5,000 to ACC_MULE_E01 (Hop 5) at 10:40:00 -> MUST BE REJECTED/NOT TRAVERSED
    - Cycle: ACC_MULE_B01 sends ₹500 back to ACC_VICTIM_01 at 10:22:00 -> MUST BE FLAGGED AS CYCLE, BOUNDED
    - Repeated Transaction_ID: TX_SHARED_01 appears on two distinct transactions
    """
    csv_file = tmp_path / "phase2_scenario.csv"
    rows = [
        # Hop 1: Victim -> Mule A (₹10,000)
        "TX_VIC_001,2026-03-01 10:00:00,ACC_VICTIM_01,Victim,SBIN0001001,ACC_MULE_A01,MuleA,HDFC0002001,10000.00,UPI,SUCCESS",
        # Prior tx from Mule A before victim funds arrived -> MUST BE EXCLUDED by temporal rule
        "TX_PRIOR_01,2026-03-01 09:00:00,ACC_MULE_A01,MuleA,HDFC0002001,ACC_IGNORED_1,Ignored,ICIC0003001,2000.00,UPI,SUCCESS",
        # Hop 2 Split: Mule A -> Mule B1 (₹6,000) & Mule A -> Mule B2 (₹4,000)
        "TX_SPLIT_01,2026-03-01 10:10:00,ACC_MULE_A01,MuleA,HDFC0002001,ACC_MULE_B01,MuleB1,PUNB0004001,6000.00,IMPS,SUCCESS",
        "TX_SPLIT_02,2026-03-01 10:15:00,ACC_MULE_A01,MuleA,HDFC0002001,ACC_MULE_B02,MuleB2,BARB0005001,4000.00,IMPS,SUCCESS",
        # Cycle attempt: Mule B1 sends ₹500 back to Victim at 10:22:00
        "TX_CYCLE_01,2026-03-01 10:22:00,ACC_MULE_B01,MuleB1,PUNB0004001,ACC_VICTIM_01,Victim,SBIN0001001,500.00,UPI,SUCCESS",
        # Hop 3 Convergence: Mule B1 -> Mule C1 (₹5,000) & Mule B2 -> Mule C1 (₹3,000)
        "TX_SHARED_01,2026-03-01 10:20:00,ACC_MULE_B01,MuleB1,PUNB0004001,ACC_MULE_C01,MuleC1,KKBK0006001,5000.00,NEFT,SUCCESS",
        "TX_CONV_02,2026-03-01 10:25:00,ACC_MULE_B02,MuleB2,BARB0005001,ACC_MULE_C01,MuleC1,KKBK0006001,3000.00,NEFT,SUCCESS",
        # Hop 4: Mule C1 -> Mule D1 (₹7,000) - Shared Transaction_ID with different record_id
        "TX_SHARED_01,2026-03-01 10:30:00,ACC_MULE_C01,MuleC1,KKBK0006001,ACC_MULE_D01,MuleD1,AXIS0007001,7000.00,RTGS,SUCCESS",
        # Hop 5 Attempt: Mule D1 -> Mule E1 (₹5,000) -> MUST NOT BE TRAVERSED (Hard limit = 4)
        "TX_HOP5_01,2026-03-01 10:40:00,ACC_MULE_D01,MuleD1,AXIS0007001,ACC_MULE_E01,MuleE1,YESB0008001,5000.00,RTGS,SUCCESS",
    ]
    header = "Transaction_ID,Timestamp,Sender_Account,Sender_Name,Sender_IFSC,Receiver_Account,Receiver_Name,Receiver_IFSC,Amount,Payment_Mode,Status\n"
    csv_file.write_text(header + "\n".join(rows) + "\n", encoding="utf-8")
    return csv_file


def test_branching_graph(phase2_db, forensic_graph_csv):
    """Verify branching graph expansion (one-to-many amount split across multiple accounts)."""
    ingest_svc = IngestionService(phase2_db)
    ingest_svc.ingest_file(forensic_graph_csv, dataset_id="ds_p2_test")

    inv_svc = InvestigationService(phase2_db)
    trace = inv_svc.run_trace(victim_account="ACC_VICTIM_01", dataset_id="ds_p2_test")

    # Hop 2 branches: Mule A -> Mule B1 (₹6000) and Mule A -> Mule B2 (₹4000)
    hop2_edges = [e for e in trace.money_trail if e.hop == 2 and not e.is_cycle]
    assert len(hop2_edges) == 2
    branch_recipients = {e.to_account for e in hop2_edges}
    assert branch_recipients == {"ACC_MULE_B01", "ACC_MULE_B02"}
    assert sum(e.attributable_amount for e in hop2_edges) == 10000.00


def test_out_of_order_transactions(phase2_db, forensic_graph_csv):
    """Verify out-of-order/prior transactions preceding victim inflow are strictly excluded."""
    ingest_svc = IngestionService(phase2_db)
    ingest_svc.ingest_file(forensic_graph_csv, dataset_id="ds_p2_test")

    inv_svc = InvestigationService(phase2_db)
    trace = inv_svc.run_trace(victim_account="ACC_VICTIM_01", dataset_id="ds_p2_test")

    # TX_PRIOR_01 occurred at 09:00:00 (before victim tx at 10:00:00)
    tx_ids = [e.Transaction_ID for e in trace.money_trail]
    assert "TX_PRIOR_01" not in tx_ids
    assert "ACC_IGNORED_1" not in [e.to_account for e in trace.money_trail]


def test_exactly_3_hops(phase2_db, forensic_graph_csv):
    """Verify investigation strictly terminates at exactly 3 hops when max_hops=3."""
    ingest_svc = IngestionService(phase2_db)
    ingest_svc.ingest_file(forensic_graph_csv, dataset_id="ds_p2_test")

    inv_svc = InvestigationService(phase2_db)
    trace = inv_svc.run_trace(victim_account="ACC_VICTIM_01", dataset_id="ds_p2_test", max_hops=3)

    hops = {e.hop for e in trace.money_trail}
    assert hops == {1, 2, 3}
    assert 4 not in hops
    assert 5 not in hops


def test_exactly_4_hops(phase2_db, forensic_graph_csv):
    """Verify investigation strictly captures up to exactly 4 hops when max_hops=4."""
    ingest_svc = IngestionService(phase2_db)
    ingest_svc.ingest_file(forensic_graph_csv, dataset_id="ds_p2_test")

    inv_svc = InvestigationService(phase2_db)
    trace = inv_svc.run_trace(victim_account="ACC_VICTIM_01", dataset_id="ds_p2_test", max_hops=4)

    hops = {e.hop for e in trace.money_trail}
    assert hops == {1, 2, 3, 4}
    assert max(hops) == 4


def test_attempted_5th_hop(phase2_db, forensic_graph_csv):
    """Verify attempted 5th hop (Mule D1 -> Mule E1) is strictly rejected and never traversed."""
    ingest_svc = IngestionService(phase2_db)
    ingest_svc.ingest_file(forensic_graph_csv, dataset_id="ds_p2_test")

    inv_svc = InvestigationService(phase2_db)
    trace = inv_svc.run_trace(victim_account="ACC_VICTIM_01", dataset_id="ds_p2_test", max_hops=4)

    hops = [e.hop for e in trace.money_trail]
    assert 5 not in hops, "Hop 5 must never be traversed!"
    dest_accounts = [e.to_account for e in trace.money_trail]
    assert "ACC_MULE_E01" not in dest_accounts
    assert "TX_HOP5_01" not in [e.Transaction_ID for e in trace.money_trail]


def test_pass_through_time_window_boundaries(phase2_db, forensic_graph_csv):
    """Verify pass-through time-window boundaries strictly exclude transactions past cutoff."""
    ingest_svc = IngestionService(phase2_db)
    ingest_svc.ingest_file(forensic_graph_csv, dataset_id="ds_p2_test")

    inv_svc = InvestigationService(phase2_db)
    # Starting tx at 10:00:00. 15-minute window (0.25h) allows txs <= 10:15:00
    trace_bounded = inv_svc.run_trace(
        victim_account="ACC_VICTIM_01",
        dataset_id="ds_p2_test",
        time_window_hours=0.25,
    )
    tx_ids = [e.Transaction_ID for e in trace_bounded.money_trail]
    assert "TX_VIC_001" in tx_ids
    assert "TX_SPLIT_01" in tx_ids  # at 10:10:00 (<= 15 min)
    assert "TX_SPLIT_02" in tx_ids  # at 10:15:00 (<= 15 min)
    assert "TX_SHARED_01" not in tx_ids  # at 10:20:00 (> 15 min)
    assert "TX_CONV_02" not in tx_ids  # at 10:25:00 (> 15 min)


def test_partial_amount_attribution(phase2_db, tmp_path: Path):
    """Verify partial amount attribution when downstream transaction exceeds available funds."""
    csv_file = tmp_path / "partial_attr.csv"
    data = [
        "TX_P1,2026-03-01 10:00:00,ACC_V1,Victim,SBIN0001001,ACC_M1,Mule1,HDFC0002001,5000.00,UPI,SUCCESS",
        "TX_P2,2026-03-01 10:05:00,ACC_M1,Mule1,HDFC0002001,ACC_M2,Mule2,ICIC0003001,8000.00,UPI,SUCCESS",
    ]
    csv_file.write_text(
        "Transaction_ID,Timestamp,Sender_Account,Sender_Name,Sender_IFSC,Receiver_Account,Receiver_Name,Receiver_IFSC,Amount,Payment_Mode,Status\n"
        + "\n".join(data)
        + "\n",
        encoding="utf-8",
    )

    ingest_svc = IngestionService(phase2_db)
    ingest_svc.ingest_file(csv_file, dataset_id="ds_partial_test")

    inv_svc = InvestigationService(phase2_db)
    trace = inv_svc.run_trace(victim_account="ACC_V1", dataset_id="ds_partial_test")

    assert len(trace.money_trail) == 2
    hop2_edge = trace.money_trail[1]
    assert hop2_edge.amount == 8000.00
    assert hop2_edge.attributable_amount == 5000.00  # Capped at remaining 5000
    assert hop2_edge.lineage_status == "attributed"


def test_converging_paths_with_path_specific_lineage(phase2_db, forensic_graph_csv):
    """Verify convergence preserves distinct path-specific edges, parent linkages, and lineage."""
    ingest_svc = IngestionService(phase2_db)
    ingest_svc.ingest_file(forensic_graph_csv, dataset_id="ds_p2_test")

    inv_svc = InvestigationService(phase2_db)
    trace = inv_svc.run_trace(victim_account="ACC_VICTIM_01", dataset_id="ds_p2_test")

    # Hop 3 converges: Mule B1 -> Mule C1 (₹5000) and Mule B2 -> Mule C1 (₹3000)
    h3_edges = [e for e in trace.money_trail if e.hop == 3 and e.to_account == "ACC_MULE_C01"]
    assert len(h3_edges) == 2, "Both converging paths must be preserved!"

    # Verify path-specific senders and amounts
    b1_edge = next(e for e in h3_edges if e.from_account == "ACC_MULE_B01")
    b2_edge = next(e for e in h3_edges if e.from_account == "ACC_MULE_B02")

    assert b1_edge.amount == 5000.00
    assert b1_edge.attributable_amount == 5000.00
    assert b1_edge.lineage_status == "attributed"
    assert b1_edge.parent_record_id is not None

    assert b2_edge.amount == 3000.00
    assert b2_edge.attributable_amount == 3000.00
    assert b2_edge.lineage_status == "attributed"
    assert b2_edge.parent_record_id is not None

    # Distinct parentage from Hop 2
    assert b1_edge.parent_record_id != b2_edge.parent_record_id


def test_double_count_prevention(phase2_db, forensic_graph_csv):
    """Verify conservative attribution prevents double-counting across converging & cyclic paths."""
    ingest_svc = IngestionService(phase2_db)
    ingest_svc.ingest_file(forensic_graph_csv, dataset_id="ds_p2_test")

    inv_svc = InvestigationService(phase2_db)
    trace = inv_svc.run_trace(victim_account="ACC_VICTIM_01", dataset_id="ds_p2_test")

    # 1. Total attributed at any individual hop <= ₹10,000 (initial victim amount)
    for hop in (1, 2, 3, 4):
        hop_total = sum(e.attributable_amount for e in trace.money_trail if e.hop == hop and not e.is_cycle)
        assert hop_total <= 10000.00, f"Hop {hop} exceeded initial victim amount with ₹{hop_total}!"

    # 2. Hop 4: Mule C1 received ₹8000 total from B1 + B2. Sends ₹7000 to D1.
    h4 = [e for e in trace.money_trail if e.hop == 4]
    assert len(h4) == 1
    assert h4[0].attributable_amount == 7000.00

    # 3. Cycle edge (Mule B1 -> Victim) attributed amount is 0.0 (prevents circular double counting)
    cycle_edge = next(e for e in trace.money_trail if e.is_cycle)
    assert cycle_edge.attributable_amount == 0.0
    assert cycle_edge.lineage_status == "unresolved"


def test_cycle_detection(phase2_db, forensic_graph_csv):
    """Verify cycles are flagged and do not cause infinite recursion."""
    ingest_svc = IngestionService(phase2_db)
    ingest_svc.ingest_file(forensic_graph_csv, dataset_id="ds_p2_test")

    inv_svc = InvestigationService(phase2_db)
    trace = inv_svc.run_trace(victim_account="ACC_VICTIM_01", dataset_id="ds_p2_test")

    cycle_edges = [e for e in trace.money_trail if e.is_cycle]
    assert len(cycle_edges) == 1
    assert cycle_edges[0].to_account == "ACC_VICTIM_01"
    assert cycle_edges[0].attributable_amount == 0.0
    assert cycle_edges[0].lineage_status == "unresolved"


def test_repeated_transaction_id_preservation(phase2_db, forensic_graph_csv):
    """Verify that repeated Transaction_ID (TX_SHARED_01) maintains distinct record_ids."""
    ingest_svc = IngestionService(phase2_db)
    ingest_svc.ingest_file(forensic_graph_csv, dataset_id="ds_p2_test")

    inv_svc = InvestigationService(phase2_db)
    trace = inv_svc.run_trace(victim_account="ACC_VICTIM_01", dataset_id="ds_p2_test")

    shared_edges = [e for e in trace.money_trail if e.Transaction_ID == "TX_SHARED_01"]
    assert len(shared_edges) == 2
    # Distinct physical record_ids
    assert shared_edges[0].record_id != shared_edges[1].record_id
    # Distinct hops (one is Hop 3, one is Hop 4)
    assert {shared_edges[0].hop, shared_edges[1].hop} == {3, 4}


def test_deterministic_repeated_queries(phase2_db, forensic_graph_csv):
    """Verify trace returns strictly identical results over multiple repeated runs."""
    ingest_svc = IngestionService(phase2_db)
    ingest_svc.ingest_file(forensic_graph_csv, dataset_id="ds_p2_test")

    inv_svc = InvestigationService(phase2_db)
    trace_a = inv_svc.run_trace(victim_account="ACC_VICTIM_01", dataset_id="ds_p2_test")
    trace_b = inv_svc.run_trace(victim_account="ACC_VICTIM_01", dataset_id="ds_p2_test")

    assert len(trace_a.money_trail) == len(trace_b.money_trail)
    for ea, eb in zip(trace_a.money_trail, trace_b.money_trail, strict=True):
        assert ea.record_id == eb.record_id
        assert ea.hop == eb.hop
        assert ea.attributable_amount == eb.attributable_amount
        assert ea.lineage_status == eb.lineage_status


def test_phase2_api_endpoints(forensic_graph_csv):
    """Verify GET /api/accounts/{id}, GET /api/accounts/{id}/transactions, and GET /api/investigations/trace/{id}."""
    client = TestClient(app)

    # Ingest through the API to populate the active DuckDB instance
    with open(forensic_graph_csv, "rb") as f:
        res_upload = client.post("/api/dataset/upload", files={"file": ("p2_scenario.csv", f, "text/csv")})
    assert res_upload.status_code == 202
    ds_id = res_upload.json()["dataset_id"]

    # 1. Account profile
    res_acc = client.get(f"/api/accounts/ACC_VICTIM_01?dataset_id={ds_id}")
    assert res_acc.status_code == 200
    acc_data = res_acc.json()
    assert acc_data["account_id"] == "ACC_VICTIM_01"
    assert acc_data["out_amount"] == 10000.00

    # 2. Account transactions timeline
    res_txs = client.get(f"/api/accounts/ACC_MULE_A01/transactions?dataset_id={ds_id}")
    assert res_txs.status_code == 200
    txs_data = res_txs.json()
    assert txs_data["total_transactions"] >= 3
    # Verify chronological ordering
    ts_list = [t["timestamp"] for t in txs_data["transactions"]]
    assert ts_list == sorted(ts_list)

    # 3. Investigation trace API
    res_trace = client.get(f"/api/investigations/trace/ACC_VICTIM_01?dataset_id={ds_id}&max_hops=4")
    assert res_trace.status_code == 200
    trace_data = res_trace.json()
    assert trace_data["victim_account"] == "ACC_VICTIM_01"
    assert len(trace_data["money_trail"]) > 0
    assert trace_data["parameters"]["max_hops"] == 4
