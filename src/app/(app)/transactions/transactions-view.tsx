"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowLeftRight, CheckCircle2, Circle, CreditCard, Pencil, Plus, Repeat, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge, Dot, Empty } from "@/components/ui/misc";
import { ActionButton, DeleteButton, FormDialog } from "@/components/app/form-dialog";
import { api } from "@/lib/client";
import { today } from "@/lib/dates";
import { brl, cn, fmtDate } from "@/lib/utils";

type Tx = {
  id: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  description: string;
  amount: number;
  date: string;
  status: "PENDING" | "PAID";
  notes: string | null;
  accountId: string | null;
  cardId: string | null;
  categoryId: string | null;
  recurringId: string | null;
  installmentNumber: number | null;
  account: { name: string } | null;
  toAccount: { name: string } | null;
  card: { name: string } | null;
  category: { name: string; color: string } | null;
  user: { name: string };
  installmentPlan: { installments: number } | null;
};
type Opt = { id: string; name: string };
type Cat = Opt & { type: "INCOME" | "EXPENSE" };

export function TransactionForm({ tx, accounts, cards, categories, defaultType = "EXPENSE" }: { tx?: Tx; accounts: Opt[]; cards: Opt[]; categories: Cat[]; defaultType?: "INCOME" | "EXPENSE" }) {
  const [type, setType] = useState<"INCOME" | "EXPENSE">(tx && tx.type !== "TRANSFER" ? tx.type : defaultType);
  const [payWith, setPayWith] = useState<"account" | "card">(tx?.cardId ? "card" : "account");
  const cats = categories.filter((c) => c.type === type);
  const card = type === "EXPENSE" && payWith === "card";

  return (
    <>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="payWith" value={card ? "card" : "account"} />
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
        {(["EXPENSE", "INCOME"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "rounded-md py-1.5 text-sm font-medium transition",
              type === t ? (t === "EXPENSE" ? "bg-destructive text-white shadow" : "bg-success text-white shadow") : "text-muted-foreground",
            )}
          >
            {t === "EXPENSE" ? "Despesa" : "Receita"}
          </button>
        ))}
      </div>
      <Field label="Descrição">
        <Input name="description" defaultValue={tx?.description} required maxLength={120} autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$)">
          <Input name="amount" type="number" step="0.01" min="0.01" defaultValue={tx?.amount} required inputMode="decimal" />
        </Field>
        <Field label="Data">
          <Input name="date" type="date" defaultValue={tx?.date.slice(0, 10) ?? today()} required />
        </Field>
      </div>
      {type === "EXPENSE" && cards.length > 0 && (
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1 text-sm">
          {(["account", "card"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPayWith(p)}
              className={cn("rounded-md py-1 font-medium", payWith === p ? "bg-card shadow" : "text-muted-foreground")}
            >
              {p === "account" ? "Conta" : "Cartão de crédito"}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {card ? (
          <Field label="Cartão">
            <Select name="cardId" defaultValue={tx?.cardId ?? cards[0]?.id} required>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="Conta">
            <Select name="accountId" defaultValue={tx?.accountId ?? accounts[0]?.id} required>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Categoria">
          <Select name="categoryId" defaultValue={tx?.categoryId ?? ""}>
            <option value="">Sem categoria</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {!card && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="paid" defaultChecked={tx ? tx.status === "PAID" : true} className="size-4 accent-[hsl(var(--primary))]" />
          {type === "INCOME" ? "Já recebido" : "Já pago"}
        </label>
      )}
      {type === "EXPENSE" && !tx && (
        <Field label="Parcelas (1 = à vista)">
          <Input name="installments" type="number" min={1} max={120} defaultValue={1} />
        </Field>
      )}
      <Field label="Observações">
        <Textarea name="notes" defaultValue={tx?.notes ?? ""} maxLength={500} />
      </Field>
    </>
  );
}

/** Converte o FormData do formulário e chama a API correta (lançamento simples ou parcelado). */
export async function submitTransaction(fd: FormData, id?: string) {
  const card = fd.get("payWith") === "card";
  const base = {
    description: fd.get("description"),
    date: fd.get("date"),
    categoryId: fd.get("categoryId"),
    accountId: card ? null : fd.get("accountId"),
    cardId: card ? fd.get("cardId") : null,
  };
  const installments = Number(fd.get("installments") ?? 1);
  if (!id && installments > 1) {
    return api("/api/installments", "POST", { ...base, totalAmount: fd.get("amount"), firstDate: base.date, installments });
  }
  const body = { ...base, type: fd.get("type"), amount: fd.get("amount"), notes: fd.get("notes"), status: fd.get("paid") ? "PAID" : "PENDING" };
  return id ? api(`/api/transactions/${id}`, "PUT", body) : api("/api/transactions", "POST", body);
}

export function TransactionsView({
  rows,
  accounts,
  cards,
  categories,
  filters,
  month,
}: {
  rows: Tx[];
  accounts: Opt[];
  cards: Opt[];
  categories: Cat[];
  filters: { type: string; status: string; accountId: string; categoryId: string; q: string };
  month: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const setFilter = (k: string, v: string) => {
    const next = new URLSearchParams(sp.toString());
    next.set("month", month);
    v ? next.set(k, v) : next.delete(k);
    router.push(`${pathname}?${next.toString()}`);
  };

  const income = rows.filter((r) => r.type === "INCOME").reduce((s, r) => s + r.amount, 0);
  const expense = rows.filter((r) => r.type === "EXPENSE").reduce((s, r) => s + r.amount, 0);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <form
          className="relative min-w-48 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setFilter("q", String(new FormData(e.currentTarget).get("q") ?? ""));
          }}
        >
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input name="q" defaultValue={filters.q} placeholder="Buscar descrição…" className="pl-9" />
        </form>
        <Select className="w-auto" value={filters.type} onChange={(e) => setFilter("type", e.target.value)} aria-label="Tipo">
          <option value="">Todos os tipos</option>
          <option value="INCOME">Receitas</option>
          <option value="EXPENSE">Despesas</option>
          <option value="TRANSFER">Transferências</option>
        </Select>
        <Select className="w-auto" value={filters.status} onChange={(e) => setFilter("status", e.target.value)} aria-label="Status">
          <option value="">Qualquer status</option>
          <option value="PAID">Pagos</option>
          <option value="PENDING">Pendentes</option>
        </Select>
        <Select className="w-auto" value={filters.accountId} onChange={(e) => setFilter("accountId", e.target.value)} aria-label="Conta">
          <option value="">Todas as contas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Select className="w-auto" value={filters.categoryId} onChange={(e) => setFilter("categoryId", e.target.value)} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <FormDialog
          title="Novo lançamento"
          onSubmit={(fd) => submitTransaction(fd)}
          trigger={
            <Button>
              <Plus /> Novo
            </Button>
          }
        >
          <TransactionForm accounts={accounts} cards={cards} categories={categories} />
        </FormDialog>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>
          Receitas: <b className="text-success">{brl(income)}</b>
        </span>
        <span>
          Despesas: <b className="text-destructive">{brl(expense)}</b>
        </span>
        <span>
          Resultado: <b className="text-foreground">{brl(income - expense)}</b>
        </span>
      </div>

      {rows.length === 0 ? (
        <Empty>Nenhum lançamento encontrado neste período.</Empty>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="w-10 p-3" />
                  <th className="p-3">Data</th>
                  <th className="p-3">Descrição</th>
                  <th className="hidden p-3 md:table-cell">Categoria</th>
                  <th className="hidden p-3 sm:table-cell">Conta</th>
                  <th className="p-3 text-right">Valor</th>
                  <th className="w-24 p-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => {
                  const overdue = r.status === "PENDING" && r.date.slice(0, 10) < today();
                  const cardPending = !!r.cardId && !r.accountId && r.status === "PENDING";
                  return (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="p-3">
                        {r.type === "TRANSFER" ? (
                          <ArrowLeftRight className="size-4 text-muted-foreground" />
                        ) : cardPending ? (
                          <CreditCard className="size-4 text-muted-foreground" aria-label="Na fatura do cartão" />
                        ) : (
                          <ActionButton
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            title={r.status === "PAID" ? "Marcar como pendente" : "Marcar como pago"}
                            action={() => api(`/api/transactions/${r.id}`, "PATCH", { status: r.status === "PAID" ? "PENDING" : "PAID" })}
                          >
                            {r.status === "PAID" ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5 text-muted-foreground" />}
                          </ActionButton>
                        )}
                      </td>
                      <td className={cn("whitespace-nowrap p-3", overdue && "font-medium text-destructive")}>{fmtDate(r.date).slice(0, 5)}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium">{r.description}</span>
                          {r.installmentNumber && (
                            <Badge tone="primary">
                              {r.installmentNumber}/{r.installmentPlan?.installments}
                            </Badge>
                          )}
                          {r.recurringId && <Repeat className="size-3 text-muted-foreground" aria-label="Recorrente" />}
                          {overdue && <Badge tone="danger">atrasado</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">{r.user.name}</div>
                      </td>
                      <td className="hidden p-3 md:table-cell">
                        {r.category ? (
                          <span className="flex items-center gap-2">
                            <Dot color={r.category.color} />
                            {r.category.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="hidden p-3 text-muted-foreground sm:table-cell">
                        {r.type === "TRANSFER" ? `${r.account?.name} → ${r.toAccount?.name}` : (r.card ? r.card.name : r.account?.name)}
                      </td>
                      <td
                        className={cn(
                          "whitespace-nowrap p-3 text-right font-semibold",
                          r.type === "INCOME" ? "text-success" : r.type === "EXPENSE" ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {r.type === "EXPENSE" ? "-" : r.type === "INCOME" ? "+" : ""}
                        {brl(r.amount)}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end">
                          {r.type !== "TRANSFER" && (
                            <FormDialog
                              title="Editar lançamento"
                              onSubmit={(fd) => submitTransaction(fd, r.id)}
                              trigger={
                                <Button variant="ghost" size="icon" aria-label="Editar">
                                  <Pencil />
                                </Button>
                              }
                            >
                              <TransactionForm tx={r} accounts={accounts} cards={cards} categories={categories} />
                            </FormDialog>
                          )}
                          <DeleteButton
                            confirm={r.installmentNumber ? "Excluir apenas esta parcela?" : "Excluir este lançamento?"}
                            action={() => api(`/api/transactions/${r.id}`, "DELETE")}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
