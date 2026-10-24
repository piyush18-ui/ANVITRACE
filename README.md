# ANVITRACE

ANVITRACE is an offline forensic workstation for investigating financial
transactions. It provides transaction ingestion, mule-account detection,
fund-flow tracing, case management, and forensic report generation.

The application combines a React/Vite frontend with a FastAPI backend and a
DuckDB-based analysis engine. The Windows desktop build packages these
components into a standalone executable.

## Run the Windows executable

If you have the `ANVITRACE-v1.0-Offline` distribution folder, double-click
`ANVITRACE.exe`. The application starts its local backend and opens the
workstation in Microsoft Edge app mode or your default browser at
`http://127.0.0.1:8000`.

The executable and runtime data are not stored in this source repository.
GitHub limits individual Git files to 100 MB, and the generated executable is
larger than that. Build the distribution from source as described below, or
download a separately published release when one is available.

## Build the Windows distribution

Requirements:

- Windows
- Python 3.12 or newer
- Node.js and npm

From the repository root, install and build the frontend:

```powershell
cd frontend
npm install
npm run build
cd ..
```

Create the backend environment at the path expected by the packaging script,
install the backend dependencies and PyInstaller, then build the distribution:

```powershell
python -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
backend\.venv\Scripts\python.exe -m pip install pyinstaller
backend\.venv\Scripts\python.exe build_offline_package.py
```

The script creates `ANVITRACE-v1.0-Offline` in the repository root. Open
`ANVITRACE.exe` in that folder to start the application. Generated executables,
databases, datasets, and local environment files are intentionally excluded
from Git.

## Project layout

```text
backend/                  FastAPI application and analysis engine
frontend/                 React and Vite user interface
anvitrace.spec            PyInstaller executable specification
build_offline_package.py  Windows offline distribution builder
launcher.py               Root launcher entry point
```

## Development

Install frontend dependencies with `npm install` in `frontend/`. Install the
backend dependencies from `backend/requirements.txt` using Python 3.12 or
newer. Keep local credentials and environment files out of version control;
configure local settings in an untracked `.env` file as needed.

---

## Evidence integrity and verify-by-upload

ANVITRACE implements a zero-trust, offline-first evidence integrity layer designed for court-admissible financial forensics (Section 65B Indian Evidence Act compliant).

### What SHA-256 Proves and Does NOT Prove

> **Statutory Technical Notice:**
> *"SHA-256 shows whether the compared bytes match the recorded digest. It does not prove authenticity, provenance, or legal admissibility."*

- **What SHA-256 Proves:**
  - **Bitwise Digest Identity:** Recomputing the SHA-256 digest over an arbitrary byte stream deterministically verifies whether candidate bytes match the baseline recorded digest byte-for-byte.
  - **Accidental Corruption & Row Alteration Detection:** If even a single byte, amount, timestamp, or row is inserted, modified, or removed, the avalanche effect of SHA-256 changes ~50% of the digest bits, instantly triggering a `MISMATCH`.

- **What SHA-256 Does NOT Prove:**
  - **Authenticity & Provenance:** SHA-256 cannot prove who authored the CSV or whether the original banking ledger itself contained fraudulent or backdated records prior to extraction.
  - **Legal Admissibility:** A cryptographic hash is an evidence verification mechanism, not a substitute for statutory digital chain-of-custody documentation, Section 65B certification, and officer attestation.

---

### Core Architecture & Invariants

1. **Streaming Single-Pass Hashing (Zero Full-File Memory Loading):**
   - Ingests large datasets (e.g. ~2M rows) in strict **8 MB streaming chunks**.
   - Computes SHA-256 concurrently while writing to storage in a single pass.
   - Executes `os.fsync()` to flush disk buffers and applies filesystem **read-only** attributes (`0o444`) to permanently lock the registered original.
2. **Streaming Verify-by-Upload (The Judge-Demo Flow):**
   - Candidates are streamed via `POST /api/evidence/{id}/verify-upload` in 8 MB chunks into `stream_hash_candidate()`.
   - **Candidate files are NEVER persisted to disk and NEVER ingested into DuckDB.**
   - Compares candidate hash with recorded baseline using constant-time `hmac.compare_digest`.
   - Status returned as either `VERIFIED` or `MISMATCH`.
