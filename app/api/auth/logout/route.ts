import { endSession } from "@/lib/auth";
import { go } from "@/lib/http";

export async function POST(req: Request) {
  await endSession();
  return go(req, "/login?signed_out=1");
}
