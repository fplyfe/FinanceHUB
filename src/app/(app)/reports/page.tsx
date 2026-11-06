import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Empty, PageHeader, Progress } from "@/components/ui/misc";
import { defaultRange, getReport } from "@/lib/reports";
import { brl, fmtDate } from "@/lib/utils";

export const metadata = { title: "Relatórios" };

const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const def = defaultRange();
  const from = isDate(sp.from) ? sp.from! : def.from;
  const to = isDate(sp.to) ? sp.to! : def.to;
  const r = await getReport(from, to);
  const qs = `from=${from}&to=${to}`;

  return (
    <>
      <PageHeader title="Relatórios" description={`${fmtDate(from)} a ${fmtDate(to)}`}>
        <Button asChild variant="outline">
          <a href={`/api/reports/pdf?${qs}`}>
            <FileText /> PDF
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={`/api/reports/excel?${qs}`}>
            <FileSpreadsheet /> Excel
          </a>
        </Button>
      </PageHeader>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <Field label="De">
          <Input type="date" name="from" defaultValue={from} required />
        </Field>
        <Field label="Até">
          <Input type="date" name="to" defaultValue={to} required />
        </Field>
        <Button type="submit">
          <Download className="rotate-180" /> Aplicar
        </Button>
      </form>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Receitas", r.income, "text-success"],
          ["Despesas", r.expense, "text-destructive"],
          ["Resultado", r.balance, r.balance < 0 ? "text-destructive" : ""],
        ].map(([label, v, tone]) => (
          <Card key={label as string}>
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground">{label as string}</p>
              <p className={`mt-1 text-2xl font-bold ${tone}`}>{brl(v as number)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {(["EXPENSE", "INCOME"] as const).map((type) => {
          const list = r.byCategory.filter((c) => c.type === type);
          return (
            <Card key={type}>
              <CardHeader>
                <CardTitle>{type === "EXPENSE" ? "Despesas por categoria" : "Receitas por categoria"}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {list.length === 0 && <Empty>Sem dados no período</Empty>}
                {list.map((c) => (
                  <div key={c.name} className="grid gap-1">
                    <div className="flex justify-between text-sm">
                      <span>{c.name}</span>
                      <span className="font-medium">
                        {brl(c.total)} <span className="text-xs text-muted-foreground">({c.pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <Progress value={c.pct} color={type === "EXPENSE" ? "#f43f5e" : "#10b981"} />
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{r.rows.length} lançamentos no período. Transferências entre contas não entram nos totais.</p>
    </>
  );
}
