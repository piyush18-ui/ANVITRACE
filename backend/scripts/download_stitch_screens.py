import json
import urllib.request
import os

screens = [
    {
        "id": "b82e82b046e24757bc38f41e5eb00398",
        "title": "detection_overview_l1_l2_l3",
        "html_url": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1Y2QyZTVhYTBmZjgwMzM4NWVlYmM4MzI4YzcwEgsSBxDR_82U7g4YAZIBJAoKcHJvamVjdF9pZBIWQhQxMDQyMzcyNDYxMjc5NTQ5NTM0NA&filename=&opi=89354086",
        "img_url": "https://lh3.googleusercontent.com/aida/AEtjO1WaZJ7v8ip-Am6Xuf8sTUUF094CGwjk4gI6DHIk52VjvYZX_Cs8UYu4dhYAOblOLchBRV8dBTxWqSniQQ4NWnGrzHvTw0gVRFm6yED-pmJace1H_c_ROd7l6JArhfloB8vaVnHBmkS4PmHKMiEzlcVNBopsyztfhgs7I8czcr4f9VQhz5tUYpb7J4KqhNUJihafp9Anmwu2Aeya8wcQPMoQqqejE7NQsh64B9VpuFl00zoofrA1fd5lTgf9"
    },
    {
        "id": "a7f344e0dfc643eeb682a58e55e562d7",
        "title": "case_management_evidentiary_registry",
        "html_url": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1Y2QyZTYyNmVkZWUwMWE2MDNmZmMyMTdlY2Q4EgsSBxDR_82U7g4YAZIBJAoKcHJvamVjdF9pZBIWQhQxMDQyMzcyNDYxMjc5NTQ5NTM0NA&filename=&opi=89354086",
        "img_url": "https://lh3.googleusercontent.com/aida/AEtjO1UiFl8ibVz7lBWt9NJYahAg7qwSh2gSo4rcFBNofQMjd4OZgXZklBhvllqPaDNNt8mxxy0ZKQ6UBK9luYiJh6uwv5iNFwky0omVjvpNu0FLteYUVUTE0Wo9ohIWjLWnsOtrxZE7rWKJB7Ho6GN6YiqURqmAAUHrZkmo3JG_LsqXzt2QIVeVrBHLZq_F31FoLbudKPeIjoNbowtqjOU0kckKwZlG99errMZ5veErLZNfQP3Pw7mdkS2crNJX"
    },
    {
        "id": "76f967192eb948e78c876df20f821a53",
        "title": "documents_bank_freeze_requisition",
        "html_url": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1Y2QyZTVlMDU5MTYwNmZmZTFiZmYwMjlmYzAyEgsSBxDR_82U7g4YAZIBJAoKcHJvamVjdF9pZBIWQhQxMDQyMzcyNDYxMjc5NTQ5NTM0NA&filename=&opi=89354086",
        "img_url": "https://lh3.googleusercontent.com/aida/AEtjO1Uldsarl0s6Jp_wDAQuOFyUINh9ekIkvVYIf9XSd1z6YyDQSWYlG5MsJT4oOhJlMvtGPEwgLr1gxWjn75nCPPixjD9Tr-BrIIl9yiE8oIrEZDT8InBGJ-fcqcxeCyf_9LG6A--W00K24DiuRyN4084nXkbq_b1-oekEMhJKcW_dhtL5IRu19Czs3UfngZVhHtGXEViv23gVtee3tV2h2vaedfwGKG8yJ_Wdgy3V4dY_XnBzudUqRI4T7QHs"
    },
    {
        "id": "00f0dffff7f04914889b3e5d6f49e20a",
        "title": "dataset_ingestion_processing_pipeline",
        "html_url": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1Y2QyZTYzNTAyZWEwMzM4NWVlYmM4MzI4YzcwEgsSBxDR_82U7g4YAZIBJAoKcHJvamVjdF9pZBIWQhQxMDQyMzcyNDYxMjc5NTQ5NTM0NA&filename=&opi=89354086",
        "img_url": "https://lh3.googleusercontent.com/aida/AEtjO1VUvjOZbFvNKXlKXlApAb3QGXZbQH5EaTqb4EUNo9rYj0YWUZBVOBLw6wqDD4LwkvOY8PyfjiIBWSi4llIjj-g-ElnL5PO4i8wXvnOeybHmnkCMIquRkkiu6oLSt_ZWx7d0H0IUUzaVsegSCZGOfGCL0b_4mYEpTHSUVlIw_G8zpIxVA8AU_zUrxYnDHnZCtEj1EgL3mveqpbLV9ljkcrJZLBkR6aeIO_fkdvIvqviT4MnY7r0IysxhLPQ"
    }
]

out_dir = r"C:\Users\vijes\.gemini\antigravity-ide\brain\ac6b7ad4-8088-439c-8f1a-481c45c42702\stitch_new_screens"
os.makedirs(out_dir, exist_ok=True)

for s in screens:
    print(f"Downloading {s['title']}...")
    try:
        req = urllib.request.Request(s["html_url"], headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8", errors="replace")
            with open(os.path.join(out_dir, f"{s['title']}.html"), "w", encoding="utf-8") as f:
                f.write(content)
        print(f"Saved {s['title']}.html")
    except Exception as e:
        print(f"Error downloading HTML for {s['title']}: {e}")

    try:
        req = urllib.request.Request(s["img_url"], headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp:
            img_data = resp.read()
            with open(os.path.join(out_dir, f"{s['title']}.png"), "wb") as f:
                f.write(img_data)
        print(f"Saved {s['title']}.png")
    except Exception as e:
        print(f"Error downloading image for {s['title']}: {e}")

print("Done downloading all screens!")
