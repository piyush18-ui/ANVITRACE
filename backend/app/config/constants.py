"""Application-wide constants."""

# --- Dataset source columns (as specified in Engineering Report) ---
SOURCE_COLUMNS: list[str] = [
    "Transaction_ID",
    "Timestamp",
    "Sender_Account",
    "Sender_Name",
    "Sender_IFSC",
    "Receiver_Account",
    "Receiver_Name",
    "Receiver_IFSC",
    "Amount",
    "Payment_Mode",
    "Status",
]

# Optional source columns that might be present in extended datasets
EXTENDED_COLUMNS: list[str] = [
    "Narration",
    "IP_Address",
    "Device_Type",
]

# --- Internal identifier added during ingestion ---
RECORD_ID_COLUMN: str = "record_id"

# --- Valid Payment modes ---
VALID_PAYMENT_MODES: set[str] = {"UPI", "IMPS", "NEFT", "RTGS"}

# --- Account identifier constraints ---
ACCOUNT_ID_LENGTH: int = 12

# --- IFSC constraints ---
IFSC_LENGTH: int = 11

# --- Valid Device Types ---
VALID_DEVICE_TYPES: set[str] = {
    "Android",
    "iOS",
    "Windows_Browser",
    "Web_Emulator",
    "Linux_Script",
    "UNKNOWN",
}

# --- Validation Status Flags ---
STATUS_VALID: str = "VALID"
STATUS_INVALID: str = "INVALID"
STATUS_SUSPICIOUS: str = "SUSPICIOUS"

# --- Schema Version ---
SCHEMA_VERSION: str = "1.0.0"
NORMALIZATION_VERSION: str = "1.0.0"

# --- Ingestion Batch Size ---
DEFAULT_CHUNK_SIZE: int = 100_000
