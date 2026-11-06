"use client";

import { useState } from "react";
import { Pause, Pencil, Play, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge, Empty, PageHeader } from "@/components/ui/misc";
import { ActionButton, DeleteButton, FormDialog } from "@/components/app/form-dialog";
import { api } from "@/lib/client";
import { today } from "@/lib/dates";
import { FREQUENCY_LABEL, brl, cn, fmtDate } from "@/lib/utils";

type Opt = { id: string; name: string };
type Cat = Opt & { type: "INCOME" | "EXPENSE" };
type Item = {
  id: string;
  description: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  frequency: keyof typeof FREQUENCY_LABEL;
  startDate: string;
  endDate: string | null;
  nextDate: string;
  autoPay: boolean;
  active: boolean;
  accountId: string | null;
  cardId: string | null;
  categoryId: string | null;
  account: { name: string } | null;
  card: { name: string } | null;
  category: { name: string } | null;
};

function RecurringForm({ r, accounts, cards, categories }: { r?: Item; accounts: Opt[]; cards: Opt[]; categories: Cat[] }) {
  const [type, setType] = useState<"INCOME" | "EXPENSE">(r?.type === "INCOME" ? "INCOME" : "EXPENSE");
  const [card, setCard] = useState(!!r?.cardId);
  const useCard = type === "EXPENSE" && card;
  return (
    <>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="useCard" value={useCard ? "1" : ""} />
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
        {(["EXPENSE", "INCOME"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setType(t)} className={cn("rounded-md py-1.5 text-sm font-medium", type === t ? "bg-card shadow" : "text-muted-foreground")}>
            {t === "EXPENSE" ? "Despesa" : "Receita"}
          </button>
        ))}
      </div>
      <Field label="Descrição">
        <Input name="description" defaultValue={r?.description} required maxLength={120} autoFocus placeholder="Ex.: Aluguel, Netflix, Salário" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$)">
          <Input name="amount" type="number" step="0.01" min="0.01" defaultValue={r?.amount} required inputMode="decimal" />
        </Field>
        <Field label="Frequência">
          <Select name="frequency" defaultValue={r?.frequency ?? "MONTHLY"}>
            {Object.entries(FREQUENCY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={r ? "Início (não editável)" : "Primeira ocorrência"}>
          <Input name="startDate" type="date" defaultValue={r?.startDate.slice(0, 10) ?? today()} required disabled={!!r} />
        </Field>
        <Field label="Término (opcional)">
          <Input name="endDate" type="date" defaultValue={r?.endDate?.slice(0, 10) ?? ""} />
        </Field>
      </div>
      {type === "EXPENSE" && cards.length > 0 && (
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1 text-sm">
          {[false, true].map((v) => (
            <button key={String(v)} type="button" onClick={() => setCard(v)} className={cn("rounded-md py-1 font-medium", card === v ? "bg-card shadow" : "text-muted-foreground")}>
              {v ? "Cartão de crédito" : "Conta"}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {useCard ? (
          <Field label="Cartão">
            <Select name="cardId" defaultValue={r?.cardId ?? cards[0]?.id} required>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="Conta">
            <Select name="accountId" defaultValue={r?.accountId ?? accounts[0]?.id} required>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Categoria">
          <Select name="categoryId" defaultValue={r?.categoryId ?? ""}>
            <option value="">Sem categoria</option>
            {categories
              .filter((c) => c.type === type)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
        </Field>
      </div>
      {!useCard && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="autoPay" defaultChecked={r?.autoPay} className="size-4 accent-[hsl(var(--primary))]" />
          Lançar já como {type === "INCOME" ? "recebido" : "pago"} (débito automático)
        </label>
      )}
    </>
  );
}

function body(fd: FormData, isEdit: boolean) {
  const useCard = fd.get("useCard") === "1";
  const o: Record<string, unknown> = {
    description: fd.get("description"),
    type: fd.get("type"),
    amount: fd.get("amount"),
    frequency: fd.get("frequency"),
    endDate: fd.get("endDate"),
    categoryId: fd.get("categoryId"),
    accountId: useCard ? null : fd.get("accountId"),
    cardId: useCard ? fd.get("cardId") : null,
    autoPay: !!fd.get("autoPay"),
  };
  // o campo startDate fica desabilitado na edição (não é enviado no FormData)
  o.startDate = isEdit ? today() : fd.get("startDate");
  return o;
}

export function RecurringView({ items, accounts, cards, categories }: { items: Item[]; accounts: Opt[]; cards: Opt[]; categories: Cat[] }) {
  return (
    <>
      <PageHeader title="Contas recorrentes" description="Lançamentos gerados automaticamente (aluguel, assinaturas, salário…)">
        <ActionButton variant="outline" action={() => api("/api/recurring/run", "POST")}>
          <RefreshCw /> Gerar agora
        </ActionButton>
        <FormDialog
          title="Nova recorrência"
          onSubmit={(fd) => api("/api/recurring", "POST", body(fd, false))}
          trigger={
            <Button>
              <Plus /> Nova
            </Button>
          }
        >
          <RecurringForm accounts={accounts} cards={cards} categories={categories} />
        </FormDialog>
      </PageHeader>

      {items.length === 0 ? (
        <Empty>Nenhuma conta recorrente cadastrada.</Empty>
      ) : (
        <Card className="divide-y">
          {items.map((r) => (
            <div key={r.id} className={cn("flex flex-wrap items-center justify-between gap-3 p-4", !r.active && "opacity-60")}>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {r.description}
                  <Badge tone="primary">{FREQUENCY_LABEL[r.frequency]}</Badge>
                  {r.autoPay && <Badge tone="muted">automático</Badge>}
                  {!r.active && <Badge tone="warning">pausada</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.card ? `Cartão ${r.card.name}` : r.account?.name} {r.category && `· ${r.category.name}`} · próxima: {fmtDate(r.nextDate)}
                  {r.endDate && ` · até ${fmtDate(r.endDate)}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <span className={cn("mr-2 font-semibold", r.type === "INCOME" ? "text-success" : "text-destructive")}>
                  {r.type === "INCOME" ? "+" : "-"}
                  {brl(r.amount)}
                </span>
                <ActionButton variant="ghost" size="icon" title={r.active ? "Pausar" : "Retomar"} action={() => api(`/api/recurring/${r.id}`, "PATCH", { active: !r.active })}>
                  {r.active ? <Pause /> : <Play />}
                </ActionButton>
                <FormDialog
                  title="Editar recorrência"
                  onSubmit={(fd) => api(`/api/recurring/${r.id}`, "PUT", body(fd, true))}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Editar">
                      <Pencil />
                    </Button>
                  }
                >
                  <RecurringForm r={r} accounts={accounts} cards={cards} categories={categories} />
                </FormDialog>
                <DeleteButton confirm="Excluir esta recorrência? Os lançamentos já gerados serão mantidos." action={() => api(`/api/recurring/${r.id}`, "DELETE")} />
              </div>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
