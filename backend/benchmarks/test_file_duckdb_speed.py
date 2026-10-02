import duckdb
import time
from pathlib import Path

db_path = "data/test_perf.duckdb"
if Path(db_path).exists():
    Path(db_path).unlink()

conn = duckdb.connect(db_path)

# Apply schema
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.database.schema import apply_schema
apply_schema(conn)

csv_path = "data/raw/VoidHacks8_MuleAccount_2M_Transactions.csv"
dataset_id = "ds_test_file"

conn.execute(f"""
INSERT INTO datasets (dataset_id, dataset_hash, filename, schema_version, normalization_version, status)
VALUES ('{dataset_id}', 'hash123', 'VoidHacks8_MuleAccount_2M_Transactions.csv', '1.0.0', '1.0.0', 'INGESTING');
""")

print("Testing direct single-pass CTE on persistent DuckDB file...")
t0 = time.perf_counter()
conn.execute(f"""
INSERT INTO transactions (
    record_id, Transaction_ID, Sender_Account, Receiver_Account,
    Sender_IFSC, Receiver_IFSC, Amount, Timestamp,
    Payment_Mode, Narration, IP_Address, Device_Type,
    raw_timestamp, raw_amount, raw_payment_mode,
    dataset_id, source_row, validation_status,
    is_repeated_tx, is_exact_duplicate
)
WITH raw_numbered AS (
    SELECT
        row_number() OVER () AS source_row,
        trim(COALESCE(Transaction_ID, '')) AS Transaction_ID,
        trim(COALESCE(Sender_Account, '')) AS Sender_Account,
        trim(COALESCE(Receiver_Account, '')) AS Receiver_Account,
        upper(trim(COALESCE(Sender_IFSC, ''))) AS Sender_IFSC,
        upper(trim(COALESCE(Receiver_IFSC, ''))) AS Receiver_IFSC,
        Amount AS raw_amount,
        Timestamp AS raw_timestamp,
        trim(COALESCE(Payment_Mode, '')) AS raw_payment_mode,
        Narration,
        IP_Address,
        COALESCE(NULLIF(trim(Device_Type), ''), 'UNKNOWN') AS Device_Type
    FROM read_csv('{csv_path}', header=true, all_varchar=true)
),
validated AS (
    SELECT
        source_row,
        Transaction_ID,
        Sender_Account,
        Receiver_Account,
        Sender_IFSC,
        Receiver_IFSC,
        raw_amount,
        raw_timestamp,
        raw_payment_mode,
        Narration,
        IP_Address,
        Device_Type,
        TRY_CAST(raw_amount AS DECIMAL(18, 2)) AS clean_amount,
        COALESCE(
            TRY_CAST(raw_timestamp AS TIMESTAMP),
            TRY_STRPTIME(raw_timestamp, '%d-%m-%Y %H:%M:%S'),
            TRY_STRPTIME(raw_timestamp, '%Y/%m/%d %H:%M:%S')
        ) AS clean_timestamp,
        upper(raw_payment_mode) AS clean_payment_mode,
        (length(Sender_Account) = 12 AND regexp_matches(Sender_Account, '^[A-Za-z0-9]{{12}}$')) AS s_acc_ok,
        (length(Receiver_Account) = 12 AND regexp_matches(Receiver_Account, '^[A-Za-z0-9]{{12}}$')) AS r_acc_ok,
        (length(Sender_IFSC) = 11 AND regexp_matches(Sender_IFSC, '^[A-Z]{{4}}0[A-Z0-9]{{6}}$')) AS s_ifsc_ok,
        (length(Receiver_IFSC) = 11 AND regexp_matches(Receiver_IFSC, '^[A-Z]{{4}}0[A-Z0-9]{{6}}$')) AS r_ifsc_ok,
        (
            NOT (regexp_matches(substr(Sender_Account, 1, 4), '^[A-Za-z]{{4}}$') AND regexp_matches(substr(Sender_IFSC, 1, 4), '^[A-Za-z]{{4}}$'))
            OR upper(substr(Sender_Account, 1, 4)) = upper(substr(Sender_IFSC, 1, 4))
        ) AS s_cons_ok,
        (
            NOT (regexp_matches(substr(Receiver_Account, 1, 4), '^[A-Za-z]{{4}}$') AND regexp_matches(substr(Receiver_IFSC, 1, 4), '^[A-Za-z]{{4}}$'))
            OR upper(substr(Receiver_Account, 1, 4)) = upper(substr(Receiver_IFSC, 1, 4))
        ) AS r_cons_ok,
        upper(raw_payment_mode) IN ('UPI', 'IMPS', 'NEFT', 'RTGS') AS mode_ok,
        (row_number() OVER (PARTITION BY Transaction_ID ORDER BY source_row) > 1) AS is_repeated_tx,
        (row_number() OVER (
            PARTITION BY Transaction_ID, Sender_Account, Receiver_Account, Sender_IFSC, Receiver_IFSC,
                         raw_amount, raw_timestamp, raw_payment_mode, COALESCE(Narration, ''), COALESCE(IP_Address, ''), Device_Type
            ORDER BY source_row
        ) > 1) AS is_exact_duplicate
    FROM raw_numbered
)
SELECT
    'rec_' || '{dataset_id}' || '_' || CAST(source_row AS VARCHAR) AS record_id,
    Transaction_ID,
    Sender_Account,
    Receiver_Account,
    Sender_IFSC,
    Receiver_IFSC,
    COALESCE(clean_amount, 0.00) AS Amount,
    COALESCE(clean_timestamp, TIMESTAMP '1970-01-01 00:00:00') AS Timestamp,
    CASE WHEN mode_ok THEN clean_payment_mode ELSE raw_payment_mode END AS Payment_Mode,
    Narration,
    IP_Address,
    Device_Type,
    raw_timestamp,
    raw_amount,
    raw_payment_mode,
    '{dataset_id}' AS dataset_id,
    source_row,
    CASE
        WHEN s_acc_ok AND r_acc_ok AND s_ifsc_ok AND r_ifsc_ok AND s_cons_ok AND r_cons_ok
             AND clean_amount IS NOT NULL AND clean_amount > 0 AND clean_timestamp IS NOT NULL AND mode_ok
        THEN 'VALID'
        ELSE 'INVALID'
    END AS validation_status,
    is_repeated_tx,
    is_exact_duplicate
FROM validated
ORDER BY source_row ASC;
""")
t1 = time.perf_counter()
print(f"Direct single-pass CTE insertion on persistent DuckDB file: {t1 - t0:.3f} sec")
conn.close()

if Path(db_path).exists():
    Path(db_path).unlink()
