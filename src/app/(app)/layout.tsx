import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { generateRecurring } from "@/lib/finance";
import { Sidebar } from "@/components/app/sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Gera lançamentos de contas recorrentes que venceram (idempotente).
  try {
    await generateRecurring();
  } catch (e) {
    console.error("[recurring]", e);
  }

  return (
    <div className="min-h-screen">
      <Sidebar userName={session.name} />
      <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:ml-60 lg:p-8">{children}</main>
    </div>
  );
}
