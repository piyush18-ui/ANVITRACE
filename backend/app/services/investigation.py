"""Graph analysis and multi-hop investigation service."""

import time
import uuid

import duckdb

from app.algorithms.amount_lineage import AmountLineageEngine
from app.algorithms.temporal_traversal import TemporalTraversalEngine
from app.indexes.manager import ForensicIndexManager
from app.schemas.graph import MoneyTrailEdge, MoneyTrailGraph
from app.schemas.investigation import (
    EvidenceMetadata,
    InvestigationParameters,
    InvestigationTraceResponse,
)
from app.utils.logging import log_event, logger


class InvestigationService:
    """Orchestrates deterministic 4-hop traces, amount lineage attribution, and graph generation."""

    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn

    def run_trace(
        self,
        victim_account: str,
        dataset_id: str,
        initial_tx_id: str | None = None,
        max_hops: int = 4,
        time_window_hours: float | None = None,
        min_amount: float | None = None,
    ) -> InvestigationTraceResponse:
        """Execute full bounded four-hop temporal trace and conservative amount lineage."""
        t0 = time.perf_counter()
        investigation_id = f"inv_{uuid.uuid4().hex[:12]}"

        logger.info(
            f"Starting investigation {investigation_id} for victim {victim_account} (dataset: {dataset_id})"
        )
        log_event(
            "TRACE_START",
            investigation_id=investigation_id,
            victim=victim_account,
            dataset=dataset_id,
        )

        # 1. Initialize traversal engine
        index_manager = ForensicIndexManager(dataset_id)
        traversal_engine = TemporalTraversalEngine(
            conn=self.conn,
            index_manager=index_manager,
            dataset_id=dataset_id,
        )

        # 2. Run bounded BFS traversal (strictly <= 4 hops)
        victim_tx, raw_edges = traversal_engine.traverse_four_hops(
            victim_account=victim_account,
            initial_tx_id=initial_tx_id,
            max_hops=max_hops,
            time_window_hours=time_window_hours,
            min_amount=min_amount,
        )

        # 2b. Fetch incoming transactions (accounts from which money came into this account)
        incoming_txs = traversal_engine.get_incoming_transactions(victim_account)

        # 3. Calculate financial amount lineage
        victim_amt = float(victim_tx["Amount"]) if victim_tx else 0.0
        if victim_amt <= 0.0 and incoming_txs:
            victim_amt = sum(e["amount"] for e in incoming_txs)

        lineage_edges = AmountLineageEngine.calculate_lineage(
            victim_amount=victim_amt,
            traversal_edges=raw_edges,
        )

        # Wrap incoming transactions into upstream edges
        upstream_edges: list[MoneyTrailEdge] = []
        for inc in incoming_txs:
            upstream_edges.append(
                MoneyTrailEdge(
                    hop=1,
                    record_id=inc["record_id"],
                    Transaction_ID=inc["Transaction_ID"],
                    from_account=inc["from_account"],
                    to_account=inc["to_account"],
                    amount=inc["amount"],
                    timestamp=inc["timestamp"],
                    payment_mode=inc["payment_mode"],
                    attributable_amount=inc["amount"],
                    lineage_status="traced",
                    is_cycle=False,
                    parent_record_id=None,
                    direction="upstream",
                    provenance=inc.get("provenance", {}),
                )
            )

        all_edges = upstream_edges + lineage_edges

        # 4. Construct graph object with all connected account IDs
        nodes_set: set[str] = {victim_account}
        total_attributed = 0.0
        max_hop_seen = 0

        for edge in all_edges:
            nodes_set.add(edge.from_account)
            nodes_set.add(edge.to_account)
            total_attributed += edge.attributable_amount
            if edge.hop > max_hop_seen:
                max_hop_seen = edge.hop

        graph_obj = MoneyTrailGraph(
            nodes=sorted(nodes_set),
            edges=all_edges,
            total_hops_found=max_hop_seen,
            total_attributed_amount=round(total_attributed, 2),
        )

        t1 = time.perf_counter()
        duration_ms = round((t1 - t0) * 1000, 2)

        params = InvestigationParameters(
            max_hops=min(max_hops, 4),
            time_window_hours=time_window_hours,
            min_amount=min_amount,
            rule_version="2.0.0",
        )

        # 5. Build evidence metadata with full provenance
        edge_record_ids = [e.record_id for e in all_edges]
        edge_tx_ids = [e.Transaction_ID for e in all_edges]
        evidence_meta = EvidenceMetadata(
            record_ids=edge_record_ids,
            transaction_ids=edge_tx_ids,
            lineage_rule="conservative_inflow_proportional",
            max_bounded_depth=4,
        )

        log_event(
            "TRACE_COMPLETED",
            investigation_id=investigation_id,
            victim=victim_account,
            hops_found=max_hop_seen,
            edges_count=len(all_edges),
            duration_ms=duration_ms,
        )

        return InvestigationTraceResponse(
            investigation_id=investigation_id,
            dataset_id=dataset_id,
            victim_account=victim_account,
            victim_transaction=victim_tx,
            parameters=params,
            money_trail=all_edges,
            graph=graph_obj,
            execution_time_ms=duration_ms,
            layer_candidates=[],
            risk_summary={},
            recovery_summary={},
            shared_infrastructure={},
            evidence_metadata=evidence_meta,
        )

