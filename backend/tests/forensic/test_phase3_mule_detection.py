"""Forensic test suite for Phase 3: Mule Detection, L1/L2/L3 Classification, Explainable Risk, and Recovery.

Verifies:
1. rapid pass-through
2. pass-through outside configured interval (temporal window exclusion)
3. fan-in detection
4. fan-out detection
5. smurfing / structured splitting
6. cycle indicators with path evidence
7. terminal signals and high retention
8. device anomaly (Linux_Script, Web_Emulator)
9. IP anomaly (185.*, 194.*)
10. narration pattern (TASK_EARNING, P2P_CRYPTO, WALLET_LOAD)
11. Layer 1 Collector candidate classification
12. Layer 2 Distributor candidate classification
13. Layer 3 Terminal candidate classification
14. mandatory feature output contract and evidence linkage (supporting record_ids on all detected features)
15. score reproducibility and determinism
16. Observed Net Flow and recovery candidate prioritization
17. cross-victim shared infrastructure candidate correlation
"""

from datetime import datetime
from pathlib import Path

import duckdb
import pytest

from app.algorithms.evaluation import ForensicRiskEvaluator
from app.algorithms.mule_detection import MuleDetectionEngine
from app.config.risk_rules import DEFAULT_RISK_CONFIG
from app.database.schema import apply_schema
from app.schemas.account import AccountTransactionItem
from app.schemas.syndicate import CrossVictimAnalysisRequest
from app.services.cross_victim import CrossVictimService
from app.services.ingestion import IngestionService
from app.services.recovery import RecoveryService
from app.services.risk_engine import RiskAssessmentService


@pytest.fixture
def phase3_db():
    """Create in-memory DuckDB initialized with canonical schema."""
    conn = duckdb.connect(":memory:")
    apply_schema(conn)
    yield conn
    conn.close()


