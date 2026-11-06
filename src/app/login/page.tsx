"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/login", "POST", { email: fd.get("email"), password: fd.get("password") });
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-accent via-background to-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Wallet className="size-6" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">FinanceHub</h1>
          <p className="text-sm text-muted-foreground">Entre para acessar suas finanças</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <form onSubmit={submit} className="grid gap-4">
              <Field label="E-mail">
                <Input name="email" type="email" autoComplete="username" required autoFocus />
              </Field>
              <Field label="Senha">
                <Input name="password" type="password" autoComplete="current-password" required />
              </Field>
              {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={busy} size="lg">
                {busy && <Loader2 className="animate-spin" />}
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
