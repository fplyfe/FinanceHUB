import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const brl = (v: number | string | null | undefined) => brlFmt.format(Number(v ?? 0));

/** "2026-11-06..." -> "06/11/2026" */
export function fmtDate(s: string | null | undefined) {
  if (!s) return "";
  const [y, m, d] = s.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export const pct = (part: number, total: number) => (total > 0 ? Math.min(100, Math.max(0, (part / total) * 100)) : 0);

export const TX_TYPE_LABEL = { INCOME: "Receita", EXPENSE: "Despesa", TRANSFER: "Transferência" } as const;
export const ACCOUNT_TYPE_LABEL = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  CASH: "Dinheiro",
  INVESTMENT: "Investimentos",
  WALLET: "Carteira digital",
} as const;
export const FREQUENCY_LABEL = { WEEKLY: "Semanal", MONTHLY: "Mensal", YEARLY: "Anual" } as const;
