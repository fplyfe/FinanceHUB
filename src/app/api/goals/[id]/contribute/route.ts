import { db, n } from "@/lib/db";
import { HttpError, readJson, route } from "@/lib/api";
import { toDate } from "@/lib/dates";
import { contributionSchema } from "@/lib/validators";

/** Aporte (valor positivo) ou resgate (negativo) em uma meta. */
export const POST = route(async (req, { params, userId }) => {
  const v = contributionSchema.parse(await readJson(req));
  return db.$transaction(async (tx) => {
    const goal = await tx.goal.findUniqueOrThrow({ where: { id: params.id } });
    if (n(goal.currentAmount) + v.amount < 0) throw new HttpError(400, "Resgate maior que o valor acumulado");
    await tx.goalContribution.create({
      data: { goalId: goal.id, userId, amount: v.amount, date: toDate(v.date), note: v.note },
    });
    return tx.goal.update({ where: { id: goal.id }, data: { currentAmount: { increment: v.amount } } });
  });
});
