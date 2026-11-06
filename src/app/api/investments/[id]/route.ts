import { db } from "@/lib/db";
import { readJson, route } from "@/lib/api";
import { investmentSchema } from "@/lib/validators";

export const PUT = route(async (req, { params }) =>
  db.investment.update({ where: { id: params.id }, data: investmentSchema.parse(await readJson(req)) }),
);

/** Exclui o investimento e todo o histórico (aportes/resgates deixam de afetar as contas). */
export const DELETE = route(async (_req, { params }) => {
  await db.investment.delete({ where: { id: params.id } });
  return { deleted: true };
});
