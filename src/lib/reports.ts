import { db, n } from "./db";
import { toDate, toStr, addDays, currentMonth, monthRange } from "./dates";

export type ReportRow = {
  date: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  description: string;
  category: string;
  account: string;
  status: "PENDING" | "PAID";
  amount: number;
};

export type Report = {
  from: string;
  to: string;
  income: number;
  expense: number;
  balance: number;
  byCategory: { name: string; type: "INCOME" | "EXPENSE"; total: number; pct: number }[];
  rows: ReportRow[];
};

export function defaultRange() {
  const m = currentMonth();
  const { end } = monthRange(m);
  return { from: `${m}-01`, to: addDays(toStr(end), -1) };
}

export async function getReport(from: string, to: string): Promise<Report> {
  const txs = await db.transaction.findMany({
    where: { date: { gte: toDate(from), lte: toDate(to) } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: {
      category: { select: { name: true } },
      account: { select: { name: true } },
      toAccount: { select: { name: true } },
      card: { select: { name: true } },
    },
  });

  const rows: ReportRow[] = txs.map((t) => ({
    date: toStr(t.date),
    type: t.type,
    description: t.description,
    category: t.category?.name ?? (t.type === "TRANSFER" ? "Transferência" : "Sem categoria"),
    account:
      t.type === "TRANSFER"
        ? `${t.account?.name ?? "?"} → ${t.toAccount?.name ?? "?"}`
        : (t.card ? `Cartão ${t.card.name}` : t.account?.name) ?? "",
    status: t.status,
    amount: n(t.amount),
  }));

  let income = 0;
  let expense = 0;
  const cat = new Map<string, { name: string; type: "INCOME" | "EXPENSE"; total: number }>();
  for (const r of rows) {
    if (r.type === "TRANSFER") continue;
    if (r.type === "INCOME") income += r.amount;
    else expense += r.amount;
    const key = `${r.type}:${r.category}`;
    const cur = cat.get(key) ?? { name: r.category, type: r.type, total: 0 };
    cur.total += r.amount;
    cat.set(key, cur);
  }
  const byCategory = [...cat.values()]
    .sort((a, b) => b.total - a.total)
    .map((c) => ({ ...c, pct: (c.total / (c.type === "INCOME" ? income : expense || 1)) * 100 }));

  return { from, to, income, expense, balance: income - expense, byCategory, rows };
}
