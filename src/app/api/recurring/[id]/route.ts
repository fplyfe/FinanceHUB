import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, readJson, route } from "@/lib/api";
import { toDate } from "@/lib/dates";
import { recurringSchema } from "@/lib/validators";

export const PUT = route(async (req, { params }) => {
  const v = recurringSchema.parse(await readJson(req));
  if (!v.cardId && !v.accountId) throw new HttpError(400, "Informe a conta ou o cartão");
  if (v.cardId && v.type !== "EXPENSE") throw new HttpError(400, "Cartão só pode ser usado em despesas");
  // startDate/nextDate não são alterados na edição para não duplicar lançamentos já gerados
  const { startDate: _s, ...rest } = v;
  void _s;
  return db.recurring.update({
    where: { id: params.id },
    data: { ...rest, accountId: v.cardId ? null : v.accountId, endDate: v.endDate ? toDate(v.endDate) : null },
  });
});

export const PATCH = route(async (req, { params }) => {
  const { active } = z.object({ active: z.boolean() }).parse(await readJson(req));
  return db.recurring.update({ where: { id: params.id }, data: { active } });
});

// Os lançamentos já gerados permanecem (recurringId vira null).
export const DELETE = route(async (_req, { params }) => {
  await db.recurring.delete({ where: { id: params.id } });
  return { deleted: true };
});
