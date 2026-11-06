import { db } from "@/lib/db";
import { readJson, route } from "@/lib/api";
import { toDate } from "@/lib/dates";
import { transferSchema } from "@/lib/validators";

export const POST = route(async (req, { userId }) => {
  const v = transferSchema.parse(await readJson(req));
  return db.transaction.create({
    data: {
      type: "TRANSFER",
      description: v.description,
      amount: v.amount,
      date: toDate(v.date),
      status: "PAID",
      accountId: v.fromAccountId,
      toAccountId: v.toAccountId,
      userId,
    },
  });
});