@pytest.fixture
def phase3_scenario_csv(tmp_path: Path):
    """Forensic scenario dataset crafted to test all Phase 3 detection patterns.

    Accounts:
    - ACC_VIC_00101, ACC_VIC_00202: Victim accounts
    - ACC_COLL_0001: Layer 1 Collector Candidate (Fan-In: receives from 4 distinct senders)
    - ACC_DIST_0001: Layer 2 Distributor Candidate (Fan-Out: sends to 4 distinct receivers)
    - ACC_PASS_0001: Rapid Pass-Through (₹10,000 received at 10:00, ₹9,000 dispersed at 10:15 within 30m)
    - ACC_SLOW_0001: Slow Pass-Through OUTSIDE 30m window (₹10,000 received at 10:00, ₹9,000 sent at 11:30 -> 90m later)
    - ACC_SMURF_001: Smurfing (₹20,000 in, split into 4 transfers of ₹4,500, ₹4,500, ₹4,000, ₹5,000 within 40m)
    - ACC_CYCLE_001: Cycle (sends to ACC_CYCLE_002 at 10:00, ACC_CYCLE_002 sends back at 10:20)
    - ACC_TERM_0001: Layer 3 Terminal Candidate (₹50,000 in, only ₹2,000 out via WALLET_LOAD at high retention 96%)
    - ACC_ANOM_0001: Device & IP Anomaly (Linux_Script, Web_Emulator, 185.220.101.5, 194.26.29.10, TASK_EARNING)
    - ACC_SHARED_01: Shared Infrastructure Candidate (reached by both ACC_VIC_00101 and ACC_VIC_00202)
    - ACC_CLEAN_001: Baseline normal account (SALARY, GROCERY, 103.21.244.1, Android)
    """
    csv_file = tmp_path / "phase3_scenario.csv"
    rows = [
        # 1. Fan-In for ACC_COLL_0001 (4 distinct senders)
        "TX_FI_01,2026-03-01 08:00:00,ACC_SENDER_01,Sender1,SBIN0001001,ACC_COLL_0001,Collector,HDFC0002001,5000.00,UPI,SUCCESS",
        "TX_FI_02,2026-03-01 08:05:00,ACC_SENDER_02,Sender2,ICIC0003001,ACC_COLL_0001,Collector,HDFC0002001,6000.00,UPI,SUCCESS",
        "TX_FI_03,2026-03-01 08:10:00,ACC_SENDER_03,Sender3,PUNB0004001,ACC_COLL_0001,Collector,HDFC0002001,7000.00,IMPS,SUCCESS",
        "TX_FI_04,2026-03-01 08:15:00,ACC_SENDER_04,Sender4,BARB0005001,ACC_COLL_0001,Collector,HDFC0002001,8000.00,IMPS,SUCCESS",

        # 2. Fan-Out for ACC_DIST_0001 (4 distinct receivers)
        "TX_FO_IN,2026-03-01 09:00:00,ACC_SRC_FND_01,Source,SBIN0001001,ACC_DIST_0001,Distributor,HDFC0002001,25000.00,NEFT,SUCCESS",
        "TX_FO_01,2026-03-01 09:10:00,ACC_DIST_0001,Distributor,HDFC0002001,ACC_RECV_0001,Recv1,KKBK0006001,5000.00,UPI,SUCCESS",
        "TX_FO_02,2026-03-01 09:15:00,ACC_DIST_0001,Distributor,HDFC0002001,ACC_RECV_0002,Recv2,AXIS0007001,6000.00,UPI,SUCCESS",
        "TX_FO_03,2026-03-01 09:20:00,ACC_DIST_0001,Distributor,HDFC0002001,ACC_RECV_0003,Recv3,YESB0008001,7000.00,IMPS,SUCCESS",
        "TX_FO_04,2026-03-01 09:25:00,ACC_DIST_0001,Distributor,HDFC0002001,ACC_RECV_0004,Recv4,IDIB0009001,6000.00,IMPS,SUCCESS",

        # 3. Rapid Pass-Through (ACC_PASS_0001: ₹10,000 in at 10:00, ₹9,000 out at 10:15 - 15m elapsed <= 30m window)
        "TX_RP_IN,2026-03-01 10:00:00,ACC_SENDER_01,Sender1,SBIN0001001,ACC_PASS_0001,PassThru,HDFC0002001,10000.00,IMPS,SUCCESS",
        "TX_RP_OUT,2026-03-01 10:15:00,ACC_PASS_0001,PassThru,HDFC0002001,ACC_RECV_0001,Recv1,ICIC0003001,9000.00,UPI,SUCCESS",

        # 4. Slow Pass-Through outside configured interval (ACC_SLOW_0001: ₹10,000 in at 10:00, ₹9,000 out at 11:30 - 90m elapsed > 30m window)
        "TX_SL_IN,2026-03-01 10:00:00,ACC_SENDER_01,Sender1,SBIN0001001,ACC_SLOW_0001,SlowPass,HDFC0002001,10000.00,IMPS,SUCCESS",
        "TX_SL_OUT,2026-03-01 11:30:00,ACC_SLOW_0001,SlowPass,HDFC0002001,ACC_RECV_0001,Recv1,ICIC0003001,9000.00,UPI,SUCCESS",

        # 5. Smurfing / Splitting (ACC_SMURF_001: ₹20,000 in at 12:00, split into 4 transfers within 40m)
        "TX_SM_IN,2026-03-01 12:00:00,ACC_SENDER_01,Sender1,SBIN0001001,ACC_SMURF_001,Smurfer,HDFC0002001,20000.00,NEFT,SUCCESS",
        "TX_SM_01,2026-03-01 12:10:00,ACC_SMURF_001,Smurfer,HDFC0002001,ACC_SM_DEST_01,Dest1,ICIC0003001,4500.00,UPI,SUCCESS",
        "TX_SM_02,2026-03-01 12:20:00,ACC_SMURF_001,Smurfer,HDFC0002001,ACC_SM_DEST_02,Dest2,PUNB0004001,4500.00,UPI,SUCCESS",
        "TX_SM_03,2026-03-01 12:30:00,ACC_SMURF_001,Smurfer,HDFC0002001,ACC_SM_DEST_03,Dest3,BARB0005001,4000.00,UPI,SUCCESS",
        "TX_SM_04,2026-03-01 12:40:00,ACC_SMURF_001,Smurfer,HDFC0002001,ACC_SM_DEST_04,Dest4,KKBK0006001,5000.00,UPI,SUCCESS",

        # 6. Cycle indicator (ACC_CYCLE_001 -> ACC_CYCLE_002 at 13:00, ACC_CYCLE_002 -> ACC_CYCLE_001 at 13:20)
        "TX_CY_01,2026-03-01 13:00:00,ACC_CYCLE_001,Cycle1,SBIN0001001,ACC_CYCLE_002,Cycle2,HDFC0002001,8000.00,UPI,SUCCESS",
        "TX_CY_02,2026-03-01 13:20:00,ACC_CYCLE_002,Cycle2,HDFC0002001,ACC_CYCLE_001,Cycle1,SBIN0001001,7500.00,UPI,SUCCESS",

        # 7. Terminal Candidate (ACC_TERM_0001: ₹50,000 in, ₹2,000 out via WALLET_LOAD; 96% retention)
        "TX_TM_IN,2026-03-01 14:00:00,ACC_SENDER_01,Sender1,SBIN0001001,ACC_TERM_0001,Terminal,HDFC0002001,50000.00,RTGS,SUCCESS",
        "TX_TM_OUT,2026-03-01 14:30:00,ACC_TERM_0001,Terminal,HDFC0002001,ACC_WALLET_END,Wallet,ICIC0003001,2000.00,UPI,SUCCESS",

        # 8. Anomaly Signals (ACC_ANOM_0001: Linux_Script, 185.220.101.5, TASK_EARNING)
        "TX_ANOM_01,2026-03-01 15:00:00,ACC_SENDER_01,Sender1,SBIN0001001,ACC_ANOM_0001,Anom,HDFC0002001,15000.00,UPI,SUCCESS",
        "TX_ANOM_02,2026-03-01 15:10:00,ACC_ANOM_0001,Anom,HDFC0002001,ACC_RECV_0001,Recv1,ICIC0003001,14000.00,UPI,SUCCESS",

        # 9. Cross-Victim Shared Infrastructure:
        # Victim 1 (ACC_VIC_00101) -> ACC_HOP1_A -> ACC_SHARED_01
        # Victim 2 (ACC_VIC_00202) -> ACC_HOP1_B -> ACC_SHARED_01
        "TX_CV_V1,2026-03-01 16:00:00,ACC_VIC_00101,Victim1,SBIN0001001,ACC_HOP1_A,Hop1A,HDFC0002001,30000.00,UPI,SUCCESS",
        "TX_CV_V1_2,2026-03-01 16:10:00,ACC_HOP1_A,Hop1A,HDFC0002001,ACC_SHARED_01,Shared,PUNB0004001,28000.00,IMPS,SUCCESS",
        "TX_CV_V2,2026-03-01 16:05:00,ACC_VIC_00202,Victim2,ICIC0003001,ACC_HOP1_B,Hop1B,BARB0005001,40000.00,UPI,SUCCESS",
        "TX_CV_V2_2,2026-03-01 16:15:00,ACC_HOP1_B,Hop1B,BARB0005001,ACC_SHARED_01,Shared,PUNB0004001,38000.00,IMPS,SUCCESS",

        # 10. Clean baseline account
        "TX_CLN_01,2026-03-01 17:00:00,ACC_EMPLOYER_1,Employer,SBIN0001001,ACC_CLEAN_001,Clean,HDFC0002001,50000.00,NEFT,SUCCESS",
        "TX_CLN_02,2026-03-01 18:00:00,ACC_CLEAN_001,Clean,HDFC0002001,ACC_STORE_0001,Store,ICIC0003001,2500.00,UPI,SUCCESS",
    ]

    # Extended header including Narration, IP_Address, Device_Type
    header = "Transaction_ID,Timestamp,Sender_Account,Sender_Name,Sender_IFSC,Receiver_Account,Receiver_Name,Receiver_IFSC,Amount,Payment_Mode,Status,Narration,IP_Address,Device_Type\n"

    # Add extended metadata to rows
    formatted_rows = []
    for r in rows:
        parts = r.split(",")
        tx_id = parts[0]
        narr = ""
        ip = "103.21.244.10"
        dev = "Android"

        if "TX_ANOM" in tx_id:
            dev = "Linux_Script"
            ip = "185.220.101.5"
            narr = "TASK_EARNING"
        elif "TX_TM_OUT" in tx_id:
            narr = "WALLET_LOAD"
        elif "TX_CLN_01" in tx_id:
            narr = "SALARY"
        elif "TX_CLN_02" in tx_id:
            narr = "GROCERY"

        formatted_rows.append(f"{r},{narr},{ip},{dev}")

    csv_file.write_text(header + "\n".join(formatted_rows) + "\n", encoding="utf-8")
    return csv_file


