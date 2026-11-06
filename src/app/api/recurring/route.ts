import { db } from "@/lib/db";
import { HttpError, readJson, route } from "@/lib/api";
import { toDate } from "@/lib/dates";
import { recurringSchema } from "@/lib/validators";

export const GET = route(async () =>
  db.recurring.findMany({
    orderBy: [{ active: "desc" }, { nextDate: "asc" }],
    include: { account: { select: { name: true } }, card: { select: { name: true } }, category: { select: { name: true } } },
  }),
);

export const POST = route(async (req, { userId }) => {
  const v = recurringSchema.parse(await readJson(req));
  if (!v.cardId && !v.accountId) throw new HttpError(400, "Informe a conta ou o cartão");
  if (v.cardId && v.type !== "EXPENSE") throw new HttpError(400, "Cartão só pode ser usado em despesas");
  return db.recurring.create({
    data: {
      ...v,
      accountId: v.cardId ? null : v.accountId,
      startDate: toDate(v.startDate),
      nextDate: toDate(v.startDate),
      endDate: v.endDate ? toDate(v.endDate) : null,
      userId,
    },
  });
});
