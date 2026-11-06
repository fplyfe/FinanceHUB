import { db, plain } from "@/lib/db";
import { listInvestments } from "@/lib/investments";
import { InvestmentsView } from "./investments-view";

export const metadata = { title: "Investimentos" };

export default async function InvestmentsPage() {
  const [items, accounts] = await Promise.all([
    listInvestments(),
    db.account.findMany({ where: { archived: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return <InvestmentsView items={plain(items)} accounts={accounts} />;
}
