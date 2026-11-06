import { db } from "@/lib/db";
import { readJson, route } from "@/lib/api";
import { createInstallments } from "@/lib/finance";
import { installmentSchema } from "@/lib/validators";

export const GET = route(async () =>
  db.installmentPlan.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      card: { select: { name: true } },
      account: { select: { name: true } },
      category: { select: { name: true } },
      transactions: { select: { status: true } },
    },
  }),
);

export const POST = route(async (req, { userId }) => createInstallments(installmentSchema.parse(await readJson(req)), userId));
