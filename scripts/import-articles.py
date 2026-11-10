"""Convert a Shopify Admin GraphQL articles export into content/articles.json.
Strips Shopify editor attributes and inline styles, removes em dashes (brand rule)."""
import json, re, sys, html
src = sys.argv[1]
raw = json.load(open(src))
data = json.loads(raw[1]["text"]) if isinstance(raw, list) else raw
nodes = data["data"]["articles"]["nodes"]

def clean(h):
    if not h: return ""
    h = re.sub(r'\s(data-mce-[\w-]+|style|class|id|dir|role|aria-level)="[^"]*"', "", h)
    h = re.sub(r"<span>(.*?)</span>", r"\1", h, flags=re.S)
    h = re.sub(r"<(/?)b>", r"<\1strong>", h)
    h = re.sub(r"<h1>", "<h2>", h); h = re.sub(r"</h1>", "</h2>", h)
    h = re.sub(r"<p>\s*(&nbsp;)?\s*</p>", "", h)
    h = h.replace(" — ", ", ").replace("—", ", ").replace(" – ", ", ")
    return h.strip()

def text(h):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h))).strip()

out = []
for n in nodes:
    body = clean(n["body"])
    desc = text(clean(n.get("summary") or "")) or text(body)
    desc = desc[:155].rsplit(" ", 1)[0] + "..." if len(desc) > 158 else desc
    out.append({
        "slug": n["handle"], "title": n["title"].replace("—", ","), "publishedAt": n["publishedAt"],
        "author": (n.get("author") or {}).get("name") or "Labb",
        "image": (n.get("image") or {}).get("url"), "imageAlt": (n.get("image") or {}).get("altText"),
        "description": desc, "html": body,
        "words": len(text(body).split()),
    })
json.dump(out, open("content/articles.json", "w"), indent=1, ensure_ascii=False)
for a in out: print(a["words"], a["slug"], bool(a["image"]))