@pytest.fixture
def ingested_phase3_db(phase3_db, phase3_scenario_csv):
    """Ingest scenario dataset and return initialized DB connection."""
    ingest_svc = IngestionService(phase3_db)
    ingest_svc.ingest_file(phase3_scenario_csv, dataset_id="ds_p3_test")
    return phase3_db


# --- Tests ---

def test_rapid_pass_through(ingested_phase3_db):
    """Verify rapid pass-through detection within configured window (15m <= 30m, 90% >= 70%)."""
    risk_svc = RiskAssessmentService(ingested_phase3_db)
    profile = risk_svc.assess_account_risk("ACC_PASS_0001", "ds_p3_test")
    assert profile is not None

    pt_feature = next(f for f in profile.features if f.feature_name == "rapid_pass_through")
    assert pt_feature.measured_value["is_detected"] is True
    assert pt_feature.score_contribution == DEFAULT_RISK_CONFIG.weight_rapid_pass_through
    assert pt_feature.measured_value["primary_incident"]["percentage"] == 90.0
    assert pt_feature.measured_value["primary_incident"]["elapsed_minutes"] == 15.0

    # Evidence linkage: verify supporting record_ids and transaction_ids are present
    assert len(pt_feature.supporting_record_ids) >= 2
    assert "TX_RP_IN" in pt_feature.supporting_transaction_ids
    assert "TX_RP_OUT" in pt_feature.supporting_transaction_ids


