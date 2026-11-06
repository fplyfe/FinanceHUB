import { db } from "@/lib/db";
import { route } from "@/lib/api";
import { getInvoices } from "@/lib/finance";

export const GET = route(async (_req, { params }) => {
  const card = await db.creditCard.findUniqueOrThrow({ where: { id: params.id } });
  return getInvoices(card);
});
