import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, readJson, route } from "@/lib/api";
import { getInvoices } from "@/lib/finance";

const schema = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), accountId: z.string().min(1, "Informe a conta de pagamento") });

/** Paga uma fatura: marca as compras como pagas e debita da conta escolhida. */
export const POST = route(async (req, { params }) => {
  const { month, accountId } = schema.parse(await readJson(req));
  const card = await db.creditCard.findUniqueOrThrow({ where: { id: params.id } });
  const invoice = (await getInvoices(card)).find((i) => i.month === month);
  if (!invoice) throw new HttpError(404, "Fatura não encontrada");
  const ids = invoice.items.filter((i) => i.status === "PENDING").map((i) => i.id);
  if (!ids.length) throw new HttpError(400, "Esta fatura já está paga");
  await db.transaction.updateMany({ where: { id: { in: ids } }, data: { status: "PAID", accountId } });
  return { paid: ids.length, total: invoice.total };
});