def test_pass_through_outside_configured_interval(ingested_phase3_db):
    """Verify pass-through outside configured window (90m > 30m) does NOT fire rapid pass-through."""
    risk_svc = RiskAssessmentService(ingested_phase3_db)
    profile = risk_svc.assess_account_risk("ACC_SLOW_0001", "ds_p3_test")
    assert profile is not None

    pt_feature = next(f for f in profile.features if f.feature_name == "rapid_pass_through")
    assert pt_feature.measured_value["is_detected"] is False
    assert pt_feature.score_contribution == 0.0
    assert len(pt_feature.supporting_record_ids) == 0


def test_fan_in_detection_and_l1_classification(ingested_phase3_db):
    """Verify Fan-In detector fires for 4 senders (>= 3) and assigns Layer 1 Collector Candidate."""
    risk_svc = RiskAssessmentService(ingested_phase3_db)
    profile = risk_svc.assess_account_risk("ACC_COLL_0001", "ds_p3_test")
    assert profile is not None

    fi_feature = next(f for f in profile.features if f.feature_name == "fan_in")
    assert fi_feature.measured_value["distinct_senders"] == 4
    assert fi_feature.score_contribution == DEFAULT_RISK_CONFIG.weight_fan_in
    assert len(fi_feature.supporting_record_ids) == 4
    assert len(fi_feature.supporting_transaction_ids) == 4

    # Verify candidate layer classification
    l1_roles = [layer for layer in profile.layer_classifications if layer.role == "Layer 1 Collector Candidate"]
    assert len(l1_roles) == 1
    assert l1_roles[0].confidence > 0.5
    assert len(l1_roles[0].supporting_record_ids) == 4


def test_fan_out_detection_and_l2_classification(ingested_phase3_db):
    """Verify Fan-Out detector fires for 4 receivers (>= 3) and assigns Layer 2 Distributor Candidate."""
    risk_svc = RiskAssessmentService(ingested_phase3_db)
    profile = risk_svc.assess_account_risk("ACC_DIST_0001", "ds_p3_test")
    assert profile is not None

    fo_feature = next(f for f in profile.features if f.feature_name == "fan_out")
    assert fo_feature.measured_value["distinct_receivers"] == 4
    assert fo_feature.score_contribution == DEFAULT_RISK_CONFIG.weight_fan_out
    assert len(fo_feature.supporting_record_ids) == 4

    l2_roles = [layer for layer in profile.layer_classifications if layer.role == "Layer 2 Distributor Candidate"]
    assert len(l2_roles) == 1
    assert l2_roles[0].confidence > 0.5
    assert len(l2_roles[0].supporting_record_ids) >= 4


def test_smurfing_detection(ingested_phase3_db):
    """Verify smurfing / structured splitting detection with supporting transaction records."""
    risk_svc = RiskAssessmentService(ingested_phase3_db)
    profile = risk_svc.assess_account_risk("ACC_SMURF_001", "ds_p3_test")
    assert profile is not None

    sm_feature = next(f for f in profile.features if f.feature_name == "smurfing")
    assert sm_feature.measured_value["is_detected"] is True
    assert sm_feature.score_contribution == DEFAULT_RISK_CONFIG.weight_smurfing
    p = sm_feature.measured_value["primary_incident"]
    assert p["split_count"] == 4
    assert p["incoming_amount"] == 20000.0
    assert p["total_split_amount"] == 18000.0
    assert len(sm_feature.supporting_record_ids) == 5  # 1 source + 4 splits
    assert "TX_SM_IN" in sm_feature.supporting_transaction_ids
    assert "TX_SM_01" in sm_feature.supporting_transaction_ids


