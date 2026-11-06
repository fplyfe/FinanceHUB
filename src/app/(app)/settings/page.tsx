import { db, plain } from "@/lib/db";
import { SettingsView } from "./settings-view";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const [categories, users] = await Promise.all([
    db.category.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
  ]);
  return <SettingsView categories={plain(categories)} users={users} />;
}
