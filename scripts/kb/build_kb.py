# Build content/kb/chunks.json from the guidebook and booklet PDFs (run locally; needs pdftotext).
import json, re, subprocess, sys, hashlib
root = sys.argv[1]
SRC = [
  ("labbhr-employers-guidebook-v1.2.1.pdf", "employers-guidebook", "Employers Guidebook", "/resources/employers-guidebook"),
  ("labbhr-construction-screening-guidebook-q4-2026-v1.70.pdf", "construction-screening-guidebook", "Construction Screening Guidebook", "/resources/construction-screening-guidebook"),
  ("labbhr-manufacturing-screening-guidebook-q4-2026-v1.71.pdf", "manufacturing-screening-guidebook", "Manufacturing Screening Guidebook", "/resources/manufacturing-screening-guidebook"),
  ("labbhr-logistics-screening-guidebook-q4-2026-v1.70.pdf", "logistics-screening-guidebook", "Logistics Screening Guidebook", "/resources/logistics-screening-guidebook"),
  ("labbhr-employer-guidebook-healthcare-v1.2.1.pdf", "healthcare-screening-guidebook", "Healthcare Screening Guidebook", "/resources/healthcare-screening-guidebook"),
  ("labbhr-employer-guidebook-hospitality-v1.2.1.pdf", "hospitality-screening-guidebook", "Hospitality Screening Guidebook", "/resources/hospitality-screening-guidebook"),
  ("labbhr-clinic-owners-guidebook-q4-2026-v1.60.pdf", "clinic-owners-guidebook", "Clinic Owners Guidebook", "/resources/clinic-owners-guidebook"),
  ("labbhr-background-screening-guidebook-q4-2026-v1.1.pdf", "background-screening-guidebook", "Background Screening Guidebook", "/resources/background-screening-guidebook"),
  ("labbhr-drug-testing-cost-guidebook-q4-2026-v1.30.pdf", "drug-testing-cost-guidebook", "Drug Testing Cost Guidebook", "/resources/drug-testing-cost-guidebook"),
  ("labb-regional-drug-use-testing-panels-2026.pdf", "regional-drug-use", "Regional Drug Use and Recommended Testing Panels (2026)", "/drugs"),
  ("etest-cup-booklet-2026-labbhr-v9.00.pdf", "etest-cup-booklet", "eTest Cup Booklet", "/test-kits/urine-etest"),
  ("etest-cup-product-lineup-v1.00.pdf", "etest-cup-lineup", "eTest Cup Product Lineup", "/test-kits/urine-etest"),
  ("etest-swab-booklet-2026-labbhr-v9.21.pdf", "etest-swab-booklet", "eTest Swab Booklet", "/test-kits/oral-etest"),
  ("oraflo-booklet-2026-labbhr-v2.00.pdf", "oraflo-booklet", "OraFlo Rapid Drug Testing Booklet", "/test-kits/oraflo"),
  ("labbhr-kiosk-brochure-v3.40.pdf", "kiosk-brochure", "LabbHR Proctor Testing Kiosk Brochure", "/labbhr"),
]
def clean(t):
    t = t.replace(" ", " ").replace("—", ", ").replace("–", "-")
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"(\w)-\n(\w)", r"\1\2", t)
    return t
out = []
for fn, slug, title, url in SRC:
    txt = subprocess.run(["pdftotext", f"{root}/{fn}", "-"], capture_output=True, text=True).stdout
    pages = txt.split("\f")
    for pi, page in enumerate(pages, 1):
        page = clean(page)
        lines = [l.strip() for l in page.split("\n")]
        # drop running headers/footers and page numbers
        lines = [l for l in lines if l and not re.fullmatch(r"\d{1,3}", l) and not re.search(r"Ramsey Diagnostics Corporation d/b/a Labb.*2115", l)]
        if not lines: continue
        joined = " ".join(lines)
        if re.search(r"COPYRIGHT AND NOTICES|COPYRIGHT ©|TABLE OF CONTENTS", joined, re.I) or joined.count("....") > 5:
            continue
        paras, cur = [], []
        for l in lines:
            cur.append(l)
            if re.search(r"[.:?!)]$", l) and len(" ".join(cur)) > 200:
                paras.append(" ".join(cur)); cur = []
        if cur: paras.append(" ".join(cur))
        heading = next((l for l in lines[:6] if 3 < len(l) < 90 and not l.endswith(".")), lines[0][:90])
        buf = []
        def flush():
            body = " ".join(buf).strip()
            if len(body.split()) >= 25:
                out.append({"source": slug, "source_title": title, "url": url, "page": pi, "heading": heading, "body": body})
        for p in paras:
            if buf and len(" ".join(buf + [p]).split()) > 380:
                flush(); buf = []
            buf.append(p)
        flush()
for i, c in enumerate(out): c["id"] = hashlib.sha1(f'{c["source"]}|{c["page"]}|{c["body"][:80]}|{i}'.encode()).hexdigest()[:16]
json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False)
print(len(out), sum(len(c["body"].split()) for c in out))
