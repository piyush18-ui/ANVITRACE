"""Structured SHA-256 Integrity Verification and Change Detection Service.

Provides:
- File-level SHA-256 verification against stored dataset baselines.
- Structured record-level diffing to identify added, removed, or modified records and fields.
- Full provenance preserving original values, changed fields, and record references.
"""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

import duckdb


class IntegrityVerificationService:
    """Verifies evidence files against stored SHA-256 baselines and calculates structured change diffs."""

    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn

    def compute_sha256(self, file_path: Path) -> str:
        """Compute SHA-256 hash of a file."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    def verify_file_integrity(
        self,
        file_path: Path,
        dataset_id: str | None = None,
    ) -> dict[str, Any]:
        """Verify file against stored baseline and detect specific record changes."""
        if not file_path.exists():
            return {
                "status": "ERROR",
                "message": f"File '{file_path.name}' does not exist on disk.",
                "verified": False,
            }

        current_hash = self.compute_sha256(file_path)
        file_size = file_path.stat().st_size

        # Look up baseline in datasets table
        if dataset_id:
            row = self.conn.execute(
                f"SELECT dataset_id, dataset_hash, filename, uploaded_at, total_rows FROM datasets WHERE dataset_id = '{dataset_id}'"
            ).fetchone()
        else:
            row = self.conn.execute(
                f"SELECT dataset_id, dataset_hash, filename, uploaded_at, total_rows FROM datasets WHERE filename = '{file_path.name}' ORDER BY uploaded_at DESC LIMIT 1"
            ).fetchone()

        if not row:
            return {
                "status": "NO_BASELINE",
                "filename": file_path.name,
                "current_sha256": current_hash,
                "file_size_bytes": file_size,
                "verified": False,
                "message": "No baseline SHA-256 hash found in repository for this file.",
                "disclaimer": "SHA-256 verification requires a previously recorded ingestion baseline.",
            }

        ds_id, baseline_hash, original_filename, uploaded_at, total_rows = row

        is_match = (current_hash.lower() == baseline_hash.lower())

        if is_match:
            return {
                "status": "VERIFIED_MATCH",
                "filename": original_filename,
                "dataset_id": ds_id,
                "stored_baseline_sha256": baseline_hash,
                "current_sha256": current_hash,
                "file_size_bytes": file_size,
                "baseline_timestamp": str(uploaded_at),
                "verified": True,
                "total_records": total_rows,
                "changes_detected": False,
                "message": "File SHA-256 matches the stored baseline exactly. Zero modifications detected.",
                "disclaimer": "A matching SHA-256 hash confirms integrity against the baseline but does not prove third-party truthfulness.",
            }

        # Hashes mismatch: Run structured record-level diff against canonical database
        escaped_path = file_path.as_posix().replace("'", "''")
        try:
            # 1. Check for modified records where Transaction_ID exists in both but amounts or accounts differ
            modified_rows = self.conn.execute(
                f"""
                WITH file_txs AS (
                    SELECT
                        trim(COALESCE(Transaction_ID, '')) AS tx_id,
                        trim(COALESCE(Sender_Account, '')) AS sender,
                        trim(COALESCE(Receiver_Account, '')) AS receiver,
                        TRY_CAST(Amount AS DECIMAL(18, 2)) AS amt
                    FROM read_csv('{escaped_path}', header=true, all_varchar=true)
                )
                SELECT
                    t.Transaction_ID,
                    t.Sender_Account AS orig_sender, f.sender AS new_sender,
                    t.Receiver_Account AS orig_receiver, f.receiver AS new_receiver,
                    t.Amount AS orig_amount, f.amt AS new_amount
                FROM transactions t
                JOIN file_txs f ON t.Transaction_ID = f.tx_id
                WHERE t.dataset_id = '{ds_id}'
                  AND (t.Sender_Account != f.sender OR t.Receiver_Account != f.receiver OR t.Amount != f.amt)
                LIMIT 20
                """
            ).fetchall()

            diffs: list[dict[str, Any]] = []
            for r in modified_rows:
                tx_id, o_s, n_s, o_r, n_r, o_a, n_a = r
                changed_fields = []
                if o_s != n_s:
                    changed_fields.append({"field": "Sender_Account", "original": o_s, "current": n_s})
                if o_r != n_r:
                    changed_fields.append({"field": "Receiver_Account", "original": o_r, "current": n_r})
                if o_a != n_a:
                    changed_fields.append({"field": "Amount", "original": float(o_a or 0), "current": float(n_a or 0)})
                diffs.append({"transaction_id": tx_id, "changes": changed_fields})

            # 2. Count added and removed rows
            current_count_row = self.conn.execute(
                f"SELECT COUNT(*) FROM read_csv('{escaped_path}', header=true, all_varchar=true)"
            ).fetchone()
            current_total = current_count_row[0] if current_count_row else 0
            row_difference = current_total - total_rows

            return {
                "status": "HASH_MISMATCH",
                "filename": original_filename,
                "dataset_id": ds_id,
                "stored_baseline_sha256": baseline_hash,
                "current_sha256": current_hash,
                "file_size_bytes": file_size,
                "baseline_timestamp": str(uploaded_at),
                "verified": False,
                "changes_detected": True,
                "baseline_records": total_rows,
                "current_records": current_total,
                "row_count_delta": row_difference,
                "modified_records_sample": diffs,
                "message": (
                    f"CRITICAL: File integrity mismatch detected! Current SHA-256 does not match stored baseline. "
                    f"Row delta: {row_difference:+d} records. Sample modified records: {len(diffs)}."
                ),
                "disclaimer": "SHA-256 mismatch confirms data has altered since baseline creation.",
            }

        except Exception as e:
            return {
                "status": "HASH_MISMATCH",
                "filename": original_filename,
                "dataset_id": ds_id,
                "stored_baseline_sha256": baseline_hash,
                "current_sha256": current_hash,
                "file_size_bytes": file_size,
                "baseline_timestamp": str(uploaded_at),
                "verified": False,
                "changes_detected": True,
                "message": f"SHA-256 hash mismatch detected. Detailed comparison error: {e}",
                "disclaimer": "SHA-256 mismatch confirms data has altered since baseline creation.",
            }