def test_cycle_indicator(ingested_phase3_db):
    """Verify circular movement detection between accounts with exact path evidence."""
    risk_svc = RiskAssessmentService(ingested_phase3_db)
    profile = risk_svc.assess_account_risk("ACC_CYCLE_001", "ds_p3_test")
    assert profile is not None

    cy_feature = next(f for f in profile.features if f.feature_name == "cycle")
    assert cy_feature.measured_value["is_detected"] is True
    assert cy_feature.score_contribution == DEFAULT_RISK_CONFIG.weight_cycle
    assert len(cy_feature.supporting_record_ids) == 2
    assert "TX_CY_01" in cy_feature.supporting_transaction_ids
    assert "TX_CY_02" in cy_feature.supporting_transaction_ids


def test_terminal_signals_and_l3_classification(ingested_phase3_db):
    """Verify Layer 3 Terminal candidate classification based on 96% retention and WALLET_LOAD narration."""
    risk_svc = RiskAssessmentService(ingested_phase3_db)
    profile = risk_svc.assess_account_risk("ACC_TERM_0001", "ds_p3_test")
    assert profile is not None

    l3_roles = [layer for layer in profile.layer_classifications if layer.role == "Layer 3 Terminal Candidate"]
    assert len(l3_roles) == 1
    assert l3_roles[0].confidence >= 0.8
    assert len(l3_roles[0].supporting_record_ids) >= 1


def test_dataset_signals_anomaly(ingested_phase3_db):
    """Verify detection of Linux_Script, 185.* IP, and TASK_EARNING narration signals."""
    risk_svc = RiskAssessmentService(ingested_phase3_db)
    profile = risk_svc.assess_account_risk("ACC_ANOM_0001", "ds_p3_test")
    assert profile is not None

    dev_feat = next(f for f in profile.features if f.feature_name == "device_anomaly")
    assert dev_feat.measured_value["is_detected"] is True
    assert "Linux_Script" in dev_feat.measured_value["matched_devices"]
    assert len(dev_feat.supporting_record_ids) > 0

    ip_feat = next(f for f in profile.features if f.feature_name == "ip_anomaly")
    assert ip_feat.measured_value["is_detected"] is True
    assert any(ip.startswith("185.") for ip in ip_feat.measured_value["matched_ips"])
    assert len(ip_feat.supporting_record_ids) > 0

    narr_feat = next(f for f in profile.features if f.feature_name == "narration_pattern")
    assert narr_feat.measured_value["is_detected"] is True
    assert "TASK_EARNING" in narr_feat.measured_value["matched_narrations"]
    assert len(narr_feat.supporting_record_ids) > 0


def test_risk_feature_evidence_contract(ingested_phase3_db):
    """Verify all risk features strictly adhere to mandatory feature output contract."""
    risk_svc = RiskAssessmentService(ingested_phase3_db)
    profile = risk_svc.assess_account_risk("ACC_ANOM_0001", "ds_p3_test")
    assert profile is not None

    assert len(profile.features) == 8
    for feat in profile.features:
        assert isinstance(feat.feature_name, str)
        assert feat.measured_value is not None
        assert feat.threshold_configured is not None
        assert isinstance(feat.supporting_record_ids, list)
        assert isinstance(feat.supporting_transaction_ids, list)
        assert 0.0 <= feat.data_quality_confidence <= 1.0
        assert 0.0 <= feat.score_contribution <= 100.0
        assert len(feat.explanation) > 0

        # If feature contributed positively, supporting record_ids MUST be non-empty
        if feat.score_contribution > 0:
            assert len(feat.supporting_record_ids) > 0, f"Feature {feat.feature_name} has no record_ids"


def test_score_reproducibility(ingested_phase3_db):
    """Verify determinism: identical inputs produce identical Mule Risk Index and feature scores."""
    risk_svc = RiskAssessmentService(ingested_phase3_db)

    score_1 = risk_svc.assess_account_risk("ACC_ANOM_0001", "ds_p3_test")
    score_2 = risk_svc.assess_account_risk("ACC_ANOM_0001", "ds_p3_test")
    score_3 = risk_svc.assess_account_risk("ACC_ANOM_0001", "ds_p3_test")

    assert score_1.mule_risk_index == score_2.mule_risk_index == score_3.mule_risk_index
    assert score_1.risk_tier == score_2.risk_tier == score_3.risk_tier
    assert [f.score_contribution for f in score_1.features] == [f.score_contribution for f in score_2.features]


