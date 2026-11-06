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

export const INVESTMENT_TYPE_LABEL = {
  FIXED_INCOME: "Renda fixa",
  STOCKS: "Ações",
  REITS: "Fundos imobiliários",
  FUNDS: "Fundos de investimento",
  CRYPTO: "Criptomoedas",
  PENSION: "Previdência",
  INTERNATIONAL: "Exterior",
  OTHER: "Outros",
} as const;

export const INVESTMENT_TYPE_COLOR: Record<keyof typeof INVESTMENT_TYPE_LABEL, string> = {
  FIXED_INCOME: "#0ea5e9",
  STOCKS: "#6366f1",
  REITS: "#f59e0b",
  FUNDS: "#14b8a6",
  CRYPTO: "#f97316",
  PENSION: "#a855f7",
  INTERNATIONAL: "#22c55e",
  OTHER: "#64748b",
};

export const ENTRY_TYPE_LABEL = { CONTRIBUTION: "Aporte", WITHDRAWAL: "Resgate", VALUATION: "Atualização de valor" } as const;
