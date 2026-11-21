import { sameOrigin } from "@/lib/auth";
import { isOpen, requestByToken, signContract } from "@/lib/contracts";
import { clientIp, field, go } from "@/lib/http";

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  const back = (e?: string) => go(req, `/contract/${token}${e ? `?e=${e}` : ""}`);
  if (!(await sameOrigin())) return back("session");
  const r = await requestByToken(token);
  if (!r || !isOpen(r)) return back();
  const fd = await req.formData();
  const name = field(fd, "name", 120);
  const title = field(fd, "title", 120);
  const company = field(fd, "company", 200);
  const state = field(fd, "state", 60);
  const typed = field(fd, "signature", 120);
  if (!name || !company || !state) return back("missing");
  if (fd.get("consent") !== "yes" || fd.get("agree") !== "yes") return back("consent");
  if (norm(typed) !== norm(name)) return back("signature");
  try {
    const res = await signContract(r, { name, title, company, state, ip: clientIp(req.headers), agent: (req.headers.get("user-agent") || "unknown").slice(0, 300) });
    if (res.error) return back();
  } catch (e) {
    console.error("[contract] signing failed", e);
    return back("failed");
  }
  return go(req, `/contract/${token}?signed=1`);
}