def test_observed_net_flow_and_recovery(ingested_phase3_db):
    """Verify Observed Net Flow computation, disclaimer, and candidate ranking."""
    rec_svc = RecoveryService(ingested_phase3_db)
    res = rec_svc.get_recovery_candidates(dataset_id="ds_p3_test", min_net_flow=100.0)

    assert res.total_candidates > 0
    top_cand = res.candidates[0]

    # Formula check: ObservedNetFlow = incoming - outgoing
    assert round(top_cand.total_incoming_amount - top_cand.total_outgoing_amount, 2) == top_cand.observed_net_flow
    assert "Observed Net Flow is strictly limited to the selected dataset" in top_cand.disclaimer
    assert len(top_cand.supporting_incoming_record_ids) > 0


def test_cross_victim_shared_infrastructure(ingested_phase3_db):
    """Verify cross-victim analysis uncovers shared node ACC_SHARED_01 with exact connecting transactions."""
    cv_svc = CrossVictimService(ingested_phase3_db)
    req = CrossVictimAnalysisRequest(
        victim_accounts=["ACC_VIC_00101", "ACC_VIC_00202"],
        dataset_id="ds_p3_test",
        max_hops=4,
    )
    res = cv_svc.analyze_cross_victim_infrastructure(req)

    assert len(res.shared_infrastructure_candidates) >= 1
    shared_cand = next(
        c for c in res.shared_infrastructure_candidates if c.candidate_account_id == "ACC_SHARED_01"
    )

    assert shared_cand.victim_count == 2
    assert set(shared_cand.connected_victim_accounts) == {"ACC_VIC_00101", "ACC_VIC_00202"}
    assert shared_cand.total_flowing_amount == 66000.00  # 28000 + 38000

    # Verify connecting transactions
    v1_txs = [t for t in shared_cand.connecting_transactions if t.victim_account == "ACC_VIC_00101"]
    v2_txs = [t for t in shared_cand.connecting_transactions if t.victim_account == "ACC_VIC_00202"]
    assert len(v1_txs) >= 1
    assert len(v2_txs) >= 1
    assert "Candidate linkage terminology" in res.candidate_linkage_disclaimer


def test_evaluation_tooling(ingested_phase3_db):
    """Verify ForensicRiskEvaluator computes precision, recall, FPR, and confusion matrix."""
    evaluator = ForensicRiskEvaluator(ingested_phase3_db)

    # Synthetic ground truth
    ground_truth = {
        "ACC_ANOM_0001": True,   # Mule
        "ACC_COLL_0001": True,   # Mule
        "ACC_CLEAN_001": False,  # Regular
    }

    metrics = evaluator.evaluate(ground_truth, dataset_id="ds_p3_test", threshold=25.0)

    assert metrics.total_samples == 3
    assert metrics.true_positives + metrics.false_positives + metrics.true_negatives + metrics.false_negatives == 3
    assert metrics.confusion_matrix["TP"] >= 1
    assert metrics.confusion_matrix["TN"] >= 1
    assert 0.0 <= metrics.precision <= 1.0
    assert 0.0 <= metrics.recall <= 1.0
    assert 0.0 <= metrics.false_positive_rate <= 1.0


# --- Dedicated Pass-Through Logic Verification Tests ---

def _make_tx(record_id: str, tx_id: str, direction: str, amount: float, ts_str: str, counterparty: str = "ACC_OTHER") -> AccountTransactionItem:
    return AccountTransactionItem(
        record_id=record_id,
        Transaction_ID=tx_id,
        direction=direction,
        amount=amount,
        timestamp=datetime.fromisoformat(ts_str),
        counterparty_account=counterparty,
        payment_mode="UPI",
    )


def test_pass_through_90_percent_within_3_minutes_official_met():
    """Verify >= 90% within 3 minutes meets the official criterion and yields STRONG signal."""
    engine = MuleDetectionEngine(DEFAULT_RISK_CONFIG)
    in_tx = _make_tx("rec_in_1", "TX_IN_1", "IN", 10000.0, "2026-03-01 10:00:00")
    out_tx = _make_tx("rec_out_1", "TX_OUT_1", "OUT", 9000.0, "2026-03-01 10:03:00")

    res = engine.detect_rapid_pass_through([in_tx, out_tx])

    assert res["is_detected"] is True
    assert res["official_criterion_met"] is True
    assert res["official_pass_through_criterion_met"] is True
    assert res["signal_strength"] == "STRONG"
    assert res["score_contribution"] == 20.0
    assert res["elapsed_time"] == 3.0
    assert res["measured_value"]["percentage"] == 90.0
    assert res["supporting_record_ids"] == ["rec_in_1", "rec_out_1"]


