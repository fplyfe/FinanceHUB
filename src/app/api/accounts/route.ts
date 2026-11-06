import { db } from "@/lib/db";
import { readJson, route } from "@/lib/api";
import { accountBalances } from "@/lib/finance";
import { accountSchema } from "@/lib/validators";

export const GET = route(async () => {
  const [accounts, bal] = await Promise.all([
    db.account.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
    accountBalances(),
  ]);
  return accounts.map((a) => ({ ...a, balance: bal.get(a.id) ?? 0 }));
});

export const POST = route(async (req) => {
  const data = accountSchema.parse(await readJson(req));
  return db.account.create({ data });
});
