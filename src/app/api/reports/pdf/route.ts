import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { z } from "zod";
import { route } from "@/lib/api";
import { getReport, defaultRange } from "@/lib/reports";
import { brl, fmtDate, TX_TYPE_LABEL } from "@/lib/utils";

export const dynamic = "force-dynamic";

const q = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export const GET = route(async (req) => {
  const def = defaultRange();
  const sp = req.nextUrl.searchParams;
  const { from, to } = q.parse({ from: sp.get("from") ?? def.from, to: sp.get("to") ?? def.to });
  const r = await getReport(from, to);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const indigo: [number, number, number] = [79, 70, 229];

  doc.setFontSize(20).setTextColor(...indigo).text("FinanceHub", 40, 50);
  doc.setFontSize(11).setTextColor(90).text(`Relatório financeiro: ${fmtDate(from)} a ${fmtDate(to)}`, 40, 70);

  autoTable(doc, {
    startY: 90,
    head: [["Receitas", "Despesas", "Resultado"]],
    body: [[brl(r.income), brl(r.expense), brl(r.balance)]],
    headStyles: { fillColor: indigo },
    styles: { halign: "center", fontSize: 12 },
  });

  autoTable(doc, {
    margin: { top: 40 },
    head: [["Categoria", "Tipo", "Total", "%"]],
    body: r.byCategory.map((c) => [c.name, TX_TYPE_LABEL[c.type], brl(c.total), `${c.pct.toFixed(1)}%`]),
    headStyles: { fillColor: indigo },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
    styles: { fontSize: 9 },
  });

  autoTable(doc, {
    head: [["Data", "Tipo", "Descrição", "Categoria", "Conta/Cartão", "Status", "Valor"]],
    body: r.rows.map((x) => [
      fmtDate(x.date),
      TX_TYPE_LABEL[x.type],
      x.description,
      x.category,
      x.account,
      x.status === "PAID" ? "Pago" : "Pendente",
      (x.type === "EXPENSE" ? "-" : "") + brl(x.amount),
    ]),
    headStyles: { fillColor: indigo },
    columnStyles: { 6: { halign: "right" } },
    styles: { fontSize: 8 },
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8).setTextColor(130).text(`Página ${i} de ${pages}`, 40, doc.internal.pageSize.getHeight() - 20);
  }

  return new Response(doc.output("arraybuffer"), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="financehub-${from}_${to}.pdf"`,
    },
  });
});