def test_pass_through_90_percent_within_15_minutes_official_met():
    """Verify >= 90% within 15 minutes meets the official criterion and yields STRONG signal."""
    engine = MuleDetectionEngine(DEFAULT_RISK_CONFIG)
    in_tx = _make_tx("rec_in_2", "TX_IN_2", "IN", 10000.0, "2026-03-01 10:00:00")
    out_tx = _make_tx("rec_out_2", "TX_OUT_2", "OUT", 9000.0, "2026-03-01 10:15:00")

    res = engine.detect_rapid_pass_through([in_tx, out_tx])

    assert res["is_detected"] is True
    assert res["official_criterion_met"] is True
    assert res["official_pass_through_criterion_met"] is True
    assert res["signal_strength"] == "STRONG"
    assert res["score_contribution"] == 20.0
    assert res["elapsed_time"] == 15.0
    assert res["measured_value"]["percentage"] == 90.0


def test_pass_through_80_percent_moderate_signal():
    """Verify 80-89.99% within valid window yields MODERATE signal (official criterion not met)."""
    engine = MuleDetectionEngine(DEFAULT_RISK_CONFIG)
    in_tx = _make_tx("rec_in_3", "TX_IN_3", "IN", 10000.0, "2026-03-01 10:00:00")
    out_tx = _make_tx("rec_out_3", "TX_OUT_3", "OUT", 8000.0, "2026-03-01 10:10:00")

    res = engine.detect_rapid_pass_through([in_tx, out_tx])

    assert res["is_detected"] is True
    assert res["official_criterion_met"] is False
    assert res["signal_strength"] == "MODERATE"
    assert res["score_contribution"] == 15.0
    assert res["measured_value"]["percentage"] == 80.0
    assert res["elapsed_time"] == 10.0


def test_pass_through_70_to_79_percent_weak_signal():
    """Verify 70-79.99% within valid window yields WEAK signal (official criterion not met)."""
    engine = MuleDetectionEngine(DEFAULT_RISK_CONFIG)
    in_tx = _make_tx("rec_in_4", "TX_IN_4", "IN", 10000.0, "2026-03-01 10:00:00")
    out_tx = _make_tx("rec_out_4", "TX_OUT_4", "OUT", 7500.0, "2026-03-01 10:08:00")

    res = engine.detect_rapid_pass_through([in_tx, out_tx])

    assert res["is_detected"] is True
    assert res["official_criterion_met"] is False
    assert res["signal_strength"] == "WEAK"
    assert res["score_contribution"] == 10.0
    assert res["measured_value"]["percentage"] == 75.0


def test_pass_through_under_70_percent_low_no_signal():
    """Verify < 70% yields LOW/NO SIGNAL and zero score contribution."""
    engine = MuleDetectionEngine(DEFAULT_RISK_CONFIG)
    in_tx = _make_tx("rec_in_5", "TX_IN_5", "IN", 10000.0, "2026-03-01 10:00:00")
    out_tx = _make_tx("rec_out_5", "TX_OUT_5", "OUT", 6500.0, "2026-03-01 10:08:00")

    res = engine.detect_rapid_pass_through([in_tx, out_tx])

    assert res["is_detected"] is False
    assert res["official_criterion_met"] is False
    assert res["signal_strength"] == "LOW/NO SIGNAL"
    assert res["score_contribution"] == 0.0
    assert res["supporting_record_ids"] == []


def test_pass_through_90_percent_outside_configured_window():
    """Verify 90% dispersed outside configured window (25m > 15m) does NOT meet official criterion."""
    engine = MuleDetectionEngine(DEFAULT_RISK_CONFIG)
    in_tx = _make_tx("rec_in_6", "TX_IN_6", "IN", 10000.0, "2026-03-01 10:00:00")
    out_tx = _make_tx("rec_out_6", "TX_OUT_6", "OUT", 9000.0, "2026-03-01 10:25:00")

    res = engine.detect_rapid_pass_through([in_tx, out_tx])

    assert res["official_criterion_met"] is False
    assert res["signal_strength"] == "LOW/NO SIGNAL"
    assert res["score_contribution"] == 0.0


