import { db, plain } from "@/lib/db";
import { InstallmentsView } from "./installments-view";

export const metadata = { title: "Parcelamentos" };

export default async function InstallmentsPage() {
  const [plans, accounts, cards, categories] = await Promise.all([
    db.installmentPlan.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        card: { select: { name: true } },
        account: { select: { name: true } },
        category: { select: { name: true } },
        transactions: { select: { status: true, amount: true, date: true }, orderBy: { date: "asc" } },
      },
    }),
    db.account.findMany({ where: { archived: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.creditCard.findMany({ where: { archived: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.category.findMany({ where: { type: "EXPENSE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return <InstallmentsView plans={plain(plans)} accounts={accounts} cards={cards} categories={categories} />;
}
