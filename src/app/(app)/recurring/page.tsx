import { db, plain } from "@/lib/db";
import { RecurringView } from "./recurring-view";

export const metadata = { title: "Contas recorrentes" };

export default async function RecurringPage() {
  const [items, accounts, cards, categories] = await Promise.all([
    db.recurring.findMany({
      orderBy: [{ active: "desc" }, { nextDate: "asc" }],
      include: { account: { select: { name: true } }, card: { select: { name: true } }, category: { select: { name: true } } },
    }),
    db.account.findMany({ where: { archived: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.creditCard.findMany({ where: { archived: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, type: true } }),
  ]);
  return <RecurringView items={plain(items)} accounts={accounts} cards={cards} categories={categories} />;
}