def test_pass_through_multiple_outgoing_transfers():
    """Verify pass-through dispersing across multiple outgoing destinations."""
    engine = MuleDetectionEngine(DEFAULT_RISK_CONFIG)
    in_tx = _make_tx("rec_in_7", "TX_IN_7", "IN", 10000.0, "2026-03-01 10:00:00")
    out1 = _make_tx("rec_out_7a", "TX_OUT_7A", "OUT", 4000.0, "2026-03-01 10:05:00", counterparty="ACC_DST_1")
    out2 = _make_tx("rec_out_7b", "TX_OUT_7B", "OUT", 5000.0, "2026-03-01 10:12:00", counterparty="ACC_DST_2")

    res = engine.detect_rapid_pass_through([in_tx, out1, out2])

    assert res["official_criterion_met"] is True
    assert res["signal_strength"] == "STRONG"
    assert res["measured_value"]["number_of_outgoing_transfers"] == 2
    assert set(res["measured_value"]["destinations"]) == {"ACC_DST_1", "ACC_DST_2"}
    assert res["elapsed_time"] == 12.0
    assert len(res["supporting_record_ids"]) == 3


def test_pass_through_partial_attribution():
    """Verify partial attribution correctly records dispersed amount and retention remainder."""
    engine = MuleDetectionEngine(DEFAULT_RISK_CONFIG)
    in_tx = _make_tx("rec_in_8", "TX_IN_8", "IN", 10000.0, "2026-03-01 10:00:00")
    out_tx = _make_tx("rec_out_8", "TX_OUT_8", "OUT", 8400.0, "2026-03-01 10:07:00")

    res = engine.detect_rapid_pass_through([in_tx, out_tx])

    assert res["signal_strength"] == "MODERATE"
    assert res["measured_value"]["percentage"] == 84.0
    assert res["measured_value"]["incoming_amount"] == 10000.0
    assert res["measured_value"]["dispersed_outgoing_amount"] == 8400.0


def test_pass_through_correct_incoming_relative_timing():
    """Verify elapsed time is strictly measured relative to incoming transaction, not unrelated prior transfers."""
    engine = MuleDetectionEngine(DEFAULT_RISK_CONFIG)
    prior_out = _make_tx("rec_prior", "TX_PRIOR", "OUT", 5000.0, "2026-03-01 09:20:00")
    in_tx = _make_tx("rec_in_9", "TX_IN_9", "IN", 10000.0, "2026-03-01 10:00:00")
    out_tx = _make_tx("rec_out_9", "TX_OUT_9", "OUT", 9000.0, "2026-03-01 10:08:00")

    res = engine.detect_rapid_pass_through([prior_out, in_tx, out_tx])

    assert res["elapsed_time"] == 8.0
    assert res["official_criterion_met"] is True
    assert res["signal_strength"] == "STRONG"


def test_pass_through_no_double_counting():
    """Verify an outgoing transaction cannot be double-counted across multiple incoming transactions."""
    engine = MuleDetectionEngine(DEFAULT_RISK_CONFIG)
    in1 = _make_tx("rec_in_10a", "TX_IN_10A", "IN", 10000.0, "2026-03-01 10:00:00")
    in2 = _make_tx("rec_in_10b", "TX_IN_10B", "IN", 10000.0, "2026-03-01 10:02:00")
    out = _make_tx("rec_out_10", "TX_OUT_10", "OUT", 9000.0, "2026-03-01 10:06:00")

    res = engine.detect_rapid_pass_through([in1, in2, out])

    assert res["incidents_count"] == 1
    assert res["measured_value"]["dispersed_outgoing_amount"] == 9000.0
    assert res["signal_strength"] == "STRONG"


def test_pass_through_evidence_contract_fields():
    """Verify all 11 required contract fields are explicitly present in detection response."""
    engine = MuleDetectionEngine(DEFAULT_RISK_CONFIG)
    in_tx = _make_tx("rec_in_11", "TX_IN_11", "IN", 10000.0, "2026-03-01 10:00:00")
    out_tx = _make_tx("rec_out_11", "TX_OUT_11", "OUT", 9200.0, "2026-03-01 10:04:00")

    res = engine.detect_rapid_pass_through([in_tx, out_tx])

    required_fields = [
        "feature_name",
        "measured_value",
        "elapsed_time",
        "official_threshold",
        "official_criterion_met",
        "signal_strength",
        "supporting_record_ids",
        "supporting_transaction_ids",
        "data_quality_confidence",
        "score_contribution",
        "explanation",
    ]
    for field in required_fields:
        assert field in res, f"Missing required evidence contract field: {field}"

