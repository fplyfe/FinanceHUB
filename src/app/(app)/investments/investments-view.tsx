"use client";

import { useState } from "react";
import { ArrowDownToLine, History, Pencil, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge, Empty, PageHeader } from "@/components/ui/misc";
import { DeleteButton, FormDialog } from "@/components/app/form-dialog";
import { CategoryChart } from "@/components/app/dashboard-charts";
import { api } from "@/lib/client";
import { today } from "@/lib/dates";
import { ENTRY_TYPE_LABEL, INVESTMENT_TYPE_COLOR, INVESTMENT_TYPE_LABEL, brl, cn, fmtDate } from "@/lib/utils";

type InvType = keyof typeof INVESTMENT_TYPE_LABEL;
type EntryType = keyof typeof ENTRY_TYPE_LABEL;
type Entry = { id: string; type: EntryType; amount: number; date: string; note: string | null; account: { name: string } | null; user: { name: string } };
type Inv = {
  id: string;
  name: string;
  type: InvType;
  institution: string | null;
  color: string;
  notes: string | null;
  entries: Entry[];
  value: number;
  invested: number;
  profit: number;
  profitPct: number;
};
type Opt = { id: string; name: string };

const pctFmt = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2).replace(".", ",")}%`;

function InvestmentForm({ i }: { i?: Inv }) {
  return (
    <>
      <Field label="Nome">
        <Input name="name" defaultValue={i?.name} required maxLength={80} autoFocus placeholder="Ex.: Tesouro Selic 2029, PETR4, CDB Banco X" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <Select name="type" defaultValue={i?.type ?? "FIXED_INCOME"}>
            {Object.entries(INVESTMENT_TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Instituição (opcional)">
          <Input name="institution" defaultValue={i?.institution ?? ""} placeholder="Corretora / banco" />
        </Field>
      </div>
      <Field label="Cor">
        <Input name="color" type="color" defaultValue={i?.color ?? "#0ea5e9"} />
      </Field>
      <Field label="Observações">
        <Textarea name="notes" defaultValue={i?.notes ?? ""} maxLength={500} />
      </Field>
    </>
  );
}

function EntryForm({ accounts, value }: { accounts: Opt[]; value: number }) {
  const [type, setType] = useState<EntryType>("CONTRIBUTION");
  return (
    <>
      <input type="hidden" name="type" value={type} />
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1 text-sm">
        {(Object.keys(ENTRY_TYPE_LABEL) as EntryType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn("rounded-md px-1 py-1.5 font-medium", type === t ? "bg-card shadow" : "text-muted-foreground")}
          >
            {t === "VALUATION" ? "Atualizar valor" : ENTRY_TYPE_LABEL[t]}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {type === "CONTRIBUTION" && "Dinheiro aplicado. Se escolher uma conta, o valor sai do saldo dela."}
        {type === "WITHDRAWAL" && `Dinheiro resgatado (valor atual: ${brl(value)}). Se escolher uma conta, o valor entra nela.`}
        {type === "VALUATION" && "Informe o valor total atual da posição (saldo na corretora). A diferença vira rendimento."}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label={type === "VALUATION" ? "Valor atual total (R$)" : "Valor (R$)"}>
          <Input name="amount" type="number" step="0.01" min={type === "VALUATION" ? 0 : 0.01} required autoFocus inputMode="decimal" />
        </Field>
        <Field label="Data">
          <Input name="date" type="date" defaultValue={today()} required />
        </Field>
      </div>
      {type !== "VALUATION" && (
        <Field label={type === "CONTRIBUTION" ? "Debitar da conta" : "Creditar na conta"}>
          <Select name="accountId" defaultValue={accounts[0]?.id ?? ""}>
            <option value="">Nenhuma (não mexer no saldo das contas)</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Observação">
        <Input name="note" maxLength={200} />
      </Field>
    </>
  );
}

function HistoryDialog({ inv }: { inv: Inv }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <History /> Histórico
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Histórico · {inv.name}</DialogTitle>
          <DialogDescription>Aportes, resgates e atualizações de valor</DialogDescription>
        </DialogHeader>
        {inv.entries.length === 0 ? (
          <Empty>Nenhuma movimentação ainda.</Empty>
        ) : (
          <ul className="max-h-[60vh] divide-y overflow-y-auto rounded-lg border text-sm">
            {[...inv.entries].reverse().map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    <Badge tone={e.type === "CONTRIBUTION" ? "success" : e.type === "WITHDRAWAL" ? "warning" : "primary"}>{ENTRY_TYPE_LABEL[e.type]}</Badge>
                    {brl(e.amount)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {fmtDate(e.date)} · {e.user.name}
                    {e.account && ` · ${e.account.name}`}
                    {e.note && ` · ${e.note}`}
                  </p>
                </div>
                <DeleteButton confirm="Excluir esta movimentação?" action={() => api(`/api/investment-entries/${e.id}`, "DELETE")} />
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function InvestmentsView({ items, accounts }: { items: Inv[]; accounts: Opt[] }) {
  const toBody = (fd: FormData) => Object.fromEntries(fd);
  const value = items.reduce((s, i) => s + i.value, 0);
  const invested = items.reduce((s, i) => s + i.invested, 0);
  const profit = value - invested;
  const byType = new Map<InvType, number>();
  for (const i of items) byType.set(i.type, (byType.get(i.type) ?? 0) + i.value);
  const alloc = [...byType.entries()]
    .filter(([, v]) => v > 0)
    .map(([t, v]) => ({ name: INVESTMENT_TYPE_LABEL[t], value: v, color: INVESTMENT_TYPE_COLOR[t] }))
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader title="Investimentos" description="Carteira, rentabilidade e alocação">
        <FormDialog
          title="Novo investimento"
          description="Depois de criar, registre o primeiro aporte."
          onSubmit={(fd) => api("/api/investments", "POST", toBody(fd))}
          trigger={
            <Button>
              <Plus /> Novo investimento
            </Button>
          }
        >
          <InvestmentForm />
        </FormDialog>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">Valor atual</p>
            <p className="mt-1 text-2xl font-bold">{brl(value)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">Total investido (custo)</p>
            <p className="mt-1 text-2xl font-bold">{brl(invested)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">Rentabilidade</p>
            <p className={cn("mt-1 text-2xl font-bold", profit >= 0 ? "text-success" : "text-destructive")}>{brl(profit)}</p>
            <p className="text-xs text-muted-foreground">{pctFmt(invested > 0 ? (profit / invested) * 100 : 0)}</p>
          </CardContent>
        </Card>
      </div>

      {items.length === 0 ? (
        <div className="mt-4">
          <Empty>Nenhum investimento cadastrado. Crie um e registre aportes, resgates e atualizações de valor.</Empty>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="grid gap-4 lg:col-span-2">
            {items.map((i) => (
              <Card key={i.id} className="overflow-hidden">
                <div className="h-1.5" style={{ background: i.color }} />
                <CardContent className="grid gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{i.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {INVESTMENT_TYPE_LABEL[i.type]}
                        {i.institution && ` · ${i.institution}`}
                      </p>
                    </div>
                    <div className="flex">
                      <FormDialog
                        title="Editar investimento"
                        onSubmit={(fd) => api(`/api/investments/${i.id}`, "PUT", toBody(fd))}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Editar">
                            <Pencil />
                          </Button>
                        }
                      >
                        <InvestmentForm i={i} />
                      </FormDialog>
                      <DeleteButton
                        confirm={`Excluir "${i.name}" e todo o histórico? Aportes e resgates ligados a contas deixarão de afetar os saldos.`}
                        action={() => api(`/api/investments/${i.id}`, "DELETE")}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Valor atual</p>
                      <p className="font-semibold">{brl(i.value)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Investido</p>
                      <p className="font-semibold">{brl(i.invested)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Resultado</p>
                      <p className={cn("flex items-center gap-1 font-semibold", i.profit >= 0 ? "text-success" : "text-destructive")}>
                        {i.profit >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                        {pctFmt(i.profitPct)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <FormDialog
                      title={`Movimentar · ${i.name}`}
                      onSubmit={(fd) => api(`/api/investments/${i.id}/entries`, "POST", toBody(fd))}
                      trigger={
                        <Button variant="outline" size="sm">
                          <ArrowDownToLine /> Movimentar
                        </Button>
                      }
                    >
                      <EntryForm accounts={accounts} value={i.value} />
                    </FormDialog>
                    <HistoryDialog inv={i} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Alocação por tipo</CardTitle>
            </CardHeader>
            <CardContent>
              {alloc.length ? (
                <>
                  <CategoryChart data={alloc} />
                  <ul className="mt-2 grid gap-1.5 text-sm">
                    {alloc.map((a) => (
                      <li key={a.name} className="flex justify-between">
                        <span>{a.name}</span>
                        <span className="text-muted-foreground">{((a.value / value) * 100).toFixed(1).replace(".", ",")}%</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <Empty>Sem valores ainda</Empty>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
