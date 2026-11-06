import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { monthRange } from "./dates";

export type TxFilters = {
  month?: string;
  type?: string;
  accountId?: string;
  cardId?: string;
  categoryId?: string;
  status?: string;
  q?: string;
};

export const txInclude = {
  account: { select: { id: true, name: true, color: true } },
  toAccount: { select: { id: true, name: true } },
  card: { select: { id: true, name: true, color: true } },
  category: { select: { id: true, name: true, color: true } },
  user: { select: { name: true } },
  installmentPlan: { select: { installments: true } },
} satisfies Prisma.TransactionInclude;

export function buildTxWhere(f: TxFilters): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {};
  if (f.month && /^\d{4}-\d{2}$/.test(f.month)) {
    const { start, end } = monthRange(f.month);
    where.date = { gte: start, lt: end };
  }
  if (f.type === "INCOME" || f.type === "EXPENSE" || f.type === "TRANSFER") where.type = f.type;
  if (f.status === "PENDING" || f.status === "PAID") where.status = f.status;
  if (f.accountId) where.OR = [{ accountId: f.accountId }, { toAccountId: f.accountId }];
  if (f.cardId) where.cardId = f.cardId;
  if (f.categoryId) where.categoryId = f.categoryId;
  if (f.q) where.description = { contains: f.q, mode: "insensitive" };
  return where;
}

export function listTransactions(f: TxFilters, take = 500) {
  return db.transaction.findMany({
    where: buildTxWhere(f),
    include: txInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
  });
}
