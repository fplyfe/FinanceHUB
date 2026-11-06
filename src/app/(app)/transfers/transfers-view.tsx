"use client";

import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Empty, PageHeader } from "@/components/ui/misc";
import { DeleteButton, FormDialog } from "@/components/app/form-dialog";
import { api } from "@/lib/client";
import { today } from "@/lib/dates";
import { brl, fmtDate } from "@/lib/utils";

type Opt = { id: string; name: string };
type Transfer = { id: string; description: string; amount: number; date: string; account: { name: string } | null; toAccount: { name: string } | null; user: { name: string } };

export function TransfersView({ accounts, transfers }: { accounts: Opt[]; transfers: Transfer[] }) {
  return (
    <>
      <PageHeader title="Transferências" description="Movimentações entre suas contas (não afetam receitas/despesas)">
        <FormDialog
          title="Nova transferência"
          onSubmit={(fd) => api("/api/transfers", "POST", Object.fromEntries(fd))}
          trigger={
            <Button disabled={accounts.length < 2}>
              <Plus /> Nova transferência
            </Button>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="De">
              <Select name="fromAccountId" defaultValue={accounts[0]?.id} required>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Para">
              <Select name="toAccountId" defaultValue={accounts[1]?.id} required>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Valor (R$)">
              <Input name="amount" type="number" step="0.01" min="0.01" required inputMode="decimal" />
            </Field>
            <Field label="Data">
              <Input name="date" type="date" defaultValue={today()} required />
            </Field>
          </div>
          <Field label="Descrição (opcional)">
            <Input name="description" placeholder="Transferência" maxLength={120} />
          </Field>
        </FormDialog>
      </PageHeader>

      {accounts.length < 2 && <p className="mb-4 text-sm text-muted-foreground">Cadastre ao menos duas contas para fazer transferências.</p>}

      {transfers.length === 0 ? (
        <Empty>Nenhuma transferência realizada.</Empty>
      ) : (
        <Card className="divide-y">
          {transfers.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {t.account?.name} <ArrowRight className="size-4 text-muted-foreground" /> {t.toAccount?.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {fmtDate(t.date)} · {t.description} · {t.user.name}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold">{brl(t.amount)}</span>
                <DeleteButton confirm="Excluir esta transferência?" action={() => api(`/api/transactions/${t.id}`, "DELETE")} />
              </div>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
