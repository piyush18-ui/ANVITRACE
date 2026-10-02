"""Adjacency and temporal indexes for fast multi-hop forensics.

Provides disk-persisted and memory-mappable index lookups for:
1. Account -> outgoing transactions (Sender_Account -> [record_id, timestamp, receiver, amount])
2. Account -> incoming transactions (Receiver_Account -> [record_id, timestamp, sender, amount])
3. Chronological transaction order by account
"""

from pathlib import Path
from typing import Any

import duckdb
import polars as pl

from app.config.settings import settings
from app.utils.logging import log_event, logger


class ForensicIndexManager:
    """Manages index creation, storage, and retrieval for a specific dataset."""

    def __init__(self, dataset_id: str, indexes_dir: Path | None = None):
        self.dataset_id = dataset_id
        self.indexes_dir = indexes_dir or (settings.project_root / settings.DATA_INDEXES_DIR)
        self.dataset_index_dir = self.indexes_dir / dataset_id
        self.dataset_index_dir.mkdir(parents=True, exist_ok=True)

        self.outgoing_index_path = self.dataset_index_dir / "outgoing_edges.parquet"
        self.incoming_index_path = self.dataset_index_dir / "incoming_edges.parquet"
        self.timeline_index_path = self.dataset_index_dir / "account_timeline.parquet"

    def build_indexes(self, conn: duckdb.DuckDBPyConnection) -> dict[str, Any]:
        """Build compact Parquet-based adjacency & timeline indexes directly from DuckDB.

        DuckDB efficiently queries and exports to Parquet without bloating Python memory.
        """
        logger.info(f"Building forensic indexes for dataset {self.dataset_id}...")
        log_event("INDEX_BUILD_START", dataset_id=self.dataset_id)

        # 1. Outgoing index: Sender_Account, record_id, Receiver_Account, Timestamp, Amount, Payment_Mode
        conn.execute(
            f"""
            COPY (
                SELECT
                    Sender_Account as account_id,
                    record_id,
                    Transaction_ID,
                    Receiver_Account as counterparty_account,
                    Timestamp,
                    Amount,
                    Payment_Mode
                FROM transactions
                WHERE dataset_id = '{self.dataset_id}'
                ORDER BY Sender_Account, Timestamp ASC
            ) TO '{self.outgoing_index_path.as_posix()}' (FORMAT PARQUET, COMPRESSION SNAPPY);
            """
        )

        # 2. Incoming index: Receiver_Account, record_id, Sender_Account, Timestamp, Amount, Payment_Mode
        conn.execute(
            f"""
            COPY (
                SELECT
                    Receiver_Account as account_id,
                    record_id,
                    Transaction_ID,
                    Sender_Account as counterparty_account,
                    Timestamp,
                    Amount,
                    Payment_Mode
                FROM transactions
                WHERE dataset_id = '{self.dataset_id}'
                ORDER BY Receiver_Account, Timestamp ASC
            ) TO '{self.incoming_index_path.as_posix()}' (FORMAT PARQUET, COMPRESSION SNAPPY);
            """
        )

        # 3. Account timeline index: Combined chronologically ordered transaction reference
        conn.execute(
            f"""
            COPY (
                SELECT
                    account_id,
                    record_id,
                    counterparty_account,
                    Timestamp,
                    Amount,
                    direction,
                    Payment_Mode
                FROM (
                    SELECT
                        Sender_Account as account_id,
                        record_id,
                        Receiver_Account as counterparty_account,
                        Timestamp,
                        Amount,
                        'OUT' as direction,
                        Payment_Mode
                    FROM transactions
                    WHERE dataset_id = '{self.dataset_id}'
                    UNION ALL
                    SELECT
                        Receiver_Account as account_id,
                        record_id,
                        Sender_Account as counterparty_account,
                        Timestamp,
                        Amount,
                        'IN' as direction,
                        Payment_Mode
                    FROM transactions
                    WHERE dataset_id = '{self.dataset_id}'
                )
                ORDER BY account_id
            ) TO '{self.timeline_index_path.as_posix()}' (FORMAT PARQUET, COMPRESSION SNAPPY);
            """
        )

        log_event("INDEX_BUILD_COMPLETE", dataset_id=self.dataset_id)
        return {
            "outgoing_index": str(self.outgoing_index_path),
            "incoming_index": str(self.incoming_index_path),
            "timeline_index": str(self.timeline_index_path),
        }

    def get_outgoing_edges(self, account_id: str) -> pl.DataFrame:
        """Fetch all outgoing edges for an account using lazy scan on Parquet index."""
        if not self.outgoing_index_path.exists():
            return pl.DataFrame()
        return (
            pl.scan_parquet(str(self.outgoing_index_path))
            .filter(pl.col("account_id") == account_id)
            .sort("Timestamp")
            .collect()
        )

    def get_incoming_edges(self, account_id: str) -> pl.DataFrame:
        """Fetch all incoming edges for an account using lazy scan on Parquet index."""
        if not self.incoming_index_path.exists():
            return pl.DataFrame()
        return (
            pl.scan_parquet(str(self.incoming_index_path))
            .filter(pl.col("account_id") == account_id)
            .sort("Timestamp")
            .collect()
        )

    def get_account_timeline(self, account_id: str) -> pl.DataFrame:
        """Fetch full chronological transaction timeline for an account."""
        if not self.timeline_index_path.exists():
            return pl.DataFrame()
        return (
            pl.scan_parquet(str(self.timeline_index_path))
            .filter(pl.col("account_id") == account_id)
            .sort("Timestamp")
            .collect()
        )
