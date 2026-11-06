import { db, plain } from "@/lib/db";
import { TransfersView } from "./transfers-view";

export const metadata = { title: "Transferências" };

export default async function TransfersPage() {
  const [accounts, transfers] = await Promise.all([
    db.account.findMany({ where: { archived: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.transaction.findMany({
      where: { type: "TRANSFER" },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: { account: { select: { name: true } }, toAccount: { select: { name: true } }, user: { select: { name: true } } },
    }),
  ]);
  return <TransfersView accounts={accounts} transfers={plain(transfers)} />;
}
