"use client";

import { Pencil, PiggyBank, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Badge, Empty, PageHeader, Progress } from "@/components/ui/misc";
import { DeleteButton, FormDialog } from "@/components/app/form-dialog";
import { api } from "@/lib/client";
import { today } from "@/lib/dates";
import { brl, fmtDate, pct } from "@/lib/utils";

type Goal = { id: string; name: string; targetAmount: number; currentAmount: number; deadline: string | null; color: string; notes: string | null };

function GoalForm({ g }: { g?: Goal }) {
  return (
    <>
      <Field label="Nome da meta">
        <Input name="name" defaultValue={g?.name} required maxLength={80} autoFocus placeholder="Ex.: Reserva de emergência, Viagem" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor alvo (R$)">
          <Input name="targetAmount" type="number" step="0.01" min="0.01" defaultValue={g?.targetAmount} required inputMode="decimal" />
        </Field>
        <Field label="Prazo (opcional)">
          <Input name="deadline" type="date" defaultValue={g?.deadline?.slice(0, 10) ?? ""} />
        </Field>
      </div>
      <Field label="Cor">
        <Input name="color" type="color" defaultValue={g?.color ?? "#10b981"} />
      </Field>
      <Field label="Observações">
        <Textarea name="notes" defaultValue={g?.notes ?? ""} maxLength={500} />
      </Field>
    </>
  );
}

function monthlyNeeded(g: Goal) {
  if (!g.deadline) return null;
  const left = g.targetAmount - g.currentAmount;
  if (left <= 0) return null;
  const t = today();
  const months = (Number(g.deadline.slice(0, 4)) - Number(t.slice(0, 4))) * 12 + (Number(g.deadline.slice(5, 7)) - Number(t.slice(5, 7)));
  return months > 0 ? left / months : left;
}

export function GoalsView({ goals }: { goals: Goal[] }) {
  const toBody = (fd: FormData) => Object.fromEntries(fd);
  return (
    <>
      <PageHeader title="Metas" description="Acompanhe seus objetivos financeiros">
        <FormDialog
          title="Nova meta"
          onSubmit={(fd) => api("/api/goals", "POST", toBody(fd))}
          trigger={
            <Button>
              <Plus /> Nova meta
            </Button>
          }
        >
          <GoalForm />
        </FormDialog>
      </PageHeader>

      {goals.length === 0 ? (
        <Empty>Nenhuma meta criada ainda.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => {
            const p = pct(g.currentAmount, g.targetAmount);
            const need = monthlyNeeded(g);
            return (
              <Card key={g.id}>
                <CardContent className="grid gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{g.name}</p>
                      <p className="text-xs text-muted-foreground">{g.deadline ? `Prazo: ${fmtDate(g.deadline)}` : "Sem prazo"}</p>
                    </div>
                    <div className="flex items-center">
                      {p >= 100 && <Badge tone="success">Concluída</Badge>}
                      <FormDialog
                        title="Editar meta"
                        onSubmit={(fd) => api(`/api/goals/${g.id}`, "PUT", toBody(fd))}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Editar">
                            <Pencil />
                          </Button>
                        }
                      >
                        <GoalForm g={g} />
                      </FormDialog>
                      <DeleteButton confirm={`Excluir a meta "${g.name}"?`} action={() => api(`/api/goals/${g.id}`, "DELETE")} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="text-xl font-bold">{brl(g.currentAmount)}</span>
                      <span className="text-sm text-muted-foreground">de {brl(g.targetAmount)}</span>
                    </div>
                    <Progress value={p} color={g.color} className="h-2.5" />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {p.toFixed(0)}% {need !== null && `· guarde ~${brl(need)}/mês para atingir no prazo`}
                    </p>
                  </div>
                  <FormDialog
                    title={`Aporte · ${g.name}`}
                    description="Use valor negativo para registrar um resgate."
                    onSubmit={(fd) => api(`/api/goals/${g.id}/contribute`, "POST", toBody(fd))}
                    trigger={
                      <Button variant="outline" size="sm" className="justify-self-start">
                        <PiggyBank /> Aportar / resgatar
                      </Button>
                    }
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Valor (R$)">
                        <Input name="amount" type="number" step="0.01" required autoFocus inputMode="decimal" />
                      </Field>
                      <Field label="Data">
                        <Input name="date" type="date" defaultValue={today()} required />
                      </Field>
                    </div>
                    <Field label="Observação">
                      <Input name="note" maxLength={200} />
                    </Field>
                  </FormDialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
