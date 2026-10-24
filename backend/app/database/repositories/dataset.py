"""Database repository for dataset and ingestion metadata."""

from datetime import datetime
from typing import Any

import duckdb

from app.schemas.dataset import DatasetStatisticsResponse, DatasetStatusResponse


class DatasetRepository:
    """Handles CRUD queries on datasets and ingestion_runs tables."""

    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn

    def create_dataset(
        self,
        dataset_id: str,
        dataset_hash: str,
        filename: str,
        schema_version: str,
        normalization_version: str,
    ) -> None:
        """Register a new dataset entry in DuckDB."""
        self.conn.execute(
            """
            INSERT INTO datasets (
                dataset_id, dataset_hash, filename, schema_version,
                normalization_version, status, uploaded_at
            ) VALUES (?, ?, ?, ?, ?, 'PROCESSING', CURRENT_TIMESTAMP)
            ON CONFLICT (dataset_id) DO NOTHING
            """,
            [dataset_id, dataset_hash, filename, schema_version, normalization_version],
        )

    def update_dataset_metrics(
        self,
        dataset_id: str,
        total_rows: int,
        valid_rows: int,
        invalid_rows: int,
        repeated_tx_ids: int,
        exact_duplicates: int,
        status: str,
    ) -> None:
        """Update row counts and status for a dataset."""
        self.conn.execute(
            """
            UPDATE datasets SET
                total_rows = ?,
                valid_rows = ?,
                invalid_rows = ?,
                repeated_tx_ids = ?,
                exact_duplicates = ?,
                status = ?
            WHERE dataset_id = ?
            """,
            [
                total_rows,
                valid_rows,
                invalid_rows,
                repeated_tx_ids,
                exact_duplicates,
                status,
                dataset_id,
            ],
        )

    def record_ingestion_run(
        self,
        run_id: str,
        dataset_id: str,
        start_time: datetime,
        end_time: datetime,
        duration_seconds: float,
        rows_per_second: float,
        status: str,
        error_message: str | None = None,
        peak_memory_mb: float | None = None,
    ) -> None:
        """Persist detailed metrics for an ingestion run."""
        self.conn.execute(
            """
            INSERT INTO ingestion_runs (
                run_id, dataset_id, start_time, end_time,
                duration_seconds, rows_per_second, status, error_message, peak_memory_mb
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                run_id,
                dataset_id,
                start_time,
                end_time,
                duration_seconds,
                rows_per_second,
                status,
                error_message,
                peak_memory_mb,
            ],
        )

    def get_latest_dataset(self) -> dict[str, Any] | None:
        """Fetch the most recently ingested dataset."""
        result = self.conn.execute(
            """
            SELECT dataset_id, dataset_hash, filename, total_rows, valid_rows,
                   invalid_rows, repeated_tx_ids, exact_duplicates, schema_version,
                   normalization_version, uploaded_at, status
            FROM datasets
            ORDER BY uploaded_at DESC
            LIMIT 1
            """
        ).fetchone()

        if not result:
            return None

        cols = [
            "dataset_id",
            "dataset_hash",
            "filename",
            "total_rows",
            "valid_rows",
            "invalid_rows",
            "repeated_tx_ids",
            "exact_duplicates",
            "schema_version",
            "normalization_version",
            "uploaded_at",
            "status",
        ]
        return dict(zip(cols, result))

    def get_dataset(self, dataset_id: str) -> dict[str, Any] | None:
        """Fetch dataset metadata by ID."""
        result = self.conn.execute(
            """
            SELECT dataset_id, dataset_hash, filename, total_rows, valid_rows,
                   invalid_rows, repeated_tx_ids, exact_duplicates, schema_version,
                   normalization_version, uploaded_at, status
            FROM datasets
            WHERE dataset_id = ?
            """,
            [dataset_id],
        ).fetchone()

        if not result:
            return None

        cols = [
            "dataset_id",
            "dataset_hash",
            "filename",
            "total_rows",
            "valid_rows",
            "invalid_rows",
            "repeated_tx_ids",
            "exact_duplicates",
            "schema_version",
            "normalization_version",
            "uploaded_at",
            "status",
        ]
        return dict(zip(cols, result))

    def get_dataset_status(self, dataset_id: str) -> DatasetStatusResponse | None:
        """Return status response with ingestion run metrics."""
        ds = self.get_dataset(dataset_id)
        if not ds:
            return None

        run = self.conn.execute(
            """
            SELECT duration_seconds, rows_per_second, error_message
            FROM ingestion_runs
            WHERE dataset_id = ?
            ORDER BY start_time DESC
            LIMIT 1
            """,
            [dataset_id],
        ).fetchone()

        duration = run[0] if run else None
        rps = run[1] if run else None
        err = run[2] if run else None

        return DatasetStatusResponse(
            dataset_id=ds["dataset_id"],
            dataset_hash=ds["dataset_hash"],
            filename=ds["filename"],
            status=ds["status"],
            total_rows=ds["total_rows"],
            valid_rows=ds["valid_rows"],
            invalid_rows=ds["invalid_rows"],
            uploaded_at=ds["uploaded_at"],
            duration_seconds=duration,
            rows_per_second=rps,
            error_message=err,
        )

    def get_dataset_statistics(self, dataset_id: str) -> DatasetStatisticsResponse | None:
        """Compute analytical statistics for the dataset."""
        ds = self.get_dataset(dataset_id)
        if not ds:
            return None

        # Distinct senders & receivers, total accounts
        stats = self.conn.execute(
            """
            SELECT
                COUNT(DISTINCT Sender_Account) as distinct_senders,
                COUNT(DISTINCT Receiver_Account) as distinct_receivers,
                SUM(Amount) as total_volume
            FROM transactions
            WHERE dataset_id = ?
            """,
            [dataset_id],
        ).fetchone()

        distinct_senders = stats[0] or 0
        distinct_receivers = stats[1] or 0
        total_vol = float(stats[2] or 0.0)

        # Total accounts across both sides
        acc_count = self.conn.execute(
            """
            SELECT COUNT(*) FROM (
                SELECT Sender_Account as acc FROM transactions WHERE dataset_id = ?
                UNION
                SELECT Receiver_Account as acc FROM transactions WHERE dataset_id = ?
            )
            """,
            [dataset_id, dataset_id],
        ).fetchone()[0]

        # Payment mode breakdown
        modes = self.conn.execute(
            """
            SELECT Payment_Mode, COUNT(*)
            FROM transactions
            WHERE dataset_id = ?
            GROUP BY Payment_Mode
            """,
            [dataset_id],
        ).fetchall()
        payment_distribution = {row[0]: row[1] for row in modes}

        # Ingestion run duration
        run = self.conn.execute(
            """
            SELECT duration_seconds, rows_per_second, peak_memory_mb
            FROM ingestion_runs
            WHERE dataset_id = ?
            ORDER BY start_time DESC
            LIMIT 1
            """,
            [dataset_id],
        ).fetchone()

        duration = run[0] if run else None
        rps = run[1] if run else None
        mem = run[2] if run else None

        return DatasetStatisticsResponse(
            dataset_id=ds["dataset_id"],
            dataset_hash=ds["dataset_hash"],
            filename=ds["filename"],
            total_rows=ds["total_rows"],
            valid_rows=ds["valid_rows"],
            invalid_rows=ds["invalid_rows"],
            repeated_tx_ids=ds["repeated_tx_ids"],
            exact_duplicates=ds["exact_duplicates"],
            schema_version=ds["schema_version"],
            normalization_version=ds["normalization_version"],
            uploaded_at=ds["uploaded_at"],
            status=ds["status"],
            distinct_senders=distinct_senders,
            distinct_receivers=distinct_receivers,
            total_accounts=acc_count,
            total_volume_inr=total_vol,
            payment_mode_distribution=payment_distribution,
            ingestion_duration_seconds=duration,
            rows_per_second=rps,
            peak_memory_mb=mem,
        )
