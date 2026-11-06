import { db } from "@/lib/db";
import { HttpError, readJson, route } from "@/lib/api";
import { toDate } from "@/lib/dates";
import { position } from "@/lib/investments";
import { investmentEntrySchema } from "@/lib/validators";

/** Registra aporte, resgate ou atualização do valor de mercado. */
export const POST = route(async (req, { params, userId }) => {
  const v = investmentEntrySchema.parse(await readJson(req));
  if (v.type !== "VALUATION" && v.amount <= 0) throw new HttpError(400, "Valor deve ser maior que zero");
  const inv = await db.investment.findUniqueOrThrow({
    where: { id: params.id },
    include: { entries: { orderBy: [{ date: "asc" }, { createdAt: "asc" }] } },
  });
  if (v.type === "WITHDRAWAL") {
    const pos = position(inv.entries, v.date);
    if (v.amount > pos.value + 0.001) throw new HttpError(400, `Resgate maior que o valor disponível na data (${pos.value.toFixed(2)})`);
  }
  return db.investmentEntry.create({
    data: {
      investmentId: inv.id,
      type: v.type,
      amount: v.amount,
      date: toDate(v.date),
      accountId: v.type === "VALUATION" ? null : v.accountId,
      note: v.note,
      userId,
    },
  });
});
