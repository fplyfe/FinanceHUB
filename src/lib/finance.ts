import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db, n } from "./db";
import { HttpError } from "./api";
import { addMonths, advanceDate, invoiceDueDate, invoiceMonth, toDate, toStr, today } from "./dates";
import { installmentSchema, transactionSchema } from "./validators";

type TxInput = z.infer<typeof transactionSchema>;
type InstallmentInput = z.infer<typeof installmentSchema>;

/**
 * Saldo de cada conta = saldo inicial + receitas pagas - despesas pagas +/- transferências
 * - aportes em investimentos + resgates de investimentos. Com `asOf`, considera só até essa data.
 */
export async function accountBalances(asOf?: Date) {
  const date = asOf ? { lte: asOf } : undefined;
  const [accounts, paid, incoming, invest] = await Promise.all([
    db.account.findMany({ select: { id: true, initialBalance: true } }),
    db.transaction.groupBy({
      by: ["accountId", "type"],
      where: { status: "PAID", accountId: { not: null }, date },
      _sum: { amount: true },
    }),
    db.transaction.groupBy({
      by: ["toAccountId"],
      where: { type: "TRANSFER", status: "PAID", toAccountId: { not: null }, date },
      _sum: { amount: true },
    }),
    db.investmentEntry.groupBy({
      by: ["accountId", "type"],
      where: { accountId: { not: null }, type: { in: ["CONTRIBUTION", "WITHDRAWAL"] }, date },
      _sum: { amount: true },
    }),
  ]);
  const bal = new Map<string, number>(accounts.map((a) => [a.id, n(a.initialBalance)]));
  const add = (id: string, v: number) => bal.set(id, (bal.get(id) ?? 0) + v);
  for (const r of paid) {
    const v = n(r._sum.amount);
    add(r.accountId!, r.type === "INCOME" ? v : -v);
  }
  for (const r of incoming) add(r.toAccountId!, n(r._sum.amount));
  for (const r of invest) add(r.accountId!, r.type === "WITHDRAWAL" ? n(r._sum.amount) : -n(r._sum.amount));
  for (const [k, v] of bal) bal.set(k, Math.round(v * 100) / 100);
  return bal;
}

/** Limite utilizado por cartão = soma das compras ainda não pagas (inclui parcelas futuras). */
export async function cardUsage() {
  const rows = await db.transaction.groupBy({
    by: ["cardId"],
    where: { cardId: { not: null }, status: "PENDING" },
    _sum: { amount: true },
  });
  return new Map(rows.map((r) => [r.cardId!, n(r._sum.amount)]));
}

export type InvoiceItem = {
  id: string;
  description: string;
  amount: number;
  date: string;
  status: "PENDING" | "PAID";
  installmentNumber: number | null;
  installmentTotal: number | null;
  category: string | null;
};
export type Invoice = { month: string; dueDate: string; total: number; paid: boolean; items: InvoiceItem[] };

export async function getInvoices(card: { id: string; closingDay: number; dueDay: number }): Promise<Invoice[]> {
  const txs = await db.transaction.findMany({
    where: { cardId: card.id },
    orderBy: { date: "asc" },
    include: { category: { select: { name: true } }, installmentPlan: { select: { installments: true } } },
  });
  const map = new Map<string, InvoiceItem[]>();
  for (const t of txs) {
    const m = invoiceMonth(toStr(t.date), card.closingDay);
    const arr = map.get(m) ?? [];
    arr.push({
      id: t.id,
      description: t.description,
      amount: n(t.amount),
      date: toStr(t.date),
      status: t.status,
      installmentNumber: t.installmentNumber,
      installmentTotal: t.installmentPlan?.installments ?? null,
      category: t.category?.name ?? null,
    });
    map.set(m, arr);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, items]) => ({
      month,
      dueDate: invoiceDueDate(month, card.closingDay, card.dueDay),
      total: Math.round(items.reduce((s, i) => s + i.amount, 0) * 100) / 100,
      paid: items.every((i) => i.status === "PAID"),
      items,
    }));
}

