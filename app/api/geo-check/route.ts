// Temporary: shows which geo headers reach the server. Remove after checking.
export async function GET(req: Request) {
  const h = req.headers;
  return Response.json({ "cf-ipcountry": h.get("cf-ipcountry"), "x-vercel-ip-country": h.get("x-vercel-ip-country"), "true-client-ip": !!h.get("true-client-ip"), "cf-connecting-ip": !!h.get("cf-connecting-ip"), "x-forwarded-for": !!h.get("x-forwarded-for"), keys: [...h.keys()].filter((k) => /country|geo|cf-|region|city/i.test(k)) });
}
