import { db } from "@/lib/db";
import { readJson, route } from "@/lib/api";
import { toDate } from "@/lib/dates";
import { goalSchema } from "@/lib/validators";

export const GET = route(async () => db.goal.findMany({ orderBy: { createdAt: "desc" } }));

export const POST = route(async (req) => {
  const v = goalSchema.parse(await readJson(req));
  return db.goal.create({ data: { ...v, deadline: v.deadline ? toDate(v.deadline) : null } });
});
