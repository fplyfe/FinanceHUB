import { db } from "@/lib/db";
import { route } from "@/lib/api";

/** Remove o parcelamento e todas as suas parcelas (cascata). */
export const DELETE = route(async (_req, { params }) => {
  await db.installmentPlan.delete({ where: { id: params.id } });
  return { deleted: true };
});
