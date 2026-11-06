import { db, plain } from "@/lib/db";
import { GoalsView } from "./goals-view";

export const metadata = { title: "Metas" };

export default async function GoalsPage() {
  const goals = await db.goal.findMany({ orderBy: { createdAt: "desc" } });
  return <GoalsView goals={plain(goals)} />;
}
