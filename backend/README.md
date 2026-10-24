# 🛡️ ANVITRACE

> **Offline cyber-forensics and financial transaction investigation platform.**

---

## Purpose

ANVITRACE is a fully offline platform designed for cyber-forensic analysis of financial transactions and money-mule investigation. It enables investigators to ingest large transaction datasets, trace multi-hop money trails, detect mule networks, assess risk, analyse recovery potential, and generate court-ready evidence — all without any cloud dependency.

---

## Backend Stack

| Layer            | Technology                              |
| ---------------- | --------------------------------------- |
| Language         | Python 3.12+                            |
| Web Framework    | FastAPI + Uvicorn                       |
| Database         | DuckDB                                  |
| Data Processing  | Pandas · NumPy · Polars · Apache Arrow  |
| Validation       | Pydantic                                |
| Templating       | Jinja2                                  |
| Report Generation| ReportLab                               |
| Testing          | Pytest                                  |
| Linting          | Ruff                                    |

---

## Core Workflow

```
Dataset
  → Ingestion
    → Indexing
      → Victim Search
        → Four-Hop Money Trail
          → Amount Lineage
            → Mule Detection
              → Risk Analysis
                → Recovery Analysis
                  → Cross-Victim Analysis
                    → Evidence
                      → Reports
```

---

## Project Status

> **Phases 1–4 Backend Implementation Complete**
>
> - **Test Suite**: 74/74 tests passing (Forensic: 55, Integration: 4, Performance: 5, Unit: 10).
> - **Code Quality**: Ruff clean, zero linter errors.
> - **API Endpoints**: 14 operational endpoints under `/api`.
> - **Execution Mode**: 100% offline, zero external cloud or model dependencies.
>
> ### Forensic Disclaimers & Ground Truth Alignment
> 1. **Observed Net Flow**: Strictly limited to the selected dataset and investigation window. It is transaction-derived net flow and is **NOT** a verified current bank balance.
> 2. **SHA-256 Provenance**: Integrity mechanism verifying internal data consistency. A matching hash does **NOT** constitute external proof of source authenticity or legal chain of custody.
> 3. **Candidate Indicators**: Mule risk classifications and cross-victim linkages represent investigative candidate hypotheses, **NOT** proof of criminal guilt or coordinated syndicates.
> 4. **Bank Freeze Requisition**: Generates verified-only draft documents requiring mandatory investigating officer review and manual approval. **NO** automatic bank dispatch is supported.
> 5. **Performance Distinction**: Four-hop trace is benchmarked at p50=4.5ms (target ≤2,000ms: ACHIEVED). Ingestion is benchmarked at ~24,800 rows/sec on 10K test batches; 2M full-scale dataset target (≤60s on 16GB RAM) is IMPLEMENTED with streaming Polars/DuckDB but remains NOT YET MEASURED on full 2M hardware benchmark.

---

## Quick Start

```bash
# 1. Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux / macOS

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy environment config
copy .env.example .env        # Windows
# cp .env.example .env        # Linux / macOS

# 4. Run the development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

---

## Directory Structure

```
backend/
├── app/                  # Application source code
│   ├── config/           # Settings and constants
│   ├── database/         # DuckDB connection and schema
│   ├── models/           # Domain models
│   ├── schemas/          # Pydantic request/response schemas
│   ├── routers/          # API route handlers
│   ├── services/         # Business logic services
│   ├── algorithms/       # Forensic algorithms
│   ├── indexes/          # Indexing engine
│   ├── evidence/         # Evidence packaging
│   ├── documents/        # Report / document generation
│   └── utils/            # Shared utilities
├── data/                 # Runtime data (git-ignored)
├── tests/                # Test suites
├── benchmarks/           # Performance benchmarks
├── scripts/              # Utility scripts
├── requirements.txt
├── pyproject.toml
└── .env.example
```

---

## License

MIT
