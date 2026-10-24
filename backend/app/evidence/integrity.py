"""Evidence integrity verification, single-pass streaming hashing, and manifest validation.

CONSTRAINTS:
- Single-pass 8 MB streaming hash while saving uploaded files.
- Files set to read-only post-write with fsync.
- Candidates for verify-by-upload are streamed and hashed in memory (never written to disk).
- Append-only database operations: NEVER UPDATE or DELETE against evidence_files.
- Status values strictly: VERIFIED, MISMATCH, MISSING.
- Neutral forensic wording: never use the word "tampered".
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import stat
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, BinaryIO

import duckdb

from app.config.settings import settings
from app.evidence.audit import AuditService

CHUNK_SIZE = 8 * 1024 * 1024  # 8 MB chunks


def sha256_file(filepath: Path | str) -> tuple[str, int]:
    """Compute SHA-256 hash and byte size of a file in 8 MB chunks.

    Returns:
        (hex_digest, total_bytes)
    """
    path = Path(filepath)
    if not path.is_file():
        raise FileNotFoundError(f"File not found: {path}")

    hasher = hashlib.sha256()
    total_bytes = 0

    with open(path, "rb") as f:
        while True:
            chunk = f.read(CHUNK_SIZE)
            if not chunk:
                break
            hasher.update(chunk)
            total_bytes += len(chunk)

    return hasher.hexdigest(), total_bytes


def stream_hash_candidate(file_stream: BinaryIO) -> tuple[str, int]:
    """Compute SHA-256 and byte size of an incoming stream without saving to disk.

    Candidate is hashed only: NOT stored, NOT ingested.
    """
    hasher = hashlib.sha256()
    total_bytes = 0

    while True:
        chunk = file_stream.read(CHUNK_SIZE)
        if not chunk:
            break
        hasher.update(chunk)
        total_bytes += len(chunk)

    return hasher.hexdigest(), total_bytes


def set_file_readonly(path: Path) -> None:
    """Make the stored evidence file read-only across OS platforms."""
    try:
        # Remove write permissions for user, group, and others
        current_mode = path.stat().st_mode
        readonly_mode = current_mode & ~(stat.S_IWUSR | stat.S_IWGRP | stat.S_IWOTH)
        os.chmod(path, readonly_mode)
    except Exception:
        # Best effort on platforms with restrictive file permission APIs
        pass


class EvidenceIntegrityService:
    """Manages physical evidence registration, integrity re-verification, and manifest checks."""

    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn
        self.audit_service = AuditService(conn)

    def save_and_hash_upload(
        self,
        file_stream: BinaryIO,
        filename: str,
        dest_dir: Path | None = None,
        actor: str = "investigator",
    ) -> dict[str, Any]:
        """Save upload in 8 MB chunks WHILE hashing in a single pass, fsync, and mark read-only."""
        target_dir = dest_dir or (settings.project_root / settings.DATA_EVIDENCE_DIR)
        target_dir.mkdir(parents=True, exist_ok=True)

        # Generate a unique storage name to prevent overwriting existing files
        clean_filename = Path(filename).name
        evidence_id = f"ev_{uuid.uuid4().hex[:12]}"
        storage_path = target_dir / f"{evidence_id}_{clean_filename}"

        hasher = hashlib.sha256()
        total_bytes = 0

        # Single-pass streaming write and hash
        with open(storage_path, "wb") as out_file:
            while True:
                chunk = file_stream.read(CHUNK_SIZE)
                if not chunk:
                    break
                out_file.write(chunk)
                hasher.update(chunk)
                total_bytes += len(chunk)
            out_file.flush()
            os.fsync(out_file.fileno())

        # Set saved original read-only
        set_file_readonly(storage_path)

        calculated_sha256 = hasher.hexdigest()

        # Check for same filename with different hash
        same_name_row = self.conn.execute(
            f"""
            SELECT evidence_id, sha256, storage_path
            FROM evidence_files
            WHERE filename = '{clean_filename.replace("'", "''")}'
            ORDER BY recorded_at DESC LIMIT 1
            """
        ).fetchone()

        warning_info = None
        if same_name_row:
            existing_eid, existing_sha, _ = same_name_row
            if not hmac.compare_digest(existing_sha.lower(), calculated_sha256.lower()):
                warning_info = {
                    "warning": "SAME_FILENAME_DIFFERENT_CONTENT",
                    "existing_evidence_id": existing_eid,
                    "existing_sha256": existing_sha,
                    "new_sha256": calculated_sha256,
                    "message": "Same filename, different content. Compare with the registered original?",
                }
                self.audit_service.append_event(
                    action="DUPLICATE_NAME_DIFFERENT_HASH",
                    entity_type="evidence_file",
                    entity_id=evidence_id,
                    actor=actor,
                    details={
                        "filename": clean_filename,
                        "existing_evidence_id": existing_eid,
                        "existing_sha256": existing_sha,
                        "new_sha256": calculated_sha256,
                    },
                )

        # Check trusted manifest
        manifest_warning = self.check_trusted_manifest(clean_filename, calculated_sha256)

        # Register in evidence_files (Append-only)
        self.register_evidence(
            evidence_id=evidence_id,
            dataset_id=None,
            filename=clean_filename,
            storage_path=str(storage_path),
            size_bytes=total_bytes,
            sha256=calculated_sha256,
            actor=actor,
        )

        return {
            "evidence_id": evidence_id,
            "filename": clean_filename,
            "storage_path": str(storage_path),
            "size_bytes": total_bytes,
            "sha256": calculated_sha256,
            "warning": warning_info,
            "manifest_warning": manifest_warning,
        }

    def register_evidence(
        self,
        evidence_id: str,
        filename: str,
        storage_path: str,
        size_bytes: int,
        sha256: str,
        dataset_id: str | None = None,
        actor: str = "investigator",
    ) -> None:
        """Register physical evidence record in append-only table."""
        clean_fn = filename.replace("'", "''")
        clean_sp = storage_path.replace("'", "''")
        if dataset_id:
            safe_ds = dataset_id.replace("'", "''")
            ds_val = f"'{safe_ds}'"
        else:
            ds_val = "NULL"

        self.conn.execute(
            f"""
            INSERT INTO evidence_files (evidence_id, dataset_id, filename, storage_path, size_bytes, algorithm, sha256)
            VALUES ('{evidence_id}', {ds_val}, '{clean_fn}', '{clean_sp}', {size_bytes}, 'SHA-256', '{sha256}')
            """
        )

        self.audit_service.append_event(
            action="EVIDENCE_REGISTERED",
            entity_type="evidence_file",
            entity_id=evidence_id,
            actor=actor,
            details={
                "filename": filename,
                "size_bytes": size_bytes,
                "sha256": sha256,
                "storage_path": storage_path,
            },
        )

    def check_trusted_manifest(self, filename: str, calculated_sha256: str) -> dict[str, Any] | None:
        """Validate file against optional data/trusted_manifest.json."""
        manifest_setting = Path(settings.TRUSTED_MANIFEST_PATH)
        manifest_path = manifest_setting if manifest_setting.is_absolute() else (settings.project_root / manifest_setting)
        if not manifest_path.exists():
            return None

        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
        except Exception:
            return None

        if filename in manifest:
            expected_sha = manifest[filename]
            # Manifest can store string hash or dict with hash and expected rows
            if isinstance(expected_sha, dict):
                expected_hash = expected_sha.get("sha256", "")
                expected_rows = expected_sha.get("expected_rows")
            else:
                expected_hash = str(expected_sha)
                expected_rows = None

            is_match = bool(expected_hash and hmac.compare_digest(expected_hash.lower(), calculated_sha256.lower()))
            if not is_match:
                return {
                    "in_manifest": True,
                    "matches_manifest": False,
                    "warning": "DIFFERS_FROM_TRUSTED_ORIGINAL",
                    "filename": filename,
                    "expected_sha256": expected_hash,
                    "calculated_sha256": calculated_sha256,
                    "expected_rows": expected_rows,
                    "message": "File differs from the trusted baseline manifest. Ingestion requires explicit authorization.",
                }
            return {
                "in_manifest": True,
                "matches_manifest": True,
                "filename": filename,
                "expected_sha256": expected_hash,
                "calculated_sha256": calculated_sha256,
                "expected_rows": expected_rows,
            }

        return None

    def verify_evidence(
        self,
        evidence_id: str,
        actor: str = "investigator",
    ) -> dict[str, Any]:
        """Recompute hash of stored file, compare with recorded baseline, insert verification event."""
        row = self.conn.execute(
            f"""
            SELECT evidence_id, filename, storage_path, size_bytes, sha256
            FROM evidence_files
            WHERE evidence_id = '{evidence_id.replace("'", "''")}'
            """
        ).fetchone()

        if not row:
            return {
                "evidence_id": evidence_id,
                "status": "MISSING",
                "note": f"Evidence record '{evidence_id}' does not exist in registry.",
                "recorded_sha256": None,
                "recomputed_sha256": None,
            }

        eid, filename, storage_path, recorded_size, recorded_sha = row
        path = Path(storage_path)

        if not path.is_file():
            event_id = f"ve_{uuid.uuid4().hex[:12]}"
            note = f"Stored file not found on disk at {storage_path}"
            self.conn.execute(
                f"""
                INSERT INTO verification_events (event_id, evidence_id, recomputed_sha256, status, note)
                VALUES ('{event_id}', '{eid}', 'FILE_MISSING', 'MISSING', '{note.replace("'", "''")}')
                """
            )
            self.audit_service.append_event(
                action="EVIDENCE_VERIFIED",
                entity_type="evidence_file",
                entity_id=eid,
                actor=actor,
                details={"status": "MISSING", "note": note},
            )
            return {
                "evidence_id": eid,
                "filename": filename,
                "status": "MISSING",
                "recorded_sha256": recorded_sha,
                "recomputed_sha256": None,
                "recorded_size": recorded_size,
                "current_size": None,
                "note": note,
            }

        recomputed_sha, current_size = sha256_file(path)
        is_match = (
            hmac.compare_digest(recorded_sha.lower(), recomputed_sha.lower())
            and current_size == recorded_size
        )
        status = "VERIFIED" if is_match else "MISMATCH"
        note = (
            "Stored file hash and size match recorded digest exactly."
            if is_match
            else "Stored file differs from recorded digest; review required."
        )

        event_id = f"ve_{uuid.uuid4().hex[:12]}"
        self.conn.execute(
            f"""
            INSERT INTO verification_events (event_id, evidence_id, recomputed_sha256, status, note)
            VALUES ('{event_id}', '{eid}', '{recomputed_sha}', '{status}', '{note.replace("'", "''")}')
            """
        )

        self.audit_service.append_event(
            action="EVIDENCE_VERIFIED",
            entity_type="evidence_file",
            entity_id=eid,
            actor=actor,
            details={
                "status": status,
                "recomputed_sha256": recomputed_sha,
                "current_size": current_size,
                "note": note,
            },
        )

        return {
            "evidence_id": eid,
            "filename": filename,
            "status": status,
            "recorded_sha256": recorded_sha,
            "recomputed_sha256": recomputed_sha,
            "sha256": recomputed_sha,
            "recorded_size": recorded_size,
            "current_size": current_size,
            "note": note,
        }

    def verify_upload(
        self,
        evidence_id: str,
        file_stream: BinaryIO,
        actor: str = "investigator",
    ) -> dict[str, Any]:
        """Stream and verify candidate file against recorded baseline without saving to disk."""
        row = self.conn.execute(
            f"""
            SELECT evidence_id, filename, size_bytes, sha256
            FROM evidence_files
            WHERE evidence_id = '{evidence_id.replace("'", "''")}'
            """
        ).fetchone()

        if not row:
            return {
                "evidence_id": evidence_id,
                "status": "MISSING",
                "note": f"Evidence record '{evidence_id}' does not exist in registry.",
                "recorded_sha256": None,
                "recomputed_sha256": None,
            }

        eid, filename, recorded_size, recorded_sha = row

        # Stream candidate in 8 MB chunks; NOT stored, NOT ingested
        candidate_sha, candidate_size = stream_hash_candidate(file_stream)

        is_match = (
            hmac.compare_digest(recorded_sha.lower(), candidate_sha.lower())
            and candidate_size == recorded_size
        )
        status = "VERIFIED" if is_match else "MISMATCH"
        note = (
            "Uploaded candidate matches the recorded baseline digest exactly."
            if is_match
            else "uploaded file differs from recorded digest; review required"
        )

        event_id = f"ve_{uuid.uuid4().hex[:12]}"
        self.conn.execute(
            f"""
            INSERT INTO verification_events (event_id, evidence_id, recomputed_sha256, status, note)
            VALUES ('{event_id}', '{eid}', '{candidate_sha}', '{status}', '{note.replace("'", "''")}')
            """
        )

        self.audit_service.append_event(
            action="EVIDENCE_VERIFIED_BY_UPLOAD",
            entity_type="evidence_file",
            entity_id=eid,
            actor=actor,
            details={
                "status": status,
                "candidate_size": candidate_size,
                "candidate_sha256": candidate_sha,
                "note": note,
            },
        )

        return {
            "evidence_id": eid,
            "filename": filename,
            "status": status,
            "recorded_sha256": recorded_sha,
            "recomputed_sha256": candidate_sha,
            "recorded_size": recorded_size,
            "candidate_size": candidate_size,
            "note": note,
        }

    def get_verification_history(self, evidence_id: str) -> list[dict[str, Any]]:
        """Retrieve full chronological verification history for an evidence file."""
        rows = self.conn.execute(
            f"""
            SELECT event_id, strftime(checked_at, '%Y-%m-%d %H:%M:%S'), recomputed_sha256, status, note
            FROM verification_events
            WHERE evidence_id = '{evidence_id.replace("'", "''")}'
            ORDER BY checked_at DESC
            """
        ).fetchall()

        return [
            {
                "event_id": r[0],
                "checked_at": r[1],
                "recomputed_sha256": r[2],
                "status": r[3],
                "note": r[4],
            }
            for r in rows
        ]

    def get_evidence_details(self, evidence_id: str) -> dict[str, Any] | None:
        """Fetch evidence file details and latest verification status."""
        row = self.conn.execute(
            f"""
            SELECT e.evidence_id, e.dataset_id, e.filename, e.storage_path, e.size_bytes, e.algorithm, e.sha256, strftime(e.recorded_at, '%Y-%m-%d %H:%M:%S'),
                   (SELECT status FROM verification_events v WHERE v.evidence_id = e.evidence_id ORDER BY checked_at DESC LIMIT 1) AS last_status
            FROM evidence_files e
            WHERE e.evidence_id = '{evidence_id.replace("'", "''")}'
            """
        ).fetchone()

        if not row:
            return None

        return {
            "evidence_id": row[0],
            "dataset_id": row[1],
            "filename": row[2],
            "storage_path": row[3],
            "size_bytes": row[4],
            "algorithm": row[5],
            "sha256": row[6],
            "recorded_at": row[7],
            "last_verification_status": row[8] or "UNVERIFIED",
        }

    def list_evidence(self, dataset_id: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
        """List registered evidence files with their latest verification status."""
        if dataset_id:
            safe_ds = dataset_id.replace("'", "''")
            where_clause = f"WHERE e.dataset_id = '{safe_ds}'"
        else:
            where_clause = ""
        rows = self.conn.execute(
            f"""
            SELECT e.evidence_id, e.dataset_id, e.filename, e.storage_path, e.size_bytes, e.algorithm, e.sha256, strftime(e.recorded_at, '%Y-%m-%d %H:%M:%S'),
                   (SELECT status FROM verification_events v WHERE v.evidence_id = e.evidence_id ORDER BY checked_at DESC LIMIT 1) AS last_status
            FROM evidence_files e
            {where_clause}
            ORDER BY e.recorded_at DESC
            LIMIT {int(limit)}
            """
        ).fetchall()
        return [
            {
                "evidence_id": r[0],
                "dataset_id": r[1],
                "filename": r[2],
                "storage_path": r[3],
                "size_bytes": r[4],
                "algorithm": r[5],
                "sha256": r[6],
                "recorded_at": r[7],
                "last_verification_status": r[8] or "UNVERIFIED",
            }
            for r in rows
        ]

    def get_latest_evidence(self, dataset_id: str | None = None) -> dict[str, Any] | None:
        """Get the most recently recorded evidence file."""
        items = self.list_evidence(dataset_id=dataset_id, limit=1)
        return items[0] if items else None
