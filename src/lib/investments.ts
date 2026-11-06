import type { InvestmentEntryType, InvestmentType } from "@prisma/client";
import { db, n } from "./db";
import { accountBalances, cardUsage } from "./finance";
import { MONTHS, currentMonth, monthRange, shiftMonth, toStr, addDays } from "./dates";

const r2 = (v: number) => Math.round(v * 100) / 100;

export type Position = { value: number; invested: number; profit: number; profitPct: number };

type EntryLike = { type: InvestmentEntryType; amount: unknown; date: Date | string };

/**
 * Posição de um investimento até `asOf` (inclusive), pelo método do custo médio:
 * - aporte: soma ao valor e ao custo
 * - resgate: reduz o valor e o custo proporcionalmente
 * - atualização: define o valor de mercado na data
 * As entradas devem vir ordenadas por data (e criação).
 */
export function position(entries: EntryLike[], asOf?: string): Position {
  let value = 0;
  let invested = 0;
  for (const e of entries) {
    if (asOf && toStr(e.date as Date) > asOf) break;
    const a = n(e.amount as number);
    if (e.type === "CONTRIBUTION") {
      value += a;
      invested += a;
    } else if (e.type === "WITHDRAWAL") {
      const ratio = value > 0 ? Math.min(1, a / value) : 1;
      invested -= invested * ratio;
      value -= a;
    } else {
      value = a;
    }
  }
  value = r2(Math.max(0, value));
  invested = r2(Math.max(0, invested));
  const profit = r2(value - invested);
  return { value, invested, profit, profitPct: invested > 0 ? (profit / invested) * 100 : 0 };
}

const entryOrder = [{ date: "asc" as const }, { createdAt: "asc" as const }];

export async function listInvestments() {
  const items = await db.investment.findMany({
    where: { archived: false },
    orderBy: { name: "asc" },
    include: { entries: { orderBy: entryOrder, include: { account: { select: { name: true } }, user: { select: { name: true } } } } },
  });
  return items.map((i) => ({ ...i, ...position(i.entries) }));
}

export async function investmentsByType() {
  const items = await listInvestments();
  const map = new Map<InvestmentType, number>();
  for (const i of items) map.set(i.type, (map.get(i.type) ?? 0) + i.value);
  return { items, byType: [...map.entries()].map(([type, value]) => ({ type, value })).sort((a, b) => b.value - a.value) };
}

/** Balanço patrimonial atual: ativos (contas + investimentos) - passivos (cartões). */
export async function netWorth() {
  const [accounts, balances, cards, usage, { items, byType }] = await Promise.all([
    db.account.findMany({ where: { archived: false }, orderBy: { name: "asc" }, select: { id: true, name: true, color: true, type: true } }),
    accountBalances(),
    db.creditCard.findMany({ where: { archived: false }, orderBy: { name: "asc" }, select: { id: true, name: true, color: true } }),
    cardUsage(),
    investmentsByType(),
  ]);
  const acc = accounts.map((a) => ({ ...a, balance: balances.get(a.id) ?? 0 }));
  const cash = r2(acc.filter((a) => a.balance > 0).reduce((s, a) => s + a.balance, 0));
  const overdraft = r2(-acc.filter((a) => a.balance < 0).reduce((s, a) => s + a.balance, 0));
  const invested = r2(items.reduce((s, i) => s + i.value, 0));
  const cardDebt = r2(cards.reduce((s, c) => s + (usage.get(c.id) ?? 0), 0));
  const assets = r2(cash + invested);
  const liabilities = r2(cardDebt + overdraft);
  return {
    accounts: acc,
    cards: cards.map((c) => ({ ...c, debt: usage.get(c.id) ?? 0 })),
    investments: items.map(({ entries: _e, ...i }) => (void _e, i)),
    byType,
    cash,
    invested,
    overdraft,
    cardDebt,
    assets,
    liabilities,
    net: r2(assets - liabilities),
  };
}

/**
 * Evolução mensal (fim de cada mês) de contas + investimentos.
 * Dívidas de cartão não entram no histórico (não há data de pagamento registrada).
 */
export async function netWorthHistory(months = 12) {
  const last = currentMonth();
  const first = shiftMonth(last, -(months - 1));
  const entries = await db.investmentEntry.findMany({ orderBy: entryOrder, select: { investmentId: true, type: true, amount: true, date: true } });
  const byInv = new Map<string, typeof entries>();
  for (const e of entries) byInv.set(e.investmentId, [...(byInv.get(e.investmentId) ?? []), e]);

  const out: { label: string; month: string; accounts: number; investments: number; total: number }[] = [];
  for (let i = 0; i < months; i++) {
    const m = shiftMonth(first, i);
    const endStr = addDays(toStr(monthRange(m).end), -1);
    const bal = await accountBalances(monthRange(m).end > new Date() ? undefined : new Date(endStr + "T00:00:00.000Z"));
    const accounts = r2([...bal.values()].reduce((s, v) => s + v, 0));
    const investments = r2([...byInv.values()].reduce((s, list) => s + position(list, endStr).value, 0));
    out.push({ month: m, label: `${MONTHS[Number(m.slice(5)) - 1]}/${m.slice(2, 4)}`, accounts, investments, total: r2(accounts + investments) });
  }
  return out;
}
