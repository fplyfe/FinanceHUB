import { db } from "@/lib/db";
import { currentMonth } from "@/lib/dates";
import { listTransactions } from "@/lib/queries";
import { plain } from "@/lib/db";
import { PageHeader } from "@/components/ui/misc";
import { MonthNav } from "@/components/app/month-nav";
import { TransactionsView } from "./transactions-view";

export const metadata = { title: "Lançamentos" };

type SP = Promise<Record<string, string | undefined>>;

export default async function TransactionsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : currentMonth();

  const [rows, accounts, cards, categories] = await Promise.all([
    listTransactions({ ...sp, month }),
    db.account.findMany({ where: { archived: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.creditCard.findMany({ where: { archived: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, type: true } }),
  ]);

  return (
    <>
      <PageHeader title="Lançamentos" description="Receitas, despesas e transferências">
        <MonthNav month={month} />
      </PageHeader>
      <TransactionsView
        rows={plain(rows)}
        accounts={accounts}
        cards={cards}
        categories={categories}
        filters={{ type: sp.type ?? "", status: sp.status ?? "", accountId: sp.accountId ?? "", categoryId: sp.categoryId ?? "", q: sp.q ?? "" }}
        month={month}
      />
    </>
  );
}
