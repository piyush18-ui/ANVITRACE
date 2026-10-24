"""Operation Abhedya-Chakra: Evidence Integrity & Judge-Demo Flow.

Demonstrates the complete end-to-end evidence integrity layer:
  1. Generate a ~5,000-row synthetic CSV (clearly labelled synthetic).
  2. Upload/register the original dataset -> SHA-256 recorded in single-pass streaming.
  3. Verify the stored original -> VERIFIED (baseline control).
  4. Write an edited COPY of the file with rows deleted. The original is NEVER modified.
  5. Verify candidate edited copy via streaming upload -> MISMATCH with both hashes shown.
  6. Verify candidate original copy via streaming upload -> VERIFIED (control check).
  7. Print verification history log (append-only table).
  8. Verify tamper-evident HMAC-SHA256 audit chain (Intact).
  9. Directly tamper with one audit_log row in the database.
 10. Re-verify audit chain -> Detects tampering and reports "Broken at #N".

Run:
  py -3.11 scripts/demo_integrity_flow.py
"""

import io
import os
import random
import sys
import time
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import duckdb
from app.config.settings import settings
from app.database.schema import apply_schema
from app.evidence.audit import AuditService, get_audit_key
from app.evidence.integrity import EvidenceIntegrityService, sha256_file


def print_banner(text: str, color_code: str = "36") -> None:
    border = "=" * 80
    print(f"\033[1;{color_code}m\n{border}\n  {text}\n{border}\033[0m")


def print_step(step_num: int, title: str) -> None:
    print(f"\033[1;33m\n[STEP {step_num}] {title}\033[0m")


