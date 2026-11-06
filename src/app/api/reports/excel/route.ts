import ExcelJS from "exceljs";
import { z } from "zod";
import { route } from "@/lib/api";
import { getReport, defaultRange } from "@/lib/reports";
import { db, n } from "@/lib/db";
import { accountBalances } from "@/lib/finance";
import { fmtDate, TX_TYPE_LABEL } from "@/lib/utils";

export const dynamic = "force-dynamic";

const q = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export const GET = route(async (req) => {
  const def = defaultRange();
  const sp = req.nextUrl.searchParams;
  const { from, to } = q.parse({ from: sp.get("from") ?? def.from, to: sp.get("to") ?? def.to });
  const report = await getReport(from, to);

  const wb = new ExcelJS.Workbook();
  wb.creator = "FinanceHub";
  const money = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
  const head = (ws: ExcelJS.Worksheet) => {
    const r = ws.getRow(1);
    r.font = { bold: true, color: { argb: "FFFFFFFF" } };
    r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    ws.views = [{ state: "frozen", ySplit: 1 }];
  };

  const s1 = wb.addWorksheet("Resumo");
  s1.columns = [{ header: "Item", width: 28 }, { header: "Valor", width: 20, style: { numFmt: money } }];
  s1.addRows([
    [`Período ${fmtDate(from)} a ${fmtDate(to)}`, null],
    ["Receitas", report.income],
    ["Despesas", report.expense],
    ["Resultado", report.balance],
  ]);
  head(s1);

  const s2 = wb.addWorksheet("Lançamentos");
  s2.columns = [
    { header: "Data", key: "date", width: 12 },
    { header: "Tipo", key: "type", width: 14 },
    { header: "Descrição", key: "description", width: 38 },
    { header: "Categoria", key: "category", width: 22 },
    { header: "Conta/Cartão", key: "account", width: 26 },
    { header: "Status", key: "status", width: 12 },
    { header: "Valor", key: "amount", width: 16, style: { numFmt: money } },
  ];
  for (const r of report.rows) {
    s2.addRow({
      ...r,
      date: fmtDate(r.date),
      type: TX_TYPE_LABEL[r.type],
      status: r.status === "PAID" ? "Pago" : "Pendente",
      amount: r.type === "EXPENSE" ? -r.amount : r.amount,
    });
  }
  head(s2);
  s2.autoFilter = { from: "A1", to: "G1" };

  const s3 = wb.addWorksheet("Por categoria");
  s3.columns = [
    { header: "Categoria", width: 28 },
    { header: "Tipo", width: 14 },
    { header: "Total", width: 18, style: { numFmt: money } },
    { header: "% do tipo", width: 12, style: { numFmt: "0.0" } },
  ];
  for (const c of report.byCategory) s3.addRow([c.name, TX_TYPE_LABEL[c.type], c.total, c.pct]);
  head(s3);

  const s4 = wb.addWorksheet("Saldos das contas");
  s4.columns = [{ header: "Conta", width: 28 }, { header: "Saldo atual", width: 20, style: { numFmt: money } }];
  const [accounts, bal] = await Promise.all([db.account.findMany({ where: { archived: false }, orderBy: { name: "asc" } }), accountBalances()]);
  for (const a of accounts) s4.addRow([a.name, n(bal.get(a.id))]);
  head(s4);

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="financehub-${from}_${to}.xlsx"`,
    },
  });
});
