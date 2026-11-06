import { db } from "@/lib/db";
import { readJson, route } from "@/lib/api";
import { categorySchema } from "@/lib/validators";

export const GET = route(async () => db.category.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }));

export const POST = route(async (req) => db.category.create({ data: categorySchema.parse(await readJson(req)) }));