def main() -> None:
    print_banner("ANVITRACE: OPERATION ABHEDYA-CHAKRA", "35")
    print("\033[1;37mOffline-First Cyber-Forensics Evidence Integrity & Judge-Demo Flow\033[0m")
    print(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")
    print(f"Python: {sys.version.split()[0]} | OS: {sys.platform}")

    # Ensure AUDIT_KEY is present
    try:
        audit_key = get_audit_key()
        print(f"Cryptographic AUDIT_KEY: [Configured - {len(audit_key)} chars]")
    except Exception as e:
        print(f"\033[1;31mError: {e}\033[0m")
        sys.exit(1)

    # Initialize isolated DuckDB demo instance
    demo_dir = settings.project_root / "data" / "demo"
    demo_dir.mkdir(parents=True, exist_ok=True)
    demo_db_path = demo_dir / "demo_integrity.duckdb"
    if demo_db_path.exists():
        try:
            demo_db_path.unlink()
        except Exception:
            pass

    conn = duckdb.connect(str(demo_db_path))
    apply_schema(conn)

    integrity_svc = EvidenceIntegrityService(conn)
    audit_svc = AuditService(conn)

    # -------------------------------------------------------------------------
    # STEP 1: Generate Synthetic Dataset (~5,000 rows)
    # -------------------------------------------------------------------------
    print_step(1, "Generate ~5,000-Row Synthetic CSV (Clearly Labelled Synthetic)")

    orig_csv_path = demo_dir / "synthetic_banking_evidence_original.csv"

    header = "Transaction_ID,Timestamp,Sender_Account,Sender_Name,Sender_Bank,Receiver_Account,Receiver_Name,Receiver_Bank,Amount,Payment_Mode,Status\n"

    banks = ["SBIN0001234", "HDFC0005678", "ICIC0009999", "PUNB0001111", "AXIS0002222"]
    modes = ["UPI", "IMPS", "NEFT", "RTGS"]

    num_rows = 5000
    gen_start = time.perf_counter()
    with open(orig_csv_path, "w", encoding="utf-8") as f:
        f.write(header)
        for i in range(1, num_rows + 1):
            tx_id = f"SYNTH_TX_{i:06d}"
            ts = f"2026-03-01 {10 + (i // 600):02d}:{(i // 10) % 60:02d}:{i % 60:02d}"
            sender_acc = f"ACC_SYNTH_{1000 + (i % 200)}"
            receiver_acc = f"ACC_SYNTH_{2000 + ((i * 7) % 300)}"
            amount = round(random.uniform(500.0, 150000.0), 2)
            bank_s = banks[i % len(banks)]
            bank_r = banks[(i + 1) % len(banks)]
            mode = modes[i % len(modes)]
            f.write(f"{tx_id},{ts},{sender_acc},SyntheticSender_{i%50},{bank_s},{receiver_acc},SyntheticReceiver_{i%50},{bank_r},{amount:.2f},{mode},SUCCESS\n")

    gen_time = time.perf_counter() - gen_start
    file_size_bytes = orig_csv_path.stat().st_size
    print(f"Generated file: {orig_csv_path.name}")
    print(f"Total Rows:     {num_rows:,} synthetic transactions")
    print(f"File Size:      {file_size_bytes:,} bytes ({file_size_bytes / (1024 * 1024):.2f} MB)")
    print(f"Elapsed Time:   {gen_time * 1000:.1f} ms")

    # -------------------------------------------------------------------------
    # STEP 2: Ingest & Register Evidence (Streaming 8MB chunk hash + fsync + read-only)
    # -------------------------------------------------------------------------
    print_step(2, "Upload Dataset -> Streaming Hash & Immutable Registration")

    evidence_store_dir = demo_dir / "evidence_store"
    evidence_store_dir.mkdir(parents=True, exist_ok=True)

    stream_start = time.perf_counter()
    with open(orig_csv_path, "rb") as f_in:
        upload_record = integrity_svc.save_and_hash_upload(
            file_stream=f_in,
            filename=orig_csv_path.name,
            dest_dir=evidence_store_dir,
            actor="judge_demo_officer",
        )
    stream_time = time.perf_counter() - stream_start
    throughput_mb = (file_size_bytes / (1024 * 1024)) / stream_time if stream_time > 0 else 0

    evidence_id = upload_record["evidence_id"]
    recorded_sha = upload_record["sha256"]
    stored_path = upload_record["storage_path"]

    print(f"Evidence ID:    \033[1;32m{evidence_id}\033[0m")
    print(f"Recorded Hash:  \033[1;36m{recorded_sha}\033[0m")
    print(f"Storage Path:   {stored_path}")
    print(f"Read-Only Flag: Set on file system (fsync + read-only lock)")
    print(f"Streaming Perf: {throughput_mb:.1f} MB/s ({stream_time * 1000:.1f} ms for {file_size_bytes:,} bytes in 8 MB chunks)")

    # -------------------------------------------------------------------------
    # STEP 3: Verify Stored Original (Baseline Control Check)
    # -------------------------------------------------------------------------
    print_step(3, "Verify Stored Original Evidence (Baseline Control Check)")

    stored_check = integrity_svc.verify_evidence(evidence_id, actor="judge_demo_officer")
    print(f"Status:         \033[1;32m{stored_check['status']}\033[0m")
    print(f"Recorded SHA:   {stored_check['recorded_sha256']}")
    print(f"Recomputed SHA: {stored_check['recomputed_sha256']}")
    print(f"Sizes:          Recorded={stored_check['recorded_size']:,} B | Current={stored_check['current_size']:,} B")
    print(f"Note:           {stored_check['note']}")
    assert stored_check["status"] == "VERIFIED"

    # -------------------------------------------------------------------------
    # STEP 4: Create an Edited COPY (Original is NEVER modified)
    # -------------------------------------------------------------------------
    print_step(4, "Create an Edited COPY of Dataset (Delete Rows & Modify Amounts)")

    edited_copy_path = demo_dir / "synthetic_banking_evidence_edited_copy.csv"

    # Read original and write a copy omitting 50 rows (rows 100 to 149)
    with open(orig_csv_path, "r", encoding="utf-8") as f_in, open(edited_copy_path, "w", encoding="utf-8") as f_out:
        for idx, line in enumerate(f_in):
            if 100 <= idx <= 149:
                continue  # Delete 50 rows in the copy
            f_out.write(line)

    edited_size = edited_copy_path.stat().st_size
    print(f"Original File:  {orig_csv_path.name} (UNTOUCHED: {file_size_bytes:,} bytes)")
    print(f"Edited Copy:    {edited_copy_path.name} ({edited_size:,} bytes - 50 rows deleted)")

    # -------------------------------------------------------------------------
    # STEP 5: Verify-by-Upload with the Edited COPY -> MISMATCH
    # -------------------------------------------------------------------------
    print_step(5, "Verify Candidate via Streaming Upload (Pick Edited Copy) -> MISMATCH")

    with open(edited_copy_path, "rb") as f_candidate:
        verify_upload_edited = integrity_svc.verify_upload(
            evidence_id=evidence_id,
            file_stream=f_candidate,
            actor="judge_demo_officer",
        )

    print(f"Status:         \033[1;31m{verify_upload_edited['status']}\033[0m (Text & Distinct Color/Symbol)")
    print(f"Recorded SHA:   {verify_upload_edited['recorded_sha256']}")
    print(f"Candidate SHA:  {verify_upload_edited['recomputed_sha256']}")
    print(f"Recorded Size:  {verify_upload_edited['recorded_size']:,} bytes")
    print(f"Candidate Size: {verify_upload_edited['candidate_size']:,} bytes (Delta: {verify_upload_edited['candidate_size'] - verify_upload_edited['recorded_size']:,} bytes)")
    print(f"Forensic Note:  \033[1;33m{verify_upload_edited['note']}\033[0m")
    assert verify_upload_edited["status"] == "MISMATCH"

    # -------------------------------------------------------------------------
    # STEP 6: Verify-by-Upload with Original (Control Check) -> VERIFIED
    # -------------------------------------------------------------------------
    print_step(6, "Verify Candidate via Streaming Upload (Pick Original) -> VERIFIED")

    with open(orig_csv_path, "rb") as f_candidate_orig:
        verify_upload_orig = integrity_svc.verify_upload(
            evidence_id=evidence_id,
            file_stream=f_candidate_orig,
            actor="judge_demo_officer",
        )

    print(f"Status:         \033[1;32m{verify_upload_orig['status']}\033[0m (Control check passed)")
    print(f"Recorded SHA:   {verify_upload_orig['recorded_sha256']}")
    print(f"Candidate SHA:  {verify_upload_orig['recomputed_sha256']}")
    print(f"Sizes Match:    {verify_upload_orig['recorded_size']:,} bytes == {verify_upload_orig['candidate_size']:,} bytes")
    print(f"Forensic Note:  {verify_upload_orig['note']}")
    assert verify_upload_orig["status"] == "VERIFIED"

    # -------------------------------------------------------------------------
    # STEP 7: Print Verification History Log
    # -------------------------------------------------------------------------
    print_step(7, "Chronological Verification History (Append-Only Table)")

    history = integrity_svc.get_verification_history(evidence_id)
    print(f"{'CHECKED AT':<22} | {'EVENT ID':<16} | {'STATUS':<10} | {'RECOMPUTED SHA-256 (PREFIX)':<32}")
    print("-" * 88)
    for h in history:
        status_color = "\033[1;32m" if h["status"] == "VERIFIED" else "\033[1;31m"
        print(f"{h['checked_at']:<22} | {h['event_id']:<16} | {status_color}{h['status']:<10}\033[0m | {h['recomputed_sha256'][:30]}...")

    # -------------------------------------------------------------------------
    # STEP 8: Verify Tamper-Evident Audit Chain (Initial: Intact)
    # -------------------------------------------------------------------------
    print_step(8, "Verify HMAC-SHA256 Audit Chain (Initial Status: INTACT)")

    audit_status_before = audit_svc.verify_audit_chain()
    print(f"Audit Chain OK: \033[1;32m{audit_status_before['ok']}\033[0m")
    print(f"Total Events:   {audit_status_before['total_events']}")
    print(f"Latest Hash:    {audit_status_before['last_hash'][:32]}...")
    print(f"Chain Status:   \033[1;32mAudit chain: Intact\033[0m")
    assert audit_status_before["ok"] is True

    # -------------------------------------------------------------------------
    # STEP 9: Directly Edit One Audit Log Row in the Database
    # -------------------------------------------------------------------------
    print_step(9, "Directly Edit One Audit Log Row in DB (Simulate Database Tampering)")

    # Fetch event at seq=2
    row_to_edit = conn.execute("SELECT seq, actor, action, details FROM audit_log WHERE seq = 2").fetchone()
    seq_num = row_to_edit[0]
    orig_actor = row_to_edit[1]
    print(f"Target Row:     Seq #{seq_num} | Action: {row_to_edit[2]} | Current Actor: '{orig_actor}'")

    print("\033[1;31mExecuting direct DB update: UPDATE audit_log SET actor = 'unauthorized_attacker' WHERE seq = 2\033[0m")
    conn.execute("UPDATE audit_log SET actor = 'unauthorized_attacker' WHERE seq = 2")

    # -------------------------------------------------------------------------
    # STEP 10: Re-Verify Audit Chain -> "Broken at #2"
    # -------------------------------------------------------------------------
    print_step(10, "Re-Verify HMAC Audit Chain -> Detects Tampering at Sequence #2")

    audit_status_after = audit_svc.verify_audit_chain()
    print(f"Audit Chain OK: \033[1;31m{audit_status_after['ok']}\033[0m")
    print(f"Broken At Seq:  \033[1;31m#{audit_status_after['broken_at_seq']}\033[0m")
    print(f"Badge Text:     \033[1;31mAudit chain: Broken at #{audit_status_after['broken_at_seq']}\033[0m")
    print(f"Detailed Error: {audit_status_after['message']}")

    assert audit_status_after["ok"] is False
    assert audit_status_after["broken_at_seq"] == 2

    print_banner("DEMO FLOW COMPLETED SUCCESSFULLY - ALL INTEGRITY CHECKS PASSED", "32")
    print("Forensic Disclaimer:")
    print("  'SHA-256 shows whether the compared bytes match the recorded digest.")
    print("   It does not prove authenticity, provenance, or legal admissibility.'\n")

    conn.close()


if __name__ == "__main__":
    main()