/** Normaliza o payload do formulário para dados do Prisma, aplicando as regras de negócio. */
export function buildTxData(input: TxInput, existing?: { accountId: string | null; status: "PENDING" | "PAID"; cardId: string | null }) {
  const base = {
    type: input.type,
    description: input.description,
    amount: input.amount,
    date: toDate(input.date),
    notes: input.notes,
    categoryId: input.categoryId,
  };
  if (input.cardId) {
    if (input.type !== "EXPENSE") throw new HttpError(400, "Cartão só pode ser usado em despesas");
    // Compra no cartão fica pendente (na fatura) até o pagamento da fatura.
    const keepPaid = existing?.cardId === input.cardId && existing.status === "PAID";
    return {
      ...base,
      cardId: input.cardId,
      accountId: keepPaid ? existing!.accountId : null,
      status: keepPaid ? ("PAID" as const) : ("PENDING" as const),
    };
  }
  if (!input.accountId) throw new HttpError(400, "Informe a conta");
  return { ...base, cardId: null, accountId: input.accountId, status: input.status };
}

export async function createInstallments(input: InstallmentInput, userId: string) {
  if (!input.cardId && !input.accountId) throw new HttpError(400, "Informe a conta ou o cartão");
  const count = input.installments;
  const cents = Math.round(input.totalAmount * 100);
  const base = Math.floor(cents / count);
  const rem = cents - base * count; // centavos restantes vão para as primeiras parcelas
  const t = today();

  return db.installmentPlan.create({
    data: {
      description: input.description,
      totalAmount: input.totalAmount,
      installments: count,
      firstDate: toDate(input.firstDate),
      accountId: input.cardId ? null : input.accountId,
      cardId: input.cardId,
      categoryId: input.categoryId,
      userId,
      transactions: {
        create: Array.from({ length: count }, (_, i) => {
          const date = addMonths(input.firstDate, i);
          return {
            type: "EXPENSE" as const,
            description: input.description,
            amount: (base + (i < rem ? 1 : 0)) / 100,
            date: toDate(date),
            status: !input.cardId && date <= t ? ("PAID" as const) : ("PENDING" as const),
            installmentNumber: i + 1,
            accountId: input.cardId ? null : input.accountId,
            cardId: input.cardId,
            categoryId: input.categoryId,
            userId,
          };
        }),
      },
    },
  });
}

/** Gera os lançamentos das recorrências vencidas (idempotente e seguro contra concorrência). */
export async function generateRecurring() {
  const t = today();
  const due = await db.recurring.findMany({ where: { active: true, nextDate: { lte: toDate(t) } } });
  let created = 0;
  for (const r of due) {
    const start = toStr(r.startDate);
    const end = r.endDate ? toStr(r.endDate) : null;
    let next = toStr(r.nextDate);
    const rows: Prisma.TransactionCreateManyInput[] = [];
    let guard = 0;
    while (next <= t && (!end || next <= end) && guard++ < 120) {
      rows.push({
        type: r.type,
        description: r.description,
        amount: r.amount,
        date: toDate(next),
        status: r.autoPay && r.accountId && !r.cardId ? "PAID" : "PENDING",
        accountId: r.cardId ? null : r.accountId,
        cardId: r.cardId,
        categoryId: r.categoryId,
        userId: r.userId,
        recurringId: r.id,
      });
      next = advanceDate(start, next, r.frequency);
    }
    const finished = end !== null && next > end;
    await db.$transaction(async (tx) => {
      // "claim" otimista: só quem conseguir avançar o nextDate cria os lançamentos
      const claim = await tx.recurring.updateMany({
        where: { id: r.id, nextDate: r.nextDate },
        data: { nextDate: toDate(next), active: !finished },
      });
      if (claim.count === 1 && rows.length) {
        await tx.transaction.createMany({ data: rows });
        created += rows.length;
      }
    });
  }
  return created;
}
