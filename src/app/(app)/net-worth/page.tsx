import Link from "next/link";
import { CreditCard, Landmark, LineChart, Scale } from "lucide-react";
import { netWorth, netWorthHistory } from "@/lib/investments";
import { ACCOUNT_TYPE_LABEL, INVESTMENT_TYPE_COLOR, INVESTMENT_TYPE_LABEL, brl, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dot, Empty, PageHeader, Progress } from "@/components/ui/misc";
import { NetWorthChart } from "@/components/app/dashboard-charts";

export const metadata = { title: "Patrimônio" };

export default async function NetWorthPage() {
  const [nw, history] = await Promise.all([netWorth(), netWorthHistory(12)]);
  const first = history.find((h) => h.total !== 0) ?? history[0];
  const lastH = history[history.length - 1];
  const variation = (lastH?.total ?? 0) - (first?.total ?? 0);
  const pctInv = nw.assets > 0 ? (nw.invested / nw.assets) * 100 : 0;

  const Row = ({ label, value, color, sub }: { label: string; value: number; color?: string; sub?: string }) => (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <Dot color={color} />
        <span className="truncate">{label}</span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </span>
      <span className={cn("whitespace-nowrap font-medium", value < 0 && "text-destructive")}>{brl(value)}</span>
    </div>
  );

  return (
    <>
      <PageHeader title="Patrimônio" description="Balanço: o que vocês têm menos o que devem" />

      <Card className="overflow-hidden">
        <CardContent className="grid gap-6 bg-gradient-to-br from-accent to-card p-6 sm:grid-cols-4">
          <div className="sm:col-span-1">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Scale className="size-4" /> Patrimônio líquido
            </p>
            <p className={cn("mt-1 text-3xl font-bold", nw.net < 0 && "text-destructive")}>{brl(nw.net)}</p>
            <p className="text-xs text-muted-foreground">
              {variation >= 0 ? "+" : ""}
              {brl(variation)} em contas + investimentos desde {first?.label}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ativos</p>
            <p className="text-xl font-semibold text-success">{brl(nw.assets)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Passivos</p>
            <p className="text-xl font-semibold text-destructive">{brl(nw.liabilities)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">% em investimentos</p>
            <p className="text-xl font-semibold">{pctInv.toFixed(1).replace(".", ",")}%</p>
            <Progress value={pctInv} className="mt-2" />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Evolução (últimos 12 meses)</CardTitle>
          <p className="text-xs text-muted-foreground">Saldo das contas + valor dos investimentos no fim de cada mês.</p>
        </CardHeader>
        <CardContent>
          <NetWorthChart data={history} />
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Landmark className="size-4" /> Contas
              </span>
              <span>{brl(nw.cash - nw.overdraft)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {nw.accounts.length === 0 && <Empty>Nenhuma conta</Empty>}
            {nw.accounts.map((a) => (
              <Row key={a.id} label={a.name} value={a.balance} color={a.color} sub={ACCOUNT_TYPE_LABEL[a.type]} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <Link href="/investments" className="flex items-center gap-2 hover:underline">
                <LineChart className="size-4" /> Investimentos
              </Link>
              <span>{brl(nw.invested)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {nw.byType.length === 0 && <Empty>Nenhum investimento</Empty>}
            {nw.byType.map((t) => (
              <Row
                key={t.type}
                label={INVESTMENT_TYPE_LABEL[t.type]}
                value={t.value}
                color={INVESTMENT_TYPE_COLOR[t.type]}
                sub={nw.invested > 0 ? `${((t.value / nw.invested) * 100).toFixed(0)}%` : undefined}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CreditCard className="size-4" /> Dívidas
              </span>
              <span className="text-destructive">{brl(nw.liabilities)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {nw.cards.map((c) => (
              <Row key={c.id} label={`Cartão ${c.name}`} value={-c.debt} color={c.color} sub="faturas + parcelas futuras" />
            ))}
            {nw.overdraft > 0 && <Row label="Contas com saldo negativo" value={-nw.overdraft} color="#ef4444" />}
            {nw.liabilities === 0 && <Empty>Sem dívidas 🎉</Empty>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
