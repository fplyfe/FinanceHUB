import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, readJson, route } from "@/lib/api";
import { buildTxData } from "@/lib/finance";
import { transactionSchema } from "@/lib/validators";

export const PUT = route(async (req, { params }) => {
  const existing = await db.transaction.findUniqueOrThrow({ where: { id: params.id } });
  if (existing.type === "TRANSFER") throw new HttpError(400, "Transferências não podem ser editadas; exclua e crie novamente");
  const input = transactionSchema.parse(await readJson(req));
  return db.transaction.update({ where: { id: params.id }, data: buildTxData(input, existing) });
});

/** Alternar rapidamente pendente/pago. */
export const PATCH = route(async (req, { params }) => {
  const { status } = z.object({ status: z.enum(["PENDING", "PAID"]) }).parse(await readJson(req));
  const tx = await db.transaction.findUniqueOrThrow({ where: { id: params.id } });
  if (tx.cardId && !tx.accountId && status === "PAID") {
    throw new HttpError(400, "Compras no cartão são pagas pela fatura do cartão");
  }
  return db.transaction.update({ where: { id: params.id }, data: { status } });
});

export const DELETE = route(async (_req, { params }) => {
  await db.transaction.delete({ where: { id: params.id } });
  return { deleted: true };
});
