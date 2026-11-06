import { db } from "@/lib/db";
import { readJson, route } from "@/lib/api";
import { listInvestments } from "@/lib/investments";
import { investmentSchema } from "@/lib/validators";

export const GET = route(async () => listInvestments());

export const POST = route(async (req) => db.investment.create({ data: investmentSchema.parse(await readJson(req)) }));
