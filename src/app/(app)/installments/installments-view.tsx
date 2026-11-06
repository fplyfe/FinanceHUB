"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge, Empty, PageHeader, Progress } from "@/components/ui/misc";
import { DeleteButton, FormDialog } from "@/components/app/form-dialog";
import { api } from "@/lib/client";
import { today } from "@/lib/dates";
import { brl, fmtDate, pct } from "@/lib/utils";

type Opt = { id: string; name: string };
type Plan = {
  id: string;
  description: string;
  totalAmount: number;
  installments: number;
  card: { name: string } | null;
  account: { name: string } | null;
  category: { name: string } | null;
  transactions: { status: "PENDING" | "PAID"; amount: number; date: string }[];
};

export function InstallmentsView({ plans, accounts, cards, categories }: { plans: Plan[]; accounts: Opt[]; cards: Opt[]; categories: Opt[] }) {
  const [card, setCard] = useState(false);
  return (
    <>
      <PageHeader title="Parcelamentos" description="Compras parceladas no cartão ou na conta">
        <FormDialog
          title="Novo parcelamento"
          description="As parcelas são criadas automaticamente, uma por mês."
          onSubmit={(fd) =>
            api("/api/installments", "POST", {
              description: fd.get("description"),
              totalAmount: fd.get("totalAmount"),
              installments: fd.get("installments"),
              firstDate: fd.get("firstDate"),
              categoryId: fd.get("categoryId"),
              cardId: card ? fd.get("cardId") : null,
              accountId: card ? null : fd.get("accountId"),
            })
          }
          trigger={
            <Button>
              <Plus /> Novo parcelamento
            </Button>
          }
        >
          <Field label="Descrição">
            <Input name="description" required maxLength={120} autoFocus placeholder="Ex.: Notebook" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor total (R$)">
              <Input name="totalAmount" type="number" step="0.01" min="0.01" required inputMode="decimal" />
            </Field>
            <Field label="Nº de parcelas">
              <Input name="installments" type="number" min={2} max={120} defaultValue={10} required />
            </Field>
            <Field label="Data da 1ª parcela">
              <Input name="firstDate" type="date" defaultValue={today()} required />
            </Field>
            <Field label="Categoria">
              <Select name="categoryId" defaultValue="">
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {cards.length > 0 && (
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1 text-sm">
              {[false, true].map((v) => (
                <button key={String(v)} type="button" onClick={() => setCard(v)} className={`rounded-md py-1 font-medium ${card === v ? "bg-card shadow" : "text-muted-foreground"}`}>
                  {v ? "Cartão de crédito" : "Conta"}
                </button>
              ))}
            </div>
          )}
          {card ? (
            <Field label="Cartão">
              <Select name="cardId" required>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Conta">
              <Select name="accountId" required>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </FormDialog>
      </PageHeader>

      {plans.length === 0 ? (
        <Empty>Nenhum parcelamento cadastrado.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((p) => {
            const paid = p.transactions.filter((t) => t.status === "PAID").length;
            const remaining = p.transactions.filter((t) => t.status === "PENDING").reduce((s, t) => s + t.amount, 0);
            const nextDue = p.transactions.find((t) => t.status === "PENDING");
            const done = paid === p.installments;
            return (
              <Card key={p.id}>
                <CardContent className="grid gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.card ? `Cartão ${p.card.name}` : p.account?.name} {p.category && `· ${p.category.name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge tone={done ? "success" : "primary"}>{done ? "Quitado" : `${paid}/${p.installments}`}</Badge>
                      <DeleteButton
                        confirm={`Excluir "${p.description}" e todas as ${p.installments} parcelas (inclusive as já pagas)?`}
                        action={() => api(`/api/installments/${p.id}`, "DELETE")}
                      />
                    </div>
                  </div>
                  <Progress value={pct(paid, p.installments)} />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {p.installments}x de ~{brl(p.totalAmount / p.installments)}
                    </span>
                    <span className="font-medium">Total {brl(p.totalAmount)}</span>
                  </div>
                  {!done && (
                    <p className="text-xs text-muted-foreground">
                      Restante {brl(remaining)} {nextDue && `· próxima parcela em ${fmtDate(nextDue.date)}`}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
