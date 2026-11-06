"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Dot, PageHeader } from "@/components/ui/misc";
import { DeleteButton, FormDialog } from "@/components/app/form-dialog";
import { api } from "@/lib/client";

type Category = { id: string; name: string; type: "INCOME" | "EXPENSE"; color: string };

function CategoryForm({ c }: { c?: Category }) {
  return (
    <>
      <Field label="Nome">
        <Input name="name" defaultValue={c?.name} required maxLength={40} autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <Select name="type" defaultValue={c?.type ?? "EXPENSE"}>
            <option value="EXPENSE">Despesa</option>
            <option value="INCOME">Receita</option>
          </Select>
        </Field>
        <Field label="Cor">
          <Input name="color" type="color" defaultValue={c?.color ?? "#64748b"} />
        </Field>
      </div>
    </>
  );
}

function ProfileCard({ me }: { me: { name: string; email: string; role: "ADMIN" | "MEMBER" } }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Meu perfil
          <Link href="/users" className="flex items-center gap-1 text-xs font-normal text-primary hover:underline">
            <Users className="size-3.5" /> Gerenciar usuários
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid max-w-sm gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            try {
              await api("/api/auth/profile", "PUT", { name: fd.get("name"), email: fd.get("email") });
              setMsg({ ok: true, text: "Perfil atualizado." });
              router.refresh();
            } catch (err) {
              setMsg({ ok: false, text: err instanceof Error ? err.message : "Erro" });
            }
          }}
        >
          <Field label="Nome">
            <Input name="name" defaultValue={me.name} required maxLength={60} />
          </Field>
          <Field label="E-mail (login)">
            <Input name="email" type="email" defaultValue={me.email} required maxLength={120} />
          </Field>
          <p className="text-xs text-muted-foreground">Perfil de acesso: {me.role === "ADMIN" ? "Administrador" : "Membro"}</p>
          {msg && <p className={`text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>}
          <Button type="submit" className="justify-self-start">
            Salvar perfil
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordCard() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alterar minha senha</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid max-w-sm gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            try {
              await api("/api/auth/password", "POST", { current: fd.get("current"), next: fd.get("next") });
              setMsg({ ok: true, text: "Senha alterada com sucesso." });
              form.reset();
            } catch (err) {
              setMsg({ ok: false, text: err instanceof Error ? err.message : "Erro" });
            }
          }}
        >
          <Field label="Senha atual">
            <Input name="current" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="Nova senha (mín. 8 caracteres)">
            <Input name="next" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          {msg && <p className={`text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>}
          <Button type="submit" className="justify-self-start">
            Alterar senha
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function SettingsView({ categories, me }: { categories: Category[]; me: { name: string; email: string; role: "ADMIN" | "MEMBER" } }) {
  const toBody = (fd: FormData) => Object.fromEntries(fd);
  return (
    <>
      <PageHeader title="Configurações" description="Categorias, perfil e segurança">
        <FormDialog
          title="Nova categoria"
          onSubmit={(fd) => api("/api/categories", "POST", toBody(fd))}
          trigger={
            <Button>
              <Plus /> Nova categoria
            </Button>
          }
        >
          <CategoryForm />
        </FormDialog>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        {(["EXPENSE", "INCOME"] as const).map((type) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle>{type === "EXPENSE" ? "Categorias de despesa" : "Categorias de receita"}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {categories
                .filter((c) => c.type === type)
                .map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="flex items-center gap-2">
                      <Dot color={c.color} />
                      {c.name}
                    </span>
                    <div className="flex">
                      <FormDialog
                        title="Editar categoria"
                        onSubmit={(fd) => api(`/api/categories/${c.id}`, "PUT", toBody(fd))}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Editar">
                            <Pencil />
                          </Button>
                        }
                      >
                        <CategoryForm c={c} />
                      </FormDialog>
                      <DeleteButton confirm={`Excluir "${c.name}"? Os lançamentos ficarão sem categoria.`} action={() => api(`/api/categories/${c.id}`, "DELETE")} />
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ProfileCard me={me} />
        <PasswordCard />
      </div>
    </>
  );
}
