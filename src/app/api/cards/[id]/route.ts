import { db } from "@/lib/db";
import { readJson, route } from "@/lib/api";
import { cardSchema } from "@/lib/validators";

export const PUT = route(async (req, { params }) => {
  const data = cardSchema.parse(await readJson(req));
  return db.creditCard.update({ where: { id: params.id }, data });
});

export const DELETE = route(async (_req, { params }) => {
  const used = await db.transaction.count({ where: { cardId: params.id } });
  if (used > 0) {
    await db.creditCard.update({ where: { id: params.id }, data: { archived: true } });
    return { archived: true };
  }
  await db.creditCard.delete({ where: { id: params.id } });
  return { deleted: true };
});
