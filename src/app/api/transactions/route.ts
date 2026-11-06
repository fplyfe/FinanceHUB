import { db } from "@/lib/db";
import { readJson, route } from "@/lib/api";
import { buildTxData } from "@/lib/finance";
import { listTransactions } from "@/lib/queries";
import { transactionSchema } from "@/lib/validators";

export const GET = route(async (req) => {
  const sp = req.nextUrl.searchParams;
  return listTransactions({
    month: sp.get("month") ?? undefined,
    type: sp.get("type") ?? undefined,
    accountId: sp.get("accountId") ?? undefined,
    cardId: sp.get("cardId") ?? undefined,
    categoryId: sp.get("categoryId") ?? undefined,
    status: sp.get("status") ?? undefined,
    q: sp.get("q") ?? undefined,
  });
});

export const POST = route(async (req, { userId }) => {
  const input = transactionSchema.parse(await readJson(req));
  return db.transaction.create({ data: { ...buildTxData(input), userId } });
});
