"use client";

import { useState } from "react";
import { CreditCard, Pencil, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge, Empty, PageHeader, Progress } from "@/components/ui/misc";
import { DeleteButton, FormDialog } from "@/components/app/form-dialog";
import { api } from "@/lib/client";
import { currentMonth, monthLabel } from "@/lib/dates";
import { brl, fmtDate, pct } from "@/lib/utils";

type Item = { id: string; description: string; amount: number; date: string; status: "PENDING" | "PAID"; installmentNumber: number | null; installmentTotal: number | null; category: string | null };
type Invoice = { month: string; dueDate: string; total: number; paid: boolean; items: Item[] };
type CardT = { id: string; name: string; brand: string | null; limit: number; closingDay: number; dueDay: number; color: string; payAccountId: string | null; used: number; invoices: Invoice[] };
type Opt = { id: string; name: string };

function CardForm({ c, accounts }: { c?: CardT; accounts: Opt[] }) {
  return (
    <>
      <Field label="Nome">
        <Input name="name" defaultValue={c?.name} required maxLength={60} autoFocus placeholder="Ex.: Nubank Roxinho" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bandeira (opcional)">
          <Input name="brand" defaultValue={c?.brand ?? ""} placeholder="Visa, Master…" />
        </Field>
        <Field label="Limite (R$)">
          <Input name="limit" type="number" step="0.01" min="1" defaultValue={c?.limit} required />
        </Field>
        <Field label="Dia de fechamento">
          <Input name="closingDay" type="number" min={1} max={31} defaultValue={c?.closingDay ?? 1} required />
        </Field>
        <Field label="Dia de vencimento">
          <Input name="dueDay" type="number" min={1} max={31} defaultValue={c?.dueDay ?? 10} required />
        </Field>
      </div>
      <Field label="Conta padrão para pagar a fatura">
        <Select name="payAccountId" defaultValue={c?.payAccountId ?? ""}>
          <option value="">Escolher na hora</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Cor">
        <Input name="color" type="color" defaultValue={c?.color ?? "#8b5cf6"} />
      </Field>
    </>
  );
}

function InvoicesDialog({ card, accounts }: { card: CardT; accounts: Opt[] }) {
  const months = card.invoices.map((i) => i.month);
  const cm = currentMonth();
  const initial = card.invoices.find((i) => !i.paid)?.month ?? months[months.length - 1] ?? cm;
  const [month, setMonth] = useState(initial);
  const inv = card.invoices.find((i) => i.month === month);

  return (
    <FormDialog
      title={`Fatura · ${card.name}`}
      description="Compras agrupadas pelo fechamento do cartão"
      submitLabel="Pagar fatura"
      onSubmit={(fd) => {
        if (!inv || inv.paid) throw new Error("Selecione uma fatura em aberto");
        return api(`/api/cards/${card.id}/pay`, "POST", { month, accountId: fd.get("accountId") });
      }}
      trigger={
        <Button variant="outline" size="sm">
          <Receipt /> Faturas
        </Button>
      }
    >
      {card.invoices.length === 0 ? (
        <Empty>Nenhuma compra neste cartão ainda.</Empty>
      ) : (
        <>
          <Field label="Fatura">
            <Select value={month} onChange={(e) => setMonth(e.target.value)}>
              {card.invoices.map((i) => (
                <option key={i.month} value={i.month}>
                  {monthLabel(i.month, true)} — {brl(i.total)} {i.paid ? "(paga)" : ""}
                </option>
              ))}
            </Select>
          </Field>
          {inv && (
            <>
              <div className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">Vence em {fmtDate(inv.dueDate)}</p>
                  <p className="text-xl font-bold">{brl(inv.total)}</p>
                </div>
                <Badge tone={inv.paid ? "success" : "warning"}>{inv.paid ? "Paga" : "Em aberto"}</Badge>
              </div>
              <ul className="max-h-60 divide-y overflow-y-auto rounded-lg border text-sm">
                {inv.items.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate">
                        {i.description}
                        {i.installmentNumber && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            {i.installmentNumber}/{i.installmentTotal}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(i.date).slice(0, 5)} {i.category && `· ${i.category}`}
                      </p>
                    </div>
                    <span className="whitespace-nowrap font-medium">{brl(i.amount)}</span>
                  </li>
                ))}
              </ul>
              {!inv.paid && (
                <Field label="Pagar com a conta">
                  <Select name="accountId" defaultValue={card.payAccountId ?? accounts[0]?.id} required>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </>
          )}
        </>
      )}
    </FormDialog>
  );
}

export function CardsView({ cards, accounts }: { cards: CardT[]; accounts: Opt[] }) {
  const toBody = (fd: FormData) => Object.fromEntries(fd);
  return (
    <>
      <PageHeader title="Cartões de crédito" description="Limites, faturas e vencimentos">
        <FormDialog
          title="Novo cartão"
          onSubmit={(fd) => api("/api/cards", "POST", toBody(fd))}
          trigger={
            <Button>
              <Plus /> Novo cartão
            </Button>
          }
        >
          <CardForm accounts={accounts} />
        </FormDialog>
      </PageHeader>

      {cards.length === 0 ? (
        <Empty>Nenhum cartão cadastrado.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((c) => {
            const next = c.invoices.find((i) => !i.paid);
            return (
              <Card key={c.id} className="overflow-hidden">
                <div className="p-5 text-white" style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}bb)` }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-semibold">{c.name}</p>
                      <p className="text-xs opacity-80">{c.brand || "Cartão de crédito"}</p>
                    </div>
                    <CreditCard className="size-6 opacity-80" />
                  </div>
                  <p className="mt-6 text-xs opacity-80">Fatura em aberto</p>
                  <p className="text-2xl font-bold">{brl(next?.total ?? 0)}</p>
                </div>
                <CardContent className="grid gap-3 p-5">
                  <div>
                    <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                      <span>Usado {brl(c.used)}</span>
                      <span>Disponível {brl(c.limit - c.used)}</span>
                    </div>
                    <Progress value={pct(c.used, c.limit)} color={pct(c.used, c.limit) > 85 ? "#ef4444" : c.color} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fecha dia {c.closingDay} · Vence dia {c.dueDay}
                    {next && ` · Próx. vencimento ${fmtDate(next.dueDate).slice(0, 5)}`}
                  </p>
                  <div className="flex items-center justify-between">
                    <InvoicesDialog card={c} accounts={accounts} />
                    <div className="flex">
                      <FormDialog
                        title="Editar cartão"
                        onSubmit={(fd) => api(`/api/cards/${c.id}`, "PUT", toBody(fd))}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Editar">
                            <Pencil />
                          </Button>
                        }
                      >
                        <CardForm c={c} accounts={accounts} />
                      </FormDialog>
                      <DeleteButton
                        confirm={`Excluir o cartão "${c.name}"? Se houver compras, ele será apenas arquivado.`}
                        action={() => api(`/api/cards/${c.id}`, "DELETE")}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