3. **Append-Only Tables (DuckDB):**
   - `evidence_files` and `audit_log` are strictly append-only at the application level.
   - The application **never** executes `UPDATE` or `DELETE` statements against these tables.
   - Every verification attempt logs a new immutable entry into `verification_events`.
4. **Tamper-Evident HMAC-SHA256 Audit Chain:**
   - Cryptographic hash chain using environment secret `AUDIT_KEY` (fails fast at startup if missing).
   - Genesis block initialized with `0000000000000000000000000000000000000000000000000000000000000000`.
   - Each entry hash binds `seq`, `ts`, `actor`, `action`, `entity_type`, `entity_id`, canonical JSON `details`, and `prev_hash`.
   - Appends are guarded by an in-memory lock (designed for single uvicorn worker).
   - `GET /api/audit/verify` re-traverses all entries sequentially. If any database row is altered, it reports `ok: false` and `broken_at_seq: #N`.
5. **Deterministic Canonical JSON:**
   - Serializes JSON with sorted keys, compact separators `(",", ":")`, `ensure_ascii=False`, and `Decimal` values encoded as strings to prevent floating-point drift.
6. **Same-Filename Different-Content Warning:**
   - If an uploaded dataset shares a filename with a previously registered record but has a differing SHA-256 digest, it is saved as a distinct new evidence record while returning a `SAME_FILENAME_DIFFERENT_CONTENT` warning and auditing `DUPLICATE_NAME_DIFFERENT_HASH`.
   - UI banner: *"Same filename, different content. Compare with the registered original?"* with a button to open direct comparison.
7. **Trusted Manifest Authorization:**
   - Optional `data/trusted_manifest.json` defines trusted baseline hashes.
   - Unrecognized digests for manifest files are blocked from ingestion until an authorized officer provides explicit audited override.
8. **Document Generation Hash Binding:**
   - Case Diary and Section 102 Freeze Requisition PDFs print the latest audit chain `entry_hash` directly into the document footer for cross-verification against the ledger.

---

### Running the Judge Demo Script

The automated judge-demo script demonstrates the complete 10-step lifecycle:
1. Generates a ~5,000-row synthetic banking dataset (clearly labeled synthetic).
2. Registers original dataset with single-pass streaming SHA-256 and read-only locking.
3. Verifies stored original -> `VERIFIED`.
4. Generates an edited COPY (50 rows omitted). The original file is **never modified**.
5. Verifies candidate edited copy via streaming upload -> `MISMATCH` with differing hashes shown.
6. Verifies candidate original copy via streaming upload -> `VERIFIED` (control check).
7. Prints full chronological verification history table.
8. Verifies HMAC-SHA256 audit chain -> `Audit chain: Intact`.
9. Directly tampers with sequence #2 in the database.
10. Re-verifies audit chain -> Detects tampering and outputs `Audit chain: Broken at #2`.

To run the demo:

```powershell
cd backend
py -3.11 scripts/demo_integrity_flow.py
```

---

### Running the Pytest Suite

The automated test suite verifies all 12 cryptographic integrity requirements:

```powershell
cd backend
py -3.11 -m pytest tests/test_evidence_integrity.py -v
```

---

### Judge Demo in the Web UI

1. Open **Cases & Evidence** or **Case Deep-Dive** -> **SHA-256 Integrity** tab.
2. View recorded evidence details: filename, size, recorded timestamp, and baseline SHA-256 digest with copy button.
3. Click **"Verify File (Pick Candidate / Edited Copy)"** and select an edited dataset copy.
4. The **Result Panel** displays:
   - Status `MISMATCH` with prominent warning icon and red badge.
   - Side-by-side comparison of `Recorded SHA-256` vs `Candidate SHA-256` with **differing characters highlighted in bold red badges**.
   - Size comparison with byte delta.
5. Click **"Verify File"** and select the original dataset -> Status `VERIFIED` with green badge and checkmark icon.
6. Check the **Audit Chain Badge**: displays `"Audit chain: Intact (Seq #...)"` or `"Audit chain: Broken at #N"` with an instant refresh button.
