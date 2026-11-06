import { db } from "@/lib/db";
import { readJson, route } from "@/lib/api";
import { cardUsage } from "@/lib/finance";
import { cardSchema } from "@/lib/validators";

export const GET = route(async () => {
  const [cards, usage] = await Promise.all([
    db.creditCard.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
    cardUsage(),
  ]);
  return cards.map((c) => ({ ...c, used: usage.get(c.id) ?? 0 }));
});

export const POST = route(async (req) => {
  const data = cardSchema.parse(await readJson(req));
  return db.creditCard.create({ data });
});
