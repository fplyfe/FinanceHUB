import { db } from "@/lib/db";
import { readJson, route } from "@/lib/api";
import { toDate } from "@/lib/dates";
import { goalSchema } from "@/lib/validators";

export const PUT = route(async (req, { params }) => {
  const v = goalSchema.parse(await readJson(req));
  return db.goal.update({ where: { id: params.id }, data: { ...v, deadline: v.deadline ? toDate(v.deadline) : null } });
});

export const DELETE = route(async (_req, { params }) => {
  await db.goal.delete({ where: { id: params.id } });
  return { deleted: true };
});
