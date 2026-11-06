import { redirect } from "next/navigation";
import { db, plain } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { SettingsView } from "./settings-view";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const categories = await db.category.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] });
  return <SettingsView categories={plain(categories)} me={{ name: session.name, email: session.email, role: session.role }} />;
}
