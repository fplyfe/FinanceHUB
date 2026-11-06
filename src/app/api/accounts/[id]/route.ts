import { db } from "@/lib/db";
import { readJson, route } from "@/lib/api";
import { accountSchema } from "@/lib/validators";

export const PUT = route(async (req, { params }) => {
  const data = accountSchema.parse(await readJson(req));
  return db.account.update({ where: { id: params.id }, data });
});

// Contas com histórico são arquivadas (preserva o histórico); sem uso, são excluídas.
export const DELETE = route(async (_req, { params }) => {
  const [used, invested] = await Promise.all([
    db.transaction.count({ where: { OR: [{ accountId: params.id }, { toAccountId: params.id }] } }),
    db.investmentEntry.count({ where: { accountId: params.id } }),
  ]);
  if (used + invested > 0) {
    await db.account.update({ where: { id: params.id }, data: { archived: true } });
    return { archived: true };
  }
  await db.account.delete({ where: { id: params.id } });
  return { deleted: true };
});
