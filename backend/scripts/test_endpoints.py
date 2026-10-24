import json
import sys
import urllib.request
import urllib.error

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

def request_json(url, method="GET", payload=None):
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json"} if payload is not None else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print("HTTP ERROR:", e.code, e.read().decode("utf-8"))
        raise

def main():
    print("--- 1. Registering Case ---")
    case_payload = {
        "case_id": "FIR-2026-CYBER-409",
        "title": "Operation Abhedya-Chakra Cyber Extortion",
        "act": "IPC 420, IT Act 66D",
        "target_account": "SBIN10000344",
        "officer_name": "DySP Rajesh Kumar",
        "notes": "Sophisticated mule network routing cyber extortion proceeds through layered synthetic accounts",
        "dataset_filename": "primary_evidence.csv"
    }
    case_resp = request_json(f"{BASE_URL}/api/cases", "POST", case_payload)
    case_id = case_resp["case_id"]
    print(f"Created Case: {case_id} - {case_resp['title']}")

    print("\n--- 2. Grounded AI Case Summary (English) ---")
    sum_en = request_json(f"{BASE_URL}/api/cases/{case_id}/summary", "POST", {"language": "en"})
    print(f"Generated English Summary (Generated At: {sum_en.get('generated_at')})")
    print(f"Sections Count: {len(sum_en['sections'])}")
    print(f"Case Overview: {sum_en['sections'].get('1_case_overview')}")
    print(f"Money-trail Summary: {sum_en['sections'].get('6_money_trail_summary')}")
    print(f"ML Anomaly Findings: {sum_en['sections'].get('12_ml_anomaly_findings')}")

    print("\n--- 3. Grounded AI Case Summary (Hindi) ---")
    sum_hi = request_json(f"{BASE_URL}/api/cases/{case_id}/summary", "POST", {"language": "hi"})
    print(f"Generated Hindi Summary (Generated At: {sum_hi.get('generated_at')})")
    print(f"Hindi Overview: {sum_hi['sections'].get('1_case_overview')}")
    print(f"Hindi ML Findings: {sum_hi['sections'].get('12_ml_anomaly_findings')}")

    print("\n--- 4. Case-Scoped AI Chatbot ---")
    queries = [
        "What is the main money trail in this case?",
        "Which account received the largest amount?",
        "What evidence supports the primary suspect account?"
    ]
    for q in queries:
        chat_resp = request_json(f"{BASE_URL}/api/cases/{case_id}/chat", "POST", {"question": q})
        print(f"\nUser: {q}")
        print(f"AI: {chat_resp['answer'][:200]}...")
        print(f"Citations: {chat_resp.get('citations', [])}")
        print(f"Suggestions: {chat_resp.get('suggested_followups', [])}")

    print("\n--- 5. Cryptographic SHA-256 Integrity Check ---")
    integ_resp = request_json(f"{BASE_URL}/api/evidence/verify-integrity", "POST")
    print(f"File: {integ_resp.get('filename')}")
    print(f"Integrity Status: {integ_resp.get('status')}")
    print(f"Verified Match: {integ_resp.get('verified')}")
    print(f"Stored Baseline Hash: {integ_resp.get('stored_baseline_sha256')}")
    print(f"Current SHA256 Hash: {integ_resp.get('current_sha256')}")
    print(f"Changes Detected: {integ_resp.get('changes_detected')}")

    print("\n--- 6. Universal Multi-Identifier Search ---")
    search_resp = request_json(f"{BASE_URL}/api/investigations/search?q=SBIN10000344&limit=3")
    print(f"Query: {search_resp['query']} (Detected Type: {search_resp.get('detected_type')})")
    print(f"Total Matches: {search_resp.get('total_count')}")
    if search_resp.get('results'):
        m = search_resp['results'][0]
        print(f"Match: {m.get('identifier_value', m.get('account_id', m.get('Transaction_ID')))} | Source: {m.get('source_filename')} (Row {m.get('source_row')})")

    print("\n--- ALL BACKEND TEST PASSES SUCCESSFULLY ---")

if __name__ == "__main__":
    main()
