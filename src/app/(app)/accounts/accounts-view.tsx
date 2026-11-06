"use client";

import { Landmark, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Empty, PageHeader } from "@/components/ui/misc";
import { DeleteButton, FormDialog } from "@/components/app/form-dialog";
import { api } from "@/lib/client";
import { ACCOUNT_TYPE_LABEL, brl } from "@/lib/utils";

type Account = { id: string; name: string; type: keyof typeof ACCOUNT_TYPE_LABEL; initialBalance: number; color: string; balance: number };

function AccountForm({ a }: { a?: Account }) {
  return (
    <>
      <Field label="Nome">
        <Input name="name" defaultValue={a?.name} required maxLength={60} autoFocus placeholder="Ex.: Nubank, Itaú, Carteira" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <Select name="type" defaultValue={a?.type ?? "CHECKING"}>
            {Object.entries(ACCOUNT_TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Saldo inicial (R$)">
          <Input name="initialBalance" type="number" step="0.01" defaultValue={a?.initialBalance ?? 0} />
        </Field>
      </div>
      <Field label="Cor">
        <Input name="color" type="color" defaultValue={a?.color ?? "#6366f1"} />
      </Field>
    </>
  );
}

const toBody = (fd: FormData) => Object.fromEntries(fd);

export function AccountsView({ accounts }: { accounts: Account[] }) {
  const total = accounts.reduce((s, a) => s + a.balance, 0);
  return (
    <>
      <PageHeader title="Contas" description={`Saldo total: ${brl(total)}`}>
        <FormDialog
          title="Nova conta"
          onSubmit={(fd) => api("/api/accounts", "POST", toBody(fd))}
          trigger={
            <Button>
              <Plus /> Nova conta
            </Button>
          }
        >
          <AccountForm />
        </FormDialog>
      </PageHeader>

      {accounts.length === 0 ? (
        <Empty>Cadastre sua primeira conta para começar a lançar receitas e despesas.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <Card key={a.id} className="overflow-hidden">
              <div className="h-1.5" style={{ background: a.color }} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full" style={{ background: a.color + "22", color: a.color }}>
                      <Landmark className="size-5" />
                    </span>
                    <div>
                      <p className="font-semibold">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABEL[a.type]}</p>
                    </div>
                  </div>
                  <div className="flex">
                    <FormDialog
                      title="Editar conta"
                      onSubmit={(fd) => api(`/api/accounts/${a.id}`, "PUT", toBody(fd))}
                      trigger={
                        <Button variant="ghost" size="icon" aria-label="Editar">
                          <Pencil />
                        </Button>
                      }
                    >
                      <AccountForm a={a} />
                    </FormDialog>
                    <DeleteButton
                      confirm={`Excluir a conta "${a.name}"? Se houver lançamentos, ela será apenas arquivada.`}
                      action={() => api(`/api/accounts/${a.id}`, "DELETE")}
                    />
                  </div>
                </div>
                <p className={`mt-4 text-2xl font-bold ${a.balance < 0 ? "text-destructive" : ""}`}>{brl(a.balance)}</p>
                <p className="text-xs text-muted-foreground">Saldo atual</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
