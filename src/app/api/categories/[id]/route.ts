import { db } from "@/lib/db";
import { readJson, route } from "@/lib/api";
import { categorySchema } from "@/lib/validators";

export const PUT = route(async (req, { params }) =>
  db.category.update({ where: { id: params.id }, data: categorySchema.parse(await readJson(req)) }),
);

// Lançamentos da categoria ficam "sem categoria" (onDelete: SetNull)
export const DELETE = route(async (_req, { params }) => db.category.delete({ where: { id: params.id } }));
