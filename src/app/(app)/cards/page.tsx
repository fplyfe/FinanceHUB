import { db, plain } from "@/lib/db";
import { cardUsage, getInvoices } from "@/lib/finance";
import { CardsView } from "./cards-view";

export const metadata = { title: "Cartões" };

export default async function CardsPage() {
  const [cards, usage, accounts] = await Promise.all([
    db.creditCard.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
    cardUsage(),
    db.account.findMany({ where: { archived: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const withInvoices = await Promise.all(
    cards.map(async (c) => ({ ...c, used: usage.get(c.id) ?? 0, invoices: await getInvoices(c) })),
  );
  return <CardsView cards={plain(withInvoices)} accounts={accounts} />;
}
