import { db, plain } from "@/lib/db";
import { accountBalances } from "@/lib/finance";
import { AccountsView } from "./accounts-view";

export const metadata = { title: "Contas" };

export default async function AccountsPage() {
  const [accounts, bal] = await Promise.all([db.account.findMany({ where: { archived: false }, orderBy: { name: "asc" } }), accountBalances()]);
  return <AccountsView accounts={plain(accounts.map((a) => ({ ...a, balance: bal.get(a.id) ?? 0 })))} />;
}
