import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, CreditCard, Scale } from "lucide-react";
import { db, n } from "@/lib/db";
import { accountBalances, getInvoices } from "@/lib/finance";
import { netWorth } from "@/lib/investments";
import { MONTHS, currentMonth, monthRange, shiftMonth, today, toStr } from "@/lib/dates";
import { brl, fmtDate, pct } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Dot, Empty, PageHeader, Progress } from "@/components/ui/misc";
import { CategoryChart, MonthlyChart } from "@/components/app/dashboard-charts";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const month = currentMonth();
  const t = today();
  const first = shiftMonth(month, -5);

  const [accounts, balances, cards, goals, monthTx, upcoming, nw] = await Promise.all([
    db.account.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
    accountBalances(),
    db.creditCard.findMany({ where: { archived: false } }),
    db.goal.findMany({ orderBy: { createdAt: "desc" }, take: 4 }),
    db.transaction.findMany({
      where: { type: { in: ["INCOME", "EXPENSE"] }, date: { gte: monthRange(first).start, lt: monthRange(month).end } },
      select: { type: true, amount: true, date: true, category: { select: { name: true, color: true } } },
    }),
    db.transaction.findMany({
      where: { status: "PENDING", cardId: null, type: { in: ["INCOME", "EXPENSE"] } },
      orderBy: { date: "asc" },
      take: 8,
      include: { category: { select: { name: true } } },
    }),
    netWorth(),
  ]);

  // Totais por mês (últimos 6) e por categoria (mês atual)
  const series = Array.from({ length: 6 }, (_, i) => {
    const m = shiftMonth(first, i);
    return { key: m, label: MONTHS[Number(m.slice(5)) - 1], income: 0, expense: 0 };
  });
  const byCat = new Map<string, { name: string; value: number; color: string }>();
  for (const x of monthTx) {
    const m = toStr(x.date).slice(0, 7);
    const s = series.find((s) => s.key === m);
    const v = n(x.amount);
    if (s) x.type === "INCOME" ? (s.income += v) : (s.expense += v);
    if (m === month && x.type === "EXPENSE") {
      const name = x.category?.name ?? "Sem categoria";
      const cur = byCat.get(name) ?? { name, value: 0, color: x.category?.color ?? "#94a3b8" };
      cur.value += v;
      byCat.set(name, cur);
    }
  }
  const cur = series[5];
  const catData = [...byCat.values()].sort((a, b) => b.value - a.value);

  // Faturas em aberto
  const invoices = (
    await Promise.all(cards.map(async (c) => (await getInvoices(c)).filter((i) => !i.paid).map((i) => ({ ...i, card: c.name }))))
  )
    .flat()
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  // só a próxima fatura em aberto de cada cartão
  const nextInvoices = invoices.filter((i, idx) => invoices.findIndex((x) => x.card === i.card) === idx);
  const openInvoices = nextInvoices.reduce((s, i) => s + i.total, 0);

  const stat = (label: string, value: number, Icon: typeof Scale, tone: string) => (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className={`mt-1 text-2xl font-bold ${tone}`}>{brl(value)}</p>
        </div>
        <span className="grid size-10 place-items-center rounded-full bg-secondary">
          <Icon className="size-5 text-muted-foreground" />
        </span>
      </CardContent>
    </Card>
  );

  return (
    <>
      <PageHeader title="Dashboard" description="Visão geral das suas finanças neste mês" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/net-worth">{stat("Patrimônio líquido", nw.net, Scale, nw.net < 0 ? "text-destructive" : "")}</Link>
        {stat("Receitas do mês", cur.income, ArrowUpRight, "text-success")}
        {stat("Despesas do mês", cur.expense, ArrowDownRight, "text-destructive")}
        {stat("Faturas em aberto", openInvoices, CreditCard, "")}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Receitas x Despesas (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyChart data={series} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Despesas por categoria</CardTitle>
          </CardHeader>
          <CardContent>{catData.length ? <CategoryChart data={catData} /> : <Empty>Sem despesas neste mês</Empty>}</CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Contas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {accounts.length === 0 && <Empty>Nenhuma conta cadastrada</Empty>}
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Dot color={a.color} />
                  {a.name}
                </span>
                <span className="font-medium">{brl(balances.get(a.id))}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos vencimentos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {nextInvoices.map((i) => (
              <div key={i.card + i.month} className="flex items-center justify-between text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <CreditCard className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">Fatura {i.card}</span>
                  <Badge tone={i.dueDate < t ? "danger" : "muted"}>{fmtDate(i.dueDate).slice(0, 5)}</Badge>
                </span>
                <span className="font-medium">{brl(i.total)}</span>
              </div>
            ))}
            {upcoming.map((u) => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{u.description}</span>
                  <Badge tone={toStr(u.date) < t ? "danger" : "muted"}>{fmtDate(toStr(u.date)).slice(0, 5)}</Badge>
                </span>
                <span className={`font-medium ${u.type === "INCOME" ? "text-success" : ""}`}>{brl(n(u.amount))}</span>
              </div>
            ))}
            {!nextInvoices.length && !upcoming.length && <Empty>Nada pendente 🎉</Empty>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Link href="/goals" className="hover:underline">
                Metas
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {goals.length === 0 && <Empty>Nenhuma meta criada</Empty>}
            {goals.map((g) => (
              <div key={g.id} className="grid gap-1.5">
                <div className="flex justify-between text-sm">
                  <span>{g.name}</span>
                  <span className="text-muted-foreground">{pct(n(g.currentAmount), n(g.targetAmount)).toFixed(0)}%</span>
                </div>
                <Progress value={pct(n(g.currentAmount), n(g.targetAmount))} color={g.color} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
