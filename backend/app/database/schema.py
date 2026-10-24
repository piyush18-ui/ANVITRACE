"""DuckDB schema definitions and migrations for ANVITRACE."""

import contextlib

import duckdb

SCHEMA_SQL = """
-- 1. Datasets registry
CREATE TABLE IF NOT EXISTS datasets (
    dataset_id VARCHAR PRIMARY KEY,
    dataset_hash VARCHAR NOT NULL,
    filename VARCHAR NOT NULL,
    total_rows BIGINT NOT NULL DEFAULT 0,
    valid_rows BIGINT NOT NULL DEFAULT 0,
    invalid_rows BIGINT NOT NULL DEFAULT 0,
    repeated_tx_ids BIGINT NOT NULL DEFAULT 0,
    exact_duplicates BIGINT NOT NULL DEFAULT 0,
    schema_version VARCHAR NOT NULL,
    normalization_version VARCHAR NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR NOT NULL DEFAULT 'PENDING'
);

-- 2. Ingestion runs log
CREATE TABLE IF NOT EXISTS ingestion_runs (
    run_id VARCHAR PRIMARY KEY,
    dataset_id VARCHAR NOT NULL REFERENCES datasets(dataset_id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_seconds DOUBLE,
    peak_memory_mb DOUBLE,
    rows_per_second DOUBLE,
    status VARCHAR NOT NULL,
    error_message VARCHAR
);

-- 3. Canonical transactions table (Financial grade)
-- Note: record_id is surrogate primary key; Transaction_ID is preserved as source data
CREATE TABLE IF NOT EXISTS transactions (
    record_id VARCHAR PRIMARY KEY,
    Transaction_ID VARCHAR NOT NULL,
    Sender_Account VARCHAR NOT NULL,
    Receiver_Account VARCHAR NOT NULL,
    Sender_IFSC VARCHAR NOT NULL,
    Receiver_IFSC VARCHAR NOT NULL,
    Amount DECIMAL(18, 2) NOT NULL,
    Timestamp TIMESTAMP NOT NULL,
    Payment_Mode VARCHAR NOT NULL,
    Narration VARCHAR,
    IP_Address VARCHAR,
    Device_Type VARCHAR,
    raw_timestamp VARCHAR,
    raw_amount VARCHAR,
    raw_payment_mode VARCHAR,
    dataset_id VARCHAR NOT NULL REFERENCES datasets(dataset_id),
    source_row BIGINT NOT NULL,
    validation_status VARCHAR NOT NULL,
    is_repeated_tx BOOLEAN NOT NULL DEFAULT FALSE,
    is_exact_duplicate BOOLEAN NOT NULL DEFAULT FALSE
);

-- Essential database indexes on transactions for filtering & join performance
CREATE INDEX IF NOT EXISTS idx_tx_dataset_id ON transactions (dataset_id);
CREATE INDEX IF NOT EXISTS idx_tx_sender_acc ON transactions (Sender_Account);
CREATE INDEX IF NOT EXISTS idx_tx_receiver_acc ON transactions (Receiver_Account);
CREATE INDEX IF NOT EXISTS idx_tx_timestamp ON transactions (Timestamp);
CREATE INDEX IF NOT EXISTS idx_tx_transaction_id ON transactions (Transaction_ID);

-- 4. Account precomputed analytical features
CREATE TABLE IF NOT EXISTS account_features (
    account_id VARCHAR NOT NULL,
    dataset_id VARCHAR NOT NULL REFERENCES datasets(dataset_id),
    in_tx_count BIGINT NOT NULL DEFAULT 0,
    out_tx_count BIGINT NOT NULL DEFAULT 0,
    in_amount DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    out_amount DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    distinct_senders BIGINT NOT NULL DEFAULT 0,
    distinct_receivers BIGINT NOT NULL DEFAULT 0,
    first_tx_timestamp TIMESTAMP,
    last_tx_timestamp TIMESTAMP,
    PRIMARY KEY (account_id, dataset_id)
);

CREATE INDEX IF NOT EXISTS idx_acc_feat_dataset ON account_features (dataset_id);

-- 5. Transaction forensic features placeholder
CREATE TABLE IF NOT EXISTS transaction_features (
    record_id VARCHAR PRIMARY KEY REFERENCES transactions(record_id),
    dataset_id VARCHAR NOT NULL REFERENCES datasets(dataset_id),
    velocity_1h INTEGER DEFAULT 0,
    velocity_24h INTEGER DEFAULT 0,
    rapid_flow_flag BOOLEAN DEFAULT FALSE,
    structuring_flag BOOLEAN DEFAULT FALSE,
    odd_hour_flag BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_tx_feat_dataset ON transaction_features (dataset_id);

-- 6. Investigation snapshots
CREATE TABLE IF NOT EXISTS investigation_snapshots (
    snapshot_id VARCHAR PRIMARY KEY,
    dataset_id VARCHAR NOT NULL REFERENCES datasets(dataset_id),
    target_account VARCHAR NOT NULL,
    max_hops INTEGER NOT NULL DEFAULT 4,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    snapshot_data VARCHAR -- JSON or metadata
);

-- 7. Evidence items
CREATE TABLE IF NOT EXISTS evidence_items (
    evidence_id VARCHAR PRIMARY KEY,
    dataset_id VARCHAR NOT NULL REFERENCES datasets(dataset_id),
    item_type VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    file_path VARCHAR,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sha256_hash VARCHAR
);

-- 8. Case Dockets (Server-side case scoping & isolation)
CREATE TABLE IF NOT EXISTS case_dockets (
    case_id VARCHAR PRIMARY KEY,
    title VARCHAR NOT NULL,
    act VARCHAR NOT NULL,
    target_account VARCHAR NOT NULL,
    officer_name VARCHAR,
    notes VARCHAR,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR NOT NULL DEFAULT 'Active Investigation',
    dataset_id VARCHAR,
    dataset_filename VARCHAR,
    dataset_hash VARCHAR
);

-- 9. Case Summaries (Bilingual AI-grounded investigative briefs)
CREATE TABLE IF NOT EXISTS case_summaries (
    summary_id VARCHAR PRIMARY KEY,
    case_id VARCHAR NOT NULL,
    language VARCHAR NOT NULL DEFAULT 'en',
    summary_json VARCHAR NOT NULL,
    dataset_id VARCHAR,
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Case Chat Messages (Strictly scoped case chatbot audit logs)
CREATE TABLE IF NOT EXISTS case_chat_messages (
    message_id VARCHAR PRIMARY KEY,
    case_id VARCHAR NOT NULL,
    sender VARCHAR NOT NULL,
    message_text VARCHAR NOT NULL,
    metadata_json VARCHAR,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. Isolation Forest ML Anomaly Results
CREATE TABLE IF NOT EXISTS account_ml_anomalies (
    account_id VARCHAR NOT NULL,
    dataset_id VARCHAR NOT NULL REFERENCES datasets(dataset_id),
    anomaly_score DOUBLE NOT NULL,
    is_anomaly BOOLEAN NOT NULL DEFAULT FALSE,
    feature_contributions_json VARCHAR,
    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, dataset_id)
);
"""


def apply_schema(conn: duckdb.DuckDBPyConnection) -> None:
    """Execute DDL statements to ensure all canonical tables and indexes exist."""
    conn.execute(SCHEMA_SQL)
    # Schema migration: add provenance columns if table was created previously
    for col in ("raw_timestamp", "raw_amount", "raw_payment_mode", "source_filename"):
        with contextlib.suppress(Exception):
            conn.execute(f"ALTER TABLE transactions ADD COLUMN {col} VARCHAR;")
