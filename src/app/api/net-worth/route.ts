import { route } from "@/lib/api";
import { netWorth, netWorthHistory } from "@/lib/investments";

export const GET = route(async (req) => {
  const months = Math.min(36, Math.max(1, Number(req.nextUrl.searchParams.get("months") ?? 12) || 12));
  const [summary, history] = await Promise.all([netWorth(), netWorthHistory(months)]);
  return { ...summary, history };
});
